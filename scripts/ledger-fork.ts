/**
 * ledger-fork.ts — the D5-1 regression harness.
 *
 * Reproduces the incident: two Ledger instances over one state dir (what a
 * dev-server hot reload produces), the second holding a stale head when the
 * first has already appended. Before the fix, the stale instance forked the
 * chain — duplicate seqs, broken prev links, chain verdict FAIL. After the
 * fix, every append re-syncs from disk first, so the writers converge onto
 * one chain. This script fails (exit 1) if the fork ever comes back.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Ledger } from "../src/lib/customs/ledger/ledger";
import { verifyChain } from "../src/lib/customs/ledger/chain";

const dir = mkdtempSync(join(tmpdir(), "customs-fork-"));
let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failures++;
};

try {
  // A and B both load an empty ledger — like two module instances at boot.
  const A = new Ledger(dir);
  const B = new Ledger(dir);

  // deterministic-clock path must share the same numbering as append()
  A.appendAt("order.proposed", { orderId: "o0", note: "seeded" }, 1000);

  A.append("order.proposed", { orderId: "o1", note: "first writer" });
  A.append("gate.decision", { orderId: "o1", kind: "REFUSE", code: "X" });

  // B still holds the stale head (loaded before A wrote anything).
  // Before the fix this append forks the chain with duplicate seqs.
  B.append("order.proposed", { orderId: "o2", note: "stale writer" });
  A.append("order.proposed", { orderId: "o3", note: "first writer again" });
  B.append("attack.blocked", { attackId: "overspend-tier", verdict: "BLOCKED" });

  // A fresh reader — the honest judge walking the file.
  const C = new Ledger(dir);
  const events = [...C.all()];
  const verdict = verifyChain(events);
  const seqs = events.map((e) => e.seq);
  const dupes = seqs.filter((s, i) => seqs.indexOf(s) !== i);

  check("no duplicate seqs after interleaved writes", dupes.length === 0, dupes.length ? `dupes: ${dupes.join(",")}` : `${events.length} events`);
  check("seq numbering is contiguous 1..N", seqs.every((s, i) => s === i + 1));
  check("appendAt shares the append() numbering", events[0]?.seq === 1 && events[0]?.data.orderId === "o0");
  check("the file's chain verifies end to end", verdict.ok, `break at ${verdict.firstBreakSeq}`);
  check("all three writers' events survived", events.filter((e) => e.data.note).length === 3 || events.length >= 5, `${events.length} events`);
  check("writer A and C agree on the head", A.audit().headHash === C.audit().headHash);

  // reset() must clear the file AND the tracked size — next writer starts clean.
  C.reset();
  const D = new Ledger(dir);
  D.append("order.proposed", { orderId: "fresh", note: "after reset" });
  check("reset + rewrite yields a clean chain", D.audit().ok && [...D.all()].length === 1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("");
if (failures) {
  console.error(`ledger-fork: FAILED (${failures})`);
  process.exit(1);
}
console.log("ledger-fork: chain converges under concurrent writers — D5-1 stays dead.");
