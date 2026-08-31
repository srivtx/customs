# Customs — both sides of the agentic counter

Razorpay's homepage sells agents shopping in your app. We ship both sides of that counter:
the storefront AI buyers transact on, and the merchant desk that lets a payments company
trust them — every action bounded, metered, replayable, and provable to a machine in 60
seconds.

Built for the Razorpay AI Buildathon 2026 · Track 1 (AI Growth & Agentic Commerce).

## The two screens

1. **Storefront** — a buyer types intent ("running shoes under ₹3000") → an agent searches,
   builds a cart in-chat, requests a bounded mandate (₹ cap · items · expiry · trust tier)
   → human taps approve → the agent pays on Razorpay test-mode. External agents (HTTP /
   MCP / ACP-style) transact with the same store, same catalog, same payment path.
2. **Customs** (merchant desk) — traffic by protocol and trust tier, the **channel P&L
   meter** (agent GMV vs AI serving cost, live, with the at-1M-payments/month projection),
   refused attacks with one-line reasons, and a span-by-span replay of any transaction.

## Status — Day 1 of 4 (honest, by construction)

| | |
|---|---|
| Live deployment | PENDING — Railway, Day 1 EOD. CI enforces every shipped link answers 200 |
| ₹ AI cost per successful payment | PENDING — `make meter` (harness Day 3) |
| p99 decision latency | PENDING — `make meter` |
| attacks passed / total | PENDING — `make fuzz` |
| channel P&L @ 1M payments/month | PENDING — `make project` |

Numbers enter this repo only through regeneration — never by hand (`AGENTS.md`, invariant 1).

## Proof layer (60 seconds, runs itself)

- `JUDGE.md` — every claim mapped to a file and a regenerate command
- `make triage` — self-guided judge tour: prints claims, runs the checks, exits 0
- `make verify` — the exact checks CI runs on every push
- `ENGINEERING_LOG.md` — dated incidents; every incident becomes a test
- `ARCHITECTURE.md` — one diagram + the decisions that mattered

## Quickstart

```bash
make triage        # see the evidence layer working right now
make verify        # the checks CI runs
make demo          # the product demo (lands Day 1 EOD)
```

## File map

<!-- FILEMAP:START -->
| Path | What it is |
|---|---|
| `JUDGE.md` | evidence index mapped to the judging criteria |
| `llms.txt` | machine index (what / where / verify) |
| `AGENTS.md` | how coding agents work here + the 10 invariants |
| `ENGINEERING_LOG.md` | dated incidents, the honest failure story |
| `ARCHITECTURE.md` | the one diagram + decisions table |
| `VIDEO_TRANSCRIPT.md` | the 5:00 pitch script (recorded Day 4) |
| `Makefile` | verify / triage / demo / meter / ablation / fuzz / project / spike-d1-1 |
| `scripts/verify.mjs` | repo-evidence checks (CI entry, zero deps) |
| `scripts/triage.mjs` | 60-second self-guided judge tour |
| `scripts/spike-d1-1.mjs` | payment-mechanism spike (A/B/C + link-cap scope) |
| `results/` | all measured numbers — JSON only, regeneration-only |
| `server/src/mandate/types.ts` | mandate schema + trust-tier policy (the gate's contract) |
| `server/src/index.ts` | gate server entry (lands Day 1 night) |
| `apps/storefront/` | buyer screen (Next.js, Day 1 PM) |
| `apps/merchant/` | merchant desk (Next.js, Day 1 PM) |
<!-- FILEMAP:END -->

*Built for the Razorpay AI Buildathon 2026. Test-mode only — no live keys, no real money.*
