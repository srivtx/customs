# JUDGE.md — read this first (~90 seconds)

> For reviewers. Everything below is either verifiable by running a command or explicitly
> marked PENDING. No number in this repo is hand-written: measured values enter only via
> regeneration (`make meter`, `make fuzz`, …), and CI runs the same checks on every push.
> Live links: none are shipped until deployment answers 200 — CI enforces it.

## The one-sentence claim

Razorpay's homepage sells agents shopping in your app. Customs ships both sides of that
counter: the storefront AI buyers transact on, and the merchant desk that lets a payments
company trust them — every action bounded, metered, replayable, and provable to a machine
in 60 seconds.

## How to verify anything (60 seconds)

```bash
make triage     # self-guided tour: prints the claim table, runs the checks, exits 0
make verify     # the exact checks CI runs on every push
```

## Mapped to the judging criteria

### 1 — Problem selection & why-now
Claim: agentic checkout is arriving (the brief's own why-now: NPCI's UAP, ACP/AP2/x402),
and the merchant side of the counter — trust, cost accountability — is unbuilt.
Evidence: `ARCHITECTURE.md` (protocol matrix + gate design) · `server/src/mandate/types.ts`.

### 2 — Judgment on where AI genuinely helps
Claim: mandate validation, bounds and price re-verification are deterministic code —
0 tokens, 0 variance. The LLM earns its fee on intent parsing and cart assembly only, and
the ablation measures exactly where that is true and where a rule is free.
Evidence: `results/ablation.json` (PENDING until Day 3) → `make ablation`.

### 3 — Ease of understanding
Claim: one command runs the product; one command tours the evidence.
Evidence: `make demo` (lands Day 1 EOD) · `make triage` (works now).

### 4 — Failure handling & recovery
Claim: authored attacks are refused with reasons and audit entries; real incidents are
logged with dates, and every incident becomes a test.
Evidence: `results/conformance_matrix.json` (PENDING) → `make fuzz` · `ENGINEERING_LOG.md`.

## The track bar, verbatim

> "Every money action explainable, bounded and gated. Show the audit trail and one
> failure handled gracefully."

Where: signed bounded mandates (`server/src/mandate/`) · hash-chained audit · attack
refusals with reason codes · dated incidents in `ENGINEERING_LOG.md`.

## The numbers (never hand-written)

| Number | Value | File | Regenerate |
|---|---|---|---|
| ₹ AI cost per successful payment | PENDING | `results/cost_meter.json` | `make meter` |
| p99 decision latency | PENDING | `results/cost_meter.json` | `make meter` |
| attacks passed / total | PENDING | `results/conformance_matrix.json` | `make fuzz` |
| channel P&L @ 1M payments/month | PENDING | `results/project.json` | `make project` |

## Honest scope ledger

- Live deployment: PENDING (Railway, Day 1 EOD). CI enforces every link that appears.
- x402 adapter: pre-declared **stretch goal**, not core scope. If cut, the cut is logged
  in `ENGINEERING_LOG.md` as scope discipline — the matrix's value is conformance, not
  protocol count.
- Closest prior art we found: EACP (https://github.com/HRaj07/eacp) — a gated agent
  commerce stack whose own README states its agent's terminal capability is "generating a
  Razorpay Payment Link for a human to act on." Customs differs on the brief's own words:
  *transactable by an AI buyer end to end* — our payment completes inside signed mandate
  bounds.

## Why this builder

Prior art, admissible under "your code speaks louder than your resume":

- https://github.com/srivtx/lockr — escrow for Indian freelancers (fiat rails, mandate intuition)
- https://github.com/srivtx/sortie — execution debugger with trace UI: the replay panel's ancestor
- https://github.com/srivtx/nnn — local coding agents: the storefront agent runner's ancestor
- Merged PRs to Zed and GreptimeDB; PRs to viem and vocs.
