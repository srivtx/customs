import { describe, expect, test } from "bun:test";
import { suggestionsFor } from "../src/lib/customs/agent/loop";

// The guided counter: one-tap next steps derived from session state, so a
// human never stalls after a refusal or an attestation (D5-2's lesson).

const line = (qty: number, unitPaise: number) => ({ quantity: qty, unitPricePaise: unitPaise });

describe("suggestionsFor — the counter always offers the next step", () => {
  test("empty cart → search", () => {
    expect(suggestionsFor([], "UNVERIFIED", false)).toEqual(["search headphones under 5000"]);
  });

  test("cart under tier cap → checkout", () => {
    expect(suggestionsFor([line(1, 40_000)], "UNVERIFIED", false)).toEqual(["checkout"]);
  });

  test("cart over tier cap → attest (the guided lift)", () => {
    expect(suggestionsFor([line(1, 499_900)], "UNVERIFIED", false)).toEqual(["attest"]);
    expect(suggestionsFor([line(2, 499_900)], "ATTESTED", false)).toEqual(["attest"]);
    expect(suggestionsFor([line(1, 499_900)], "ATTESTED", false)).toEqual(["checkout"]);
  });

  test("mandate awaiting approval → approve", () => {
    expect(suggestionsFor([line(1, 499_900)], "ATTESTED", true)).toEqual(["approve"]);
  });

  test("post-capture (cart cleared) → back to search", () => {
    expect(suggestionsFor([], "MANDATED", false)).toEqual(["search headphones under 5000"]);
  });
});
