# Engineering Log

Append-only. Dated. Every entry: what happened → evidence → what we changed → the test
it became. If it broke once, it is a test case forever (`AGENTS.md`, invariant 7).

---

## 2026-09-01 — D1-1: payment-mechanism spike (PENDING — run `make spike-d1-1`)

**Question:** can an agent complete payment on Razorpay test-mode, end to end, without a
human sitting at a checkout page — and which mechanism do we ship?

Paths, in order of preference:

- **(A) Tokenized test-mode charge** — the true agent payment. Test mode supports simulated
  card tokenization; if a token + charge (or customer + token) can be created
  programmatically, the agent pays directly and this is the strongest technical fact in
  the repo.
- **(B) Hosted-checkout completion** — agent drives the Razorpay-hosted checkout with the
  standard test card (4111 1111 1111 1111) via a sandboxed browser context. Real order,
  real webhook, real capture event. Most defensible fallback: "the agent completes
  checkout like a buyer would, on real Rails."
- **(C) Labeled simulation** — order created via API, capture simulated by our own harness
  with an explicit `SIMULATED: true` audit field, never mixed silently with real captures.

**Design constraint (verified against docs):** test mode allows up to 30 Payment Links
per business (source: https://razorpay.com/docs/payments/payment-links/create/ — "In
test mode, you can create up to 30 Payment Links per business"). Scope to resolve in the
spike: total vs concurrent vs per-day. Volume runs (ablation batch, fuzz corpus) will use
the Orders API regardless — links are for the human-facing demo path only.

**Result:** _fill after spike — script writes `results/d1_1_spike.json` and prints a
suggested entry._
**Decision:** _A / B / C, with evidence._
**The test it became:** _link-cap guard + mechanism-labeled audit records._

---

*Entry template:*

```
## YYYY-MM-DD — <short name>
What happened:
Evidence: (file / command / HTTP receipt)
What we changed:
The test it became:
```
