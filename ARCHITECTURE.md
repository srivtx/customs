# Architecture

The brief asks for three artifacts: the repo, the video, and *the architecture*. This is
that artifact — one diagram, one table, the decisions that mattered, and the threat model
the corpus encodes.

## The one diagram

```
              BUYER SIDE                              MERCHANT SIDE
   ┌──────────────────────────┐            ┌───────────────────────────┐
   │  Agent Playground        │            │  Control Room             │
   │  chat → intent → cart    │            │  channel P&L meter        │
   │  mandate approval (human)│            │  approvals ≥ ₹10,000      │
   │  adapter switcher        │            │  order ledger · replay    │
   │  red-team panel          │            │  ablation · blocks log    │
   └────────────┬─────────────┘            └─────────────▲─────────────┘
                │ turns (events, steps, wire)            │ projections
                ▼                                        │
   ┌────────────────────────────────────────────────────┴──────────────┐
   │                    src/lib/customs/ — THE ENGINE                  │
   │  agent loop (rules brain · optional LLM, metered)                │
   │  adapters: naive · MCP-style · ACP-style (same tool impls)       │
   │  engine: ONE transaction path for chat/seed/ablation/fuzz        │
   │  GATE — decide.ts: signature · expiry · allowlist · price        │
   │          re-verify · tier caps · mandate cap · human threshold   │
   │          (deterministic code, never an LLM)                      │
   │  ledger — hash-chained JSONL: orders, decisions, spans, attacks  │
   │  meter — GMV, tokens, ₹ cost, channel P&L, at-1M projection      │
   └───────────────┬────────────────────────────────────────────────── ┘
                   │ orders (test-mode only · labeled simulation by default)
                   ▼
            Razorpay Test Rails ──► webhook (signature-verified, deduped) ──► capture
```

Both surfaces are one Next.js app (one route, view-switched). That is deliberate:
two deployables double the cold-start and failure surface; one app with two
surfaces halves both, and the ledger keeps them coherent.

## Component table

| Component | Responsibility | Evidence |
|---|---|---|
| `src/lib/customs/gate/types.ts` | the mandate contract: trust tiers, refusal codes, thresholds | `make verify` (contract shipped) |
| `src/lib/customs/gate/canonical.ts` | byte-stable canonical JSON for signing; lenient stringify for chaining | fuzz case `float-amount` |
| `src/lib/customs/gate/mandate.ts` | Ed25519 issuance + verification over canonical bodies | fuzz case `tampered-signature` |
| `src/lib/customs/gate/decide.ts` | the explainable checklist: 10 checks, first failure decides | `results/conformance_matrix.json` |
| `src/lib/customs/ledger/` | hash-chained JSONL, order projection, span storage | `make audit` (tamper control) |
| `src/lib/customs/engine.ts` | ONE transaction path used by chat, seed, ablation, fuzz | the conformance verdicts match live UI refusals |
| `src/lib/customs/agent/` | turn machine + deterministic rules brain + optional LLM | `results/ablation.json` |
| `src/lib/customs/adapters/` | naive / MCP-style / ACP-style over shared tool schemas | wire-bytes spread in ablation |
| `src/lib/customs/payments/` | rail abstraction: Razorpay test-mode or labeled simulation | `results/d1_1_spike.json` |
| `src/lib/customs/meter.ts` | channel P&L + projection, assumptions declared in-band | `results/project.json` |
| `src/lib/customs/fuzz/corpus.ts` | the authored attacks — the test suite of record | `make fuzz` (12/12) |
| `src/app/api/` | thin route handlers over the runtime | `make demo` |

## Decisions

| # | Decision | Rationale | Status |
|---|---|---|---|
| 1 | Payment mechanism: (A) tokenized charge → (B) hosted-checkout completion → (C) labeled simulation | A is the true agent payment; B is real rails; C never silent. B is live on test keys; C is the no-keys fallback; A/B/C keyed off env | **B live · C fallback** (`results/d1_1_spike.json`) |
| 2 | Ed25519 for mandate signatures | small keys, async verification, no shared secret between buyer↔merchant (HMAC implies a trust model we don't have) | locked |
| 3 | JSONL ledger instead of SQLite/ORM | the brief's bar is "show the audit trail" — here the audit trail IS the database; `head data/state/ledger.jsonl` is a debugging command; zero native deps; the chain gives tamper evidence an ORM doesn't. Writers re-read the file before every append/read — concurrent instances converge, never fork (incident D5-1, pinned by `make test`) | locked (logged D1-2, amended D5-1) |
| 4 | Integer paise end-to-end; canonical JSON refuses floats | floats never touch money; the refusal itself is a fuzz case | locked |
| 5 | Trust tiers: unverified ₹500/1 item/10 min · attested ₹5,000/3/30 min · mandated ₹50,000/10/24 h | UPI-Circle-style delegated caps; blocks get their most quotable refusal line | locked |
| 6 | Human approval threshold ₹10,000 | above it, money waits for a human regardless of tier — hold, not refuse | locked |
| 7 | Default brain is rules-only, deterministic | replayability and reproducible results are features; the LLM arm is skipped, never simulated, without a key; whichever brain parses intent, the gate stays plain code | locked (logged D1-3) |
| 8 | One app, two surfaces (not a monorepo of two apps) | halves deploy surface and cold starts; the ledger keeps both sides coherent | locked |
| 9 | Protocol adapters are in-process and protocol-SHAPED | honest labeling: JSON-RPC 2.0 envelopes and signed agent-message envelopes over identical tool impls; swapping in real MCP/ACP transports is an interface change, not a logic change | locked (logged D2-1) |
| 10 | Tier check before mandate-cap check | a signed cap can never be wider than the tier allows — the policy ceiling fires first, giving attacks their honest reason codes | locked (logged D3-1, the incident that became a rule) |
| 11 | x402 adapter | pre-declared stretch — cut reads as scope discipline | stretch |

## The P&L formula (transparent by construction)

```
revenue  = agent GMV × MDR%                     (MDR: 2.0%, Razorpay list price, assumed)
aiCost   = tokens × model list prices            (gpt-4o-mini-class, assumed)
net      = revenue − aiCost
@1M/mo   = measured avgTicket × 1M × MDR%  −  measured ₹/captured-payment × 1M
```

Every constant ships inside `results/project.json` under `assumptions` with its
citation. The deterministic seed ledger regenerates the measured inputs on any
machine; the projection is arithmetic on labeled assumptions, not a promise.

## The threat model (what the corpus encodes)

| Attack | Why it exists | Where it dies |
|---|---|---|
| Overspend the tier | agents inflate spend under weak identity | tier cap check |
| Overspend the mandate cap | legitimately-signed envelope, bigger order | mandate cap check |
| Expired mandate | old envelope replayed | expiry check |
| Tampered signature | body widened after signing | Ed25519 verify |
| Price drift at bind | catalog moves between proposal and bind | price re-verification |
| Item substitution | order swaps an item the mandate never covered | allowlist |
| Quantity overrun | order exceeds mandated quantity | allowlist qty |
| Currency swap | non-INR mandate | currency check |
| Float in paise | 500.5 — floats in money fields | canonical refusal |
| Break ₹50,000 | single-txn ceiling escape | tier cap check |
| Replay the payment | confirmation resubmitted | confirm-id dedupe |
| Sneak past ₹10,000 | un-approved high-ticket order | human threshold (hold) |

Each is a case in `src/lib/customs/fuzz/corpus.ts` with its expected verdict —
the corpus is the regression suite; `make fuzz` is the CI gate.
