# Architecture

The brief asks for three artifacts: the repo, the video, and *the architecture*. This is
that artifact — one diagram, one table, the decisions that mattered.

## The one diagram

```
        BUYER SIDE                          MERCHANT SIDE
  ┌─────────────────────┐            ┌──────────────────────────┐
  │  apps/storefront    │            │  apps/merchant ("Customs")│
  │  chat intent → cart │            │  traffic · P&L meter     │
  │  mandate approval   │            │  blocks · replay UI      │
  └─────────┬───────────┘            └────────────▲─────────────┘
            │ intent (LLM, metered)                │ events / spans
            ▼                                      │
  ┌─────────────────────────────────────────────────┴──────┐
  │                    server/ — THE GATE                   │
  │  mandate contract (Ed25519, bounds, trust tiers)       │
  │  deterministic checks · bind-time price re-verification│
  │  hash-chained audit (SQLite, append-only)              │
  │  adapters: HTTP · MCP · ACP-style · (x402: stretch)    │
  │  OTel spans w/ token-cost attributes ──► collector     │
  └───────────────┬────────────────────────────────────────┘
                  │ orders / links / tokens (test-mode only)
                  ▼
           Razorpay Test Rails ──► webhooks ──► capture ──► settlement
```

## Component table

| Component | Responsibility | Evidence command |
|---|---|---|
| `server/src/mandate/` | the mandate contract: schema, trust tiers, signature | `make verify` (schema), tests (Day 1 night) |
| `server/src/adapters/` | protocol matrix: HTTP, MCP, ACP-style; x402 stretch | `make fuzz` (conformance matrix) |
| gate checks | bounds, expiry, price re-verify, tier caps — plain code | `make fuzz` |
| audit | hash-chained JSONL, SQLite, append-only | `make verify` |
| meter | token accounting per decision → `results/cost_meter.json` | `make meter` |
| ablation | rules-only vs LLM, same batch → `results/ablation.json` | `make ablation` |
| replay | OTel spans → scrubbable timeline (sortie lineage) | `make demo` |
| P&L projection | explicit formula + labeled assumptions → `results/project.json` | `make project` |

## Decisions

| # | Decision | Rationale | Status |
|---|---|---|---|
| 1 | Payment mechanism: (A) tokenized charge → (B) hosted-checkout completion → (C) labeled simulation | A is the true agent payment; B is real rails (deepanjan-pattern durability); C never silent | **pending D1-1 spike** |
| 2 | Ed25519 for mandate signatures | small keys, async verification, no shared secret between buyer↔merchant (HMAC implies a trust model we don't have) | locked |
| 3 | SQLite audit | single-writer, append-only, hash-chained; zero-ops for demo scale | locked (Postgres only if scale demands) |
| 4 | Integer paise end-to-end | floats never touch money | locked |
| 5 | Trust tiers: unverified ₹500/1 item/10 min · attested ₹5,000/3/30 min · mandated ₹50,000/10/24 h | UPI-Circle-style delegated caps; blocks get their most quotable refusal line | locked |
| 6 | Human approval threshold ₹10,000 | above it, mandate requires explicit human approval regardless of tier | locked |
| 7 | OTel spans carry token-cost attributes | the meter IS telemetry — no side ledger to drift | locked |
| 8 | x402 adapter | real `@x402/core` SDK; pre-declared stretch — cut reads as scope discipline | stretch |
