# AGENTS.md — how to work in this repo

Working guide for coding agents (and humans). This repo is built agent-first and judged
agent-first: the evidence layer is a product surface, not documentation garnish.

## Stack (locked)

TypeScript monorepo · Next.js (App Router) for both screens · Node gate server ·
SQLite (append-only, hash-chained audit) · OpenTelemetry JS SDK · Playwright (payment
completion + E2E) · Railway deploy. One language, no exceptions.

## Commands

```bash
make verify          # evidence checks (CI entry) — must stay green on every push
make triage          # 60-second self-guided judge tour
make spike-d1-1      # payment-mechanism spike (needs RAZORPAY test keys)
make demo            # one-command product demo (lands Day 1 EOD)
make meter           # regenerate results/cost_meter.json (harness lands Day 3)
make ablation        # rules-only vs LLM on the same batch (Day 3)
make fuzz            # conformance matrix (Day 3)
make project         # channel P&L projection w/ explicit assumptions (Day 3)
```

## Invariants (violating any of these is a build failure of trust)

1. **Numbers enter `results/` only through regeneration scripts.** Never hand-edit a
   measured value. If a number is not measured yet, its status is `pending`.
2. **Zero competitor-specific numbers** in README / JUDGE.md / form answers / video.
   Not even flattering ones. Cite prior art qualitatively.
3. **No URL ships unless live.** CI checks every external link; a placeholder link is a
   build failure, not a README blemish.
4. **Money is integer paise.** Floats never touch financial arithmetic.
5. **Gate logic is deterministic code, never an LLM.** LLM earns its fee on intent
   parsing / cart assembly only — and the ablation must prove where.
6. **Mandates**: canonical JSON (sorted keys, no whitespace), Ed25519 signature,
   bounds re-verified server-side at bind time.
7. **Every incident → an ENGINEERING_LOG.md entry → a test.** If it broke once, it is
   a test case forever.
8. **Live keys refused at construction.** Test keys (`rzp_test_`) only.
9. **The README file map must match the actual tree** — `make verify` checks it.
10. **Anything PENDING says PENDING.** Never estimate, never round, never ship a vibe.

## How to add things

- **A protocol adapter**: `server/src/adapters/<name>/` — implements the mandate request
  contract, adds its fuzz cases to the conformance corpus, updates the matrix.
- **A fuzz case**: one file in `fuzz/cases/`, deterministic input, expected verdict
  (refuse + reason code), wired into `make fuzz`.
- **A measured number**: write the harness in `scripts/`, make it emit
  `results/<name>.json`, then reference the file from JUDGE.md with the regenerate
  command. The number does not exist until the script produces it.
