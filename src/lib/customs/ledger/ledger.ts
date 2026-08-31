/**
 * The Ledger — one append-only JSONL file that IS the app's store.
 *
 * No ORM, no second source of truth: both screens and every proof artifact
 * (meter, ablation, audit) are projections of this single chain. Choosing
 * JSONL over SQLite is deliberate and logged in ENGINEERING_LOG: the
 * brief's bar is "show the audit trail" — here the audit trail *is* the
 * database, and `cat data/state/ledger.jsonl | head` is a legitimate
 * debugging command.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LedgerEvent, eventHash, GENESIS_HASH, verifyChain } from "./chain";

export interface TraceSpan {
  traceId: string;
  orderId?: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  ms: number;
  adapter?: string;
  /** OTLP-style attribute bag; carries token counts for the meter */
  attrs?: Record<string, number | string | boolean>;
}

export type OrderStatus =
  | "PROPOSED"
  | "AWAITING_APPROVAL"
  | "BOUND"
  | "CAPTURED"
  | "REFUSED"
  | "FAILED";

export interface OrderView {
  orderId: string;
  buyerId: string;
  tier: string;
  adapter: string;
  items: { productId: string; name: string; quantity: number; unitPricePaise: number }[];
  totalPaise: number;
  status: OrderStatus;
  code: string | null;
  rail: "razorpay-test" | "simulation" | null;
  simulated: boolean | null;
  traceId: string;
  createdAtMs: number;
}

export class Ledger {
  private events: LedgerEvent[] = [];
  private head = GENESIS_HASH;
  private seq = 0;
  readonly persistent: boolean;
  private readonly file: string | null;

  constructor(stateDir: string | null) {
    if (stateDir) {
      this.file = join(stateDir, "ledger.jsonl");
      try {
        mkdirSync(stateDir, { recursive: true });
        if (existsSync(this.file)) {
          const raw = readFileSync(this.file, "utf8").trim();
          if (raw) {
            for (const line of raw.split("\n")) {
              const e = JSON.parse(line) as LedgerEvent;
              this.events.push(e);
            }
            const last = this.events[this.events.length - 1];
            this.head = last.hash;
            this.seq = last.seq;
          }
        }
        // prove writability with an empty append
        appendFileSync(this.file, "");
        this.persistent = true;
      } catch {
        this.file = null;
        this.persistent = false;
      }
    } else {
      this.file = null;
      this.persistent = false;
    }
  }

  append(type: string, data: Record<string, unknown>): LedgerEvent {
    this.seq += 1;
    const event: Omit<LedgerEvent, "hash"> = {
      seq: this.seq,
      ts: Date.now(),
      type,
      data,
      prev: this.head,
    };
    const hash = eventHash(event);
    const full: LedgerEvent = { ...event, hash };
    this.events.push(full);
    this.head = hash;
    if (this.file) {
      try {
        appendFileSync(this.file, JSON.stringify(full) + "\n");
      } catch {
        /* ephemeral fallback already flagged */
      }
    }
    return full;
  }

  /** Deterministic-clock append for harnesses: same chain rules, fixed time. */
  appendAt(type: string, data: Record<string, unknown>, ts: number): LedgerEvent {
    this.seq += 1;
    const event: Omit<LedgerEvent, "hash"> = { seq: this.seq, ts, type, data, prev: this.head };
    const hash = eventHash(event);
    const full: LedgerEvent = { ...event, hash };
    this.events.push(full);
    this.head = hash;
    if (this.file) {
      try {
        appendFileSync(this.file, JSON.stringify(full) + "\n");
      } catch {
        /* ephemeral */
      }
    }
    return full;
  }

  all(): readonly LedgerEvent[] {
    return this.events;
  }

  since(seq: number): readonly LedgerEvent[] {
    return this.events.filter((e) => e.seq > seq);
  }

  reset(): void {
    this.events = [];
    this.head = GENESIS_HASH;
    this.seq = 0;
    if (this.file) {
      try {
        writeFileSync(this.file, "");
      } catch {
        /* ephemeral */
      }
    }
  }

  audit(): ReturnType<typeof verifyChain> {
    return verifyChain(this.events);
  }

  /** Order projection from the chain (single pass). */
  orders(): OrderView[] {
    const map = new Map<string, OrderView>();
    for (const e of this.events) {
      const d = e.data as Record<string, any>;
      switch (e.type) {
        case "order.proposed": {
          map.set(d.orderId, {
            orderId: d.orderId,
            buyerId: d.buyerId,
            tier: d.tier,
            adapter: d.adapter,
            items: d.items ?? [],
            totalPaise: d.totalPaise ?? 0,
            status: "PROPOSED",
            code: null,
            rail: null,
            simulated: null,
            traceId: d.traceId ?? "",
            createdAtMs: e.ts,
          });
          break;
        }
        case "gate.decision": {
          const o = map.get(d.orderId);
          if (o) {
            o.totalPaise = d.totalPaise ?? o.totalPaise;
            if (d.kind === "REFUSE") {
              o.status = "REFUSED";
              o.code = d.code ?? null;
            } else if (d.kind === "HOLD_FOR_APPROVAL") {
              o.status = "AWAITING_APPROVAL";
              o.code = d.code ?? null;
            }
          }
          break;
        }
        case "approval.granted": {
          const o = map.get(d.orderId);
          if (o && o.status === "AWAITING_APPROVAL") o.status = "PROPOSED";
          break;
        }
        case "approval.rejected": {
          const o = map.get(d.orderId);
          if (o) {
            o.status = "REFUSED";
            o.code = "OVER_HUMAN_THRESHOLD_UNAPPROVED";
          }
          break;
        }
        case "payment.captured": {
          const o = map.get(d.orderId);
          if (o) {
            o.status = "CAPTURED";
            o.rail = d.rail ?? "simulation";
            o.simulated = d.simulated ?? false;
          }
          break;
        }
        case "payment.failed": {
          const o = map.get(d.orderId);
          if (o) o.status = "FAILED";
          break;
        }
        default:
          break;
      }
    }
    return [...map.values()].sort((a, b) => b.createdAtMs - a.createdAtMs);
  }

  spansFor(traceId: string): TraceSpan[] {
    const out: TraceSpan[] = [];
    for (const e of this.events) {
      if (e.type !== "span") continue;
      const d = e.data as unknown as TraceSpan;
      if (d.traceId === traceId) out.push(d);
    }
    return out.sort((a, b) => (a.attrs?.startSeq as number ?? 0) - (b.attrs?.startSeq as number ?? 0));
  }
}
