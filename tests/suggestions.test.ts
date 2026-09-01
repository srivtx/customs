import { describe, expect, test } from "bun:test";
import { suggestionsFor } from "../src/lib/customs/agent/loop";

// The guided counter: one-tap next steps derived from session state, so a
// human never stalls after a refusal or an attestation (D5-2's lesson).
// Labels speak human; payloads stay parser-exact.

const line = (qty: number, unitPaise: number) => ({ quantity: qty, unitPricePaise: unitPaise });
const values = (s: { label: string; value: string }[]) => s.map((x) => x.value);

describe("suggestionsFor — the counter always offers the next step", () => {
  test("empty cart → keep browsing", () => {
    expect(suggestionsFor([], "UNVERIFIED", false)).toEqual([
      { label: "Keep browsing", value: "search audio" },
    ]);
  });

  test("fresh search result → add it, by name", () => {
    expect(
      suggestionsFor([], "UNVERIFIED", false, { id: "bud-pro-earbuds", name: "Bud Pro Earbuds" })
    ).toEqual([{ label: "Add Bud Pro Earbuds", value: "add bud-pro-earbuds" }]);
  });

  test("cart under tier cap → checkout", () => {
    expect(values(suggestionsFor([line(1, 40_000)], "UNVERIFIED", false))).toEqual(["checkout"]);
  });

  test("cart over tier cap → raise limit (the guided lift)", () => {
    expect(values(suggestionsFor([line(1, 499_900)], "UNVERIFIED", false))).toEqual(["attest"]);
    expect(values(suggestionsFor([line(2, 499_900)], "ATTESTED", false))).toEqual(["attest"]);
    expect(values(suggestionsFor([line(1, 499_900)], "ATTESTED", false))).toEqual(["checkout"]);
  });

  test("mandate awaiting approval → approve", () => {
    expect(values(suggestionsFor([line(1, 499_900)], "ATTESTED", true))).toEqual(["approve"]);
  });

  test("post-capture (cart cleared) → back to search", () => {
    expect(values(suggestionsFor([], "MANDATED", false))).toEqual(["search headphones under 5000"]);
  });
});
