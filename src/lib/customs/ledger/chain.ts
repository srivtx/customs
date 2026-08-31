/**
 * The audit chain — hash-chained, append-only.
 *
 * Every event the product emits lands here: mandates, decisions, binds,
 * captures, refusals, attacks, spans. Each entry's hash covers its
 * predecessor, so tampering with any historical byte breaks every later
 * link. `make audit` re-walks the whole chain and writes the verdict to
 * results/audit_chain.json; the Control Room runs the same walk live.
 */
import { createHash } from "node:crypto";
import { stableStringify } from "../gate/canonical";

export interface LedgerEvent<T = Record<string, unknown>> {
  seq: number;
  ts: number;
  type: string;
  data: T;
  prev: string;
  hash: string;
}

export const GENESIS_HASH = "0".repeat(64);

export function eventHash(event: Omit<LedgerEvent, "hash">): string {
  const material = stableStringify({
    seq: event.seq,
    ts: event.ts,
    type: event.type,
    data: event.data,
    prev: event.prev,
  });
  return createHash("sha256").update(material, "utf8").digest("hex");
}

export interface ChainVerdict {
  ok: boolean;
  length: number;
  firstBreakSeq: number | null;
  headHash: string;
}

export function verifyChain(events: LedgerEvent[]): ChainVerdict {
  let prev = GENESIS_HASH;
  let firstBreakSeq: number | null = null;
  for (const e of events) {
    if (e.prev !== prev || eventHash({ seq: e.seq, ts: e.ts, type: e.type, data: e.data, prev: e.prev }) !== e.hash) {
      if (firstBreakSeq === null) firstBreakSeq = e.seq;
      break;
    }
    prev = e.hash;
  }
  const head = events.length ? events[events.length - 1] : null;
  return {
    ok: firstBreakSeq === null,
    length: events.length,
    firstBreakSeq,
    headHash: head ? head.hash : GENESIS_HASH,
  };
}

/** Tamper helper for the attack corpus / UI "prove the chain catches edits" button. */
export function tamperEvent(event: LedgerEvent): LedgerEvent {
  const data =
    typeof event.data === "object" && event.data !== null
      ? { ...event.data, totalPaise: ((event.data as { totalPaise?: number }).totalPaise ?? 0) + 1 }
      : event.data;
  return { ...event, data } as LedgerEvent;
}
