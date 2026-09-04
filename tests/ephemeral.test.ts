import { describe, expect, test } from "bun:test";
import { getRuntime } from "../src/lib/customs/runtime";
import { agentTurn, newSession } from "../src/lib/customs/agent/loop";

// The restart incident (2026-09-04, live): the deployment is ephemeral
// multi-instance — a turn landing on a fresh instance found no session,
// minted an empty one under the same id, and the human's cart vanished
// between "add" and "attest" (the ghost cart, prod edition). The desk now
// flags recreation honestly and the client rebuilds. These tests pin the
// runtime guarantees the rebuild relies on.

describe("ephemeral restarts", () => {
  test("bootId is stable per runtime instance", () => {
    const rt = getRuntime();
    expect(rt.bootId.length).toBe(8);
    expect(getRuntime().bootId).toBe(rt.bootId);
  });

  test("a turn after the session map lost the buyer still succeeds (get-or-create)", async () => {
    const rt = getRuntime();
    const s = newSession(rt, "ATTESTED");
    rt.sessions.delete(s.sessionId); // the restart: instance lost the session
    const r = await agentTurn(rt, s.sessionId, "add bud pro earbuds", "naive");
    expect(r.events.length).toBeGreaterThan(0);
    const revived = rt.sessions.get(s.sessionId);
    expect(revived).toBeTruthy();
    expect(revived!.cart.size).toBe(1);
    expect(revived!.tier).toBe("UNVERIFIED"); // a fresh session is a walk-in — the client rebuilds the tier too
  });
});
