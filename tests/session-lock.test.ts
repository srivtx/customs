import { describe, expect, test } from "bun:test";
import { getRuntime, withSessionLock } from "../src/lib/customs/runtime";
import { agentTurn, newSession } from "../src/lib/customs/agent/loop";

// D8 regression: concurrent chat POSTs for one buyer session used to
// read-modify-write the cart and lose updates — an "add" could silently
// vanish under a second in-flight turn (double-Enter beat the client's
// busy flag). Every turn now chains onto a per-session lock, so parallel
// adds must ALL land, and different sessions must never block each other.

describe("session turn lock", () => {
  test("12 parallel adds to one session all land (no lost update)", async () => {
    const rt = getRuntime();
    const s = newSession(rt, "MANDATED");
    const turns = Array.from({ length: 12 }, () =>
      withSessionLock(rt, s.sessionId, () => agentTurn(rt, s.sessionId, "add trail anc headphones", "naive")),
    );
    await Promise.all(turns);
    expect(s.cart.size).toBe(1);
    const qty = [...s.cart.values()][0];
    expect(qty).toBe(12);
  });

  test("turns on the same session run sequentially, in order", async () => {
    const rt = getRuntime();
    const s = newSession(rt, "MANDATED");
    const seen: string[] = [];
    await Promise.all([
      withSessionLock(rt, s.sessionId, async () => {
        await new Promise((r) => setTimeout(r, 30));
        seen.push("first");
      }),
      withSessionLock(rt, s.sessionId, async () => {
        seen.push("second");
      }),
    ]);
    expect(seen).toEqual(["first", "second"]);
  });

  test("different sessions never block each other", async () => {
    const rt = getRuntime();
    const a = newSession(rt, "UNVERIFIED");
    const b = newSession(rt, "UNVERIFIED");
    const t0 = Date.now();
    await Promise.all([
      withSessionLock(rt, a.sessionId, () => new Promise((r) => setTimeout(r, 150))),
      withSessionLock(rt, b.sessionId, () => new Promise((r) => setTimeout(r, 150))),
    ]);
    expect(Date.now() - t0).toBeLessThan(290);
  });
});
