import { describe, expect, test } from "bun:test";
import { parseIntent } from "../src/lib/customs/agent/nlu";

// D5-2 regression: the attestation trigger must accept the whole word family.
// A real user (and a judge) typed "attested" — \battest\b has no boundary
// mid-word, so the rules brain fell through to "couldn't map that to the
// catalog" and the golden path died at the exact human moment.

describe("nlu: attest triggers (D5-2)", () => {
  test.each(["attest", "attested", "attestation", "get me attested", "verify me", "upgrade my tier"])(
    "maps %q to the attest intent",
    (phrase) => {
      expect(parseIntent(phrase)).toMatchObject({ kind: "attest" });
    }
  );

  test("does not map unrelated words that merely contain a fragment", () => {
    expect(parseIntent("latest headphones")).not.toMatchObject({ kind: "attest" });
    expect(parseIntent("fastest delivery")).not.toMatchObject({ kind: "attest" });
  });

  test.each(["checkout", "pay now", "complete the purchase"])(
    "checkout triggers intact: %q",
    (phrase) => {
      expect(parseIntent(phrase)).toMatchObject({ kind: "checkout" });
    }
  );
});
