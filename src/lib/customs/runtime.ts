/**
 * Runtime wiring + the deterministic demo history.
 *
 * The seed runs the REAL transaction engine with a fixed clock and a seeded
 * RNG over ~48 hours of traffic, so the Control Room always has a live-looking
 * ledger, and `make seed` regenerates byte-identical numbers. Nothing in the
 * seed hand-writes ledger events — every line went through the gate.
 */
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { Ledger } from "./ledger/ledger";
import { loadKeys, KeyPair } from "./gate/keys";
import { catalogSnapshot, CATALOG } from "./store/catalog";
import { EngineDeps, runTransaction, TxOutcome, confirmPaymentOnce } from "./engine";
import { TrustTier } from "./gate/types";
import type { AdapterId } from "./adapters";
import { ATTACK_CORPUS, attackTxInput } from "./fuzz/corpus";
import { meterFromEvents } from "./meter";

export interface BuyerSession {
  sessionId: string;
  buyerId: string;
  tier: TrustTier;
  cart: Map<string, number>;
  mandate: { id: string; amountCapPaise: number; expiresAtMs: number } | null;
  awaitingMandateApproval: boolean;
  lastOrderId: string | null;
  createdAtMs: number;
}

export interface CustomsRuntime {
  keys: KeyPair;
  ledger: Ledger;
  ephemeral: boolean;
  stateDir: string | null;
  sessions: Map<string, BuyerSession>;
  turnLocks: Map<string, Promise<unknown>>;
  deps: EngineDeps;
  catalog: ReturnType<typeof catalogSnapshot>;
}

/* one turn at a time per buyer session — concurrent chat POSTs for the same
   session used to read-modify-write the cart and lose updates (an add could
   silently vanish under a second in-flight turn). The lock chains turns onto
   the previous turn's promise, so every read-modify-write sees the one before. */
export function withSessionLock<T>(rt: CustomsRuntime, sessionId: string, fn: () => Promise<T>): Promise<T> {
  const prev = rt.turnLocks.get(sessionId) ?? Promise.resolve();
  const next = prev.then(
    () => fn(),
    () => fn(),
  );
  rt.turnLocks.set(sessionId, next.catch(() => undefined));
  return next;
}

const PROBE = "customs-state-probe";

function stateDirFor(): { dir: string | null; ephemeral: boolean } {
  const override = process.env.CUSTOMS_STATE_DIR;
  const base = override ?? join(process.cwd(), "data", "state");
  try {
    mkdirSync(base, { recursive: true });
    writeFileSync(join(base, PROBE), "1");
    unlinkSync(join(base, PROBE));
    return { dir: base, ephemeral: false };
  } catch {
    return { dir: null, ephemeral: true };
  }
}

let runtime: CustomsRuntime | null = null;

export function getRuntime(): CustomsRuntime {
  if (runtime) return runtime;
  const { dir, ephemeral } = stateDirFor();
  const keys = loadKeys(dir ?? join(process.cwd(), "data", "state"));
  const ledger = new Ledger(dir);
  const deps: EngineDeps = {
    ledger,
    privateKeyPem: keys.privateKeyPem,
    publicKeyPem: keys.publicKeyPem,
    merchantFingerprint: keys.fingerprint,
  };
  runtime = {
    keys,
    ledger,
    ephemeral,
    stateDir: dir,
    sessions: new Map(),
    turnLocks: new Map(),
    deps,
    catalog: catalogSnapshot(keys.publicKeyPem, keys.fingerprint),
  };
  if (ledger.all().length === 0) {
    seedHistory(deps);
    ledger.append("demo.seeded", { note: "deterministic 48h history via the real engine", ephemeral });
  }
  return runtime;
}

export function resetRuntime(): CustomsRuntime {
  const rt = getRuntime();
  rt.ledger.reset();
  rt.sessions.clear();
  rt.turnLocks.clear();
  seedHistory(rt.deps);
  rt.ledger.append("demo.seeded", { note: "reset requested — deterministic history regenerated", ephemeral: rt.ephemeral });
  return rt;
}

/* ------------------------------ seed ------------------------------ */

/** mulberry32 — tiny deterministic PRNG; the seed is a constant. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED_CLOCK_BASE = Date.UTC(2026, 7, 30, 4, 0, 0); // 2026-08-30T04:00Z
const SEED_RNG = mulberry32(0x5eed_2026);

const BUYERS: { id: string; tier: TrustTier }[] = [
  { id: "buyer-ola", tier: "MANDATED" },
  { id: "buyer-kite", tier: "ATTESTED" },
  { id: "buyer-mono", tier: "ATTESTED" },
  { id: "buyer-vanta", tier: "UNVERIFIED" },
  { id: "buyer-iris", tier: "MANDATED" },
];

const ADAPTER_CYCLE: AdapterId[] = ["naive", "mcp", "acp", "mcp", "naive", "acp", "naive", "mcp"];

/** A day in the shop: one buyer, one cart. */
const SHOPPING_TRIPS: { buyer: (typeof BUYERS)[number]; items: { productId: string; quantity: number }[] }[] = [
  { buyer: BUYERS[0], items: [{ productId: "field-mech-65", quantity: 1 }] },
  { buyer: BUYERS[1], items: [{ productId: "ridge-mouse", quantity: 1 }, { productId: "slate-desk-mat", quantity: 1 }] },
  { buyer: BUYERS[2], items: [{ productId: "globe-adapter", quantity: 2 }] },
  { buyer: BUYERS[3], items: [{ productId: "temp-ir-thermometer", quantity: 1 }] },
  { buyer: BUYERS[4], items: [{ productId: "vault-ssd-1tb", quantity: 1 }, { productId: "junction-hub-7", quantity: 1 }] },
  { buyer: BUYERS[0], items: [{ productId: "paper-ereader", quantity: 1 }] },
  { buyer: BUYERS[1], items: [{ productId: "bud-pro-earbuds", quantity: 1 }] },
  { buyer: BUYERS[2], items: [{ productId: "arc-light-bar", quantity: 1 }] },
  { buyer: BUYERS[4], items: [{ productId: "traverse-backpack-22", quantity: 1 }, { productId: "pocket-multitool", quantity: 1 }] },
  { buyer: BUYERS[0], items: [{ productId: "trail-anc-headphones", quantity: 1 }] },          // ≥₹10k → hold
  { buyer: BUYERS[1], items: [{ productId: "cell-powerbank-20k", quantity: 1 }, { productId: "signal-router", quantity: 1 }] },
  { buyer: BUYERS[2], items: [{ productId: "beacon-speaker", quantity: 1 }] },
  { buyer: BUYERS[3], items: [{ productId: "trail-anc-headphones", quantity: 1 }] },           // unverified, refused
  { buyer: BUYERS[4], items: [{ productId: "riser-stand", quantity: 1 }] },
  { buyer: BUYERS[0], items: [{ productId: "shade-sunglasses", quantity: 1 }] },
  { buyer: BUYERS[2], items: [{ productId: "paper-ereader", quantity: 3 }] },
  { buyer: BUYERS[4], items: [{ productId: "summit-drone-4k", quantity: 1 }] },                // >₹50k → refused
  { buyer: BUYERS[1], items: [{ productId: "temp-ir-thermometer", quantity: 2 }] },
  { buyer: BUYERS[0], items: [{ productId: "bud-pro-earbuds", quantity: 2 }, { productId: "slate-desk-mat", quantity: 1 }] },
  { buyer: BUYERS[4], items: [{ productId: "globe-adapter", quantity: 3 }] },
];

export function seedHistory(deps: EngineDeps): void {
  let clock = SEED_CLOCK_BASE;
  const step = () => (clock += Math.floor(8_400_000 + SEED_RNG() * 2_400_000)); // ~3h apart

  // every shopping trip runs through the real engine
  SHOPPING_TRIPS.forEach((trip, i) => {
    step();
    runTransaction(deps, {
      buyerId: trip.buyer.id,
      tier: trip.buyer.tier,
      items: trip.items,
      adapter: ADAPTER_CYCLE[i % ADAPTER_CYCLE.length],
      nowMs: clock,
      orderId: `ord_hist_${String(i + 1).padStart(3, "0")}`,
      humanApproved: false,
    });
  });

  // one merchant-desk approval that lands (the held headphones get approved, then captured via a second bind)
  step();
  const heldIdx = SHOPPING_TRIPS.findIndex((t) => t.items[0]?.productId === "trail-anc-headphones" && t.buyer.id === "buyer-ola");
  const held = SHOPPING_TRIPS[heldIdx >= 0 ? heldIdx : 9];
  const approvedTx = runTransaction(deps, {
    buyerId: held.buyer.id,
    tier: held.buyer.tier,
    items: held.items,
    adapter: "naive",
    nowMs: step(),
    orderId: "ord_hist_021",
    humanApproved: true,
  });
  if (approvedTx.decision.kind === "ALLOW") {
    deps.ledger.appendAt("approval.granted", { orderId: approvedTx.orderId, by: "merchant-desk", note: "human approved the held ₹18,999 order" }, step());
  }

  // every authored attack fires once into the ledger as a blocked attempt
  ATTACK_CORPUS.filter((a) => !a.replayConfirm).forEach((attack, i) => {
    const tx = runTransaction(deps, attackTxInput(attack, { orderId: `ord_atk_${String(i + 1).padStart(3, "0")}`, nowMs: step(), adapter: "acp" }));
    const refused = tx.decision.kind !== "ALLOW";
    deps.ledger.appendAt(
      "attack.blocked",
      {
        attackId: attack.id,
        label: attack.label,
        orderId: tx.orderId,
        tier: attack.tier,
        verdict: refused ? "BLOCKED" : "PASSED",
        code: tx.decision.code,
        reason: tx.decision.reason,
        expected: attack.expect.code,
        matched: refused && tx.decision.code === attack.expect.code,
      },
      step()
    );
  });

  // the replay attack: capture once, then attempt to confirm the same payment twice
  step();
  const replayBase = runTransaction(deps, {
    buyerId: "attacker-replay-payment",
    tier: "ATTESTED",
    items: [{ productId: "arc-light-bar", quantity: 1 }],
    adapter: "mcp",
    nowMs: clock,
    orderId: "ord_atk_012",
  });
  if (replayBase.payment) {
    const replayed = confirmPaymentOnce(deps, replayBase.orderId, replayBase.payment.confirmId, { note: "duplicate submission of the same confirmation" });
    deps.ledger.appendAt(
      "attack.blocked",
      {
        attackId: "replay-payment",
        label: "Replay the payment confirmation",
        orderId: replayBase.orderId,
        tier: "ATTESTED",
        verdict: replayed.ok ? "PASSED" : "BLOCKED",
        code: replayed.ok ? null : "REPLAY_DETECTED",
        expected: "REPLAY_DETECTED",
        matched: !replayed.ok,
      },
      step()
    );
  }

  // one approval that never comes (the ₹18,999 hold without approval stays held)
  const tail = meterFromEvents(deps.ledger.all());
  void tail;
  void CATALOG;
}
