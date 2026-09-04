import { describe, expect, test } from "bun:test";
import { getRuntime } from "../src/lib/customs/runtime";
import { agentTurn, newSession } from "../src/lib/customs/agent/loop";

// The ghost-cart incident (2026-09-04): mid-sentence command words won the
// parse and the rest of the human's sentence was silently dropped —
// "attest the pro earbuds" attested and threw the earbuds away, so the
// next "checkout" hit an empty cart. Commands now keep their remainder and
// the desk chains it. Same class: "checkout X" with an empty cart, and
// "add x and checkout" in one breath.

describe("compound intents — the tail is never dropped", () => {
  test("attest the pro earbuds: attests AND adds in one turn", async () => {
    const rt = getRuntime();
    const s = newSession(rt, "UNVERIFIED");
    await agentTurn(rt, s.sessionId, "attest the pro earbuds", "naive");
    expect(s.tier).toBe("ATTESTED");
    expect(s.cart.get("bud-pro-earbuds")).toBe(1);
  });

  test("checkout <product> on an empty cart adds it first", async () => {
    const rt = getRuntime();
    const s = newSession(rt, "ATTESTED");
    const r = await agentTurn(rt, s.sessionId, "checkout bud pro earbuds", "naive");
    expect(s.cart.get("bud-pro-earbuds")).toBe(1);
    expect(s.awaitingMandateApproval).toBe(true);
    expect(r.suggestions.some((x) => x.value === "approve")).toBe(true);
  });

  test("add x and checkout: one turn, cart full, mandate requested", async () => {
    const rt = getRuntime();
    const s = newSession(rt, "ATTESTED");
    await agentTurn(rt, s.sessionId, "add bud pro earbuds and checkout", "naive");
    expect(s.cart.get("bud-pro-earbuds")).toBe(1);
    expect(s.awaitingMandateApproval).toBe(true);
  });

  test("bare attest still just attests", async () => {
    const rt = getRuntime();
    const s = newSession(rt, "UNVERIFIED");
    await agentTurn(rt, s.sessionId, "attest", "naive");
    expect(s.tier).toBe("ATTESTED");
    expect(s.cart.size).toBe(0);
  });
});
