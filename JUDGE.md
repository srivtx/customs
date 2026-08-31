# JUDGE.md — read this first (~90 seconds)

> For reviewers. Everything below is either verifiable by running a command or
> explicitly marked as not-yet-done. No number in this repo is hand-written:
> measured values enter only via regeneration (`make meter`, `make fuzz`, …),
> and CI runs the same checks on every push. Live links: none ship until
> deployment answers 200 — CI enforces it.

## The one-sentence claim

Razorpay's homepage sells agents shopping in your app. Customs ships both sides
of that counter: the storefront AI buyers transact on, and the merchant desk
that lets a payments company trust them — every action bounded, metered,
replayable, and provable to a machine in 60 seconds.

## How to verify anything (60 seconds)

```bash
make triage     # self-guided tour: prints the claim table, runs the checks, exits 0
make verify     # the exact checks CI runs on every push (zero deps — node only)
make test       # fuzz + ablation + audit harnesses, exit codes propagate
```

The product itself: `make demo` (or `bun install && bun run dev`) — no keys
needed; captures are stamped SIMULATED until Razorpay test keys land in `.env`.

## Mapped to the judging criteria

### 1 — Problem selection & why-now
Claim: agentic checkout is arriving (the brief's own why-now: NPCI's UAP,
ACP/AP2/x402), and the merchant half of the counter — trust, cost
accountability — is unbuilt. The two-sided product is the differentiator:
buyer-side chat storefronts exist; nobody ships the merchant desk with a
pricing story attached.
Evidence: `ARCHITECTURE.md` (the one diagram + decisions) · the two surfaces in
one app: Playground (`src/components/customs/playground.tsx`) and Control Room
(`src/components/customs/control-room.tsx`).

### 2 — Judgment on where AI genuinely helps
Claim: mandate validation, bounds and price re-verification are deterministic
code — 0 tokens, 0 variance, and the ablation holds that line honest. The LLM
earns its fee on intent parsing only; the default brain is rules-only and
replayable bit-for-bit, and the LLM arm is *skipped, never simulated*, when no
key is present.
Evidence: `src/lib/customs/gate/decide.ts` (the checklist, plain code) ·
`results/ablation.json` → `make ablation` (8/8 verdicts on all three protocol
arms; LLM arm status recorded honestly).

### 3 — Ease of understanding
Claim: one command runs the product; one command tours the evidence; the
ledger is a file you can `head`.
Evidence: `make demo` · `make triage` · `data/state/ledger.jsonl` (hash-chained
JSONL — the audit trail IS the database).

### 4 — Failure handling & recovery
Claim: twelve authored attacks are refused (or held) with specific reason
codes; a tamper control proves the audit chain catches a single flipped byte;
real incidents are dated in the engineering log, and every incident becomes a
test.
Evidence: `results/conformance_matrix.json` → `make fuzz` (12/12) ·
`results/audit_chain.json` → `make audit` (257 events, tamper detected at the
mutated seq) · `ENGINEERING_LOG.md` (the check-ordering incident is the
worked example).

## The track bar, verbatim

> "Every money action explainable, bounded and gated. Show the audit trail and
> one failure handled gracefully."

Where: **explainable** — the gate's verdict is a checklist rendered in the UI,
not an oracle (`gate decision` cards, every check with pass/fail + detail);
**bounded** — trust tiers ₹500/₹5,000/₹50,000, mandate caps, item allowlists,
price re-verification at bind (`src/lib/customs/gate/`); **gated** — authored
attack corpus refused with reason codes, human desk over ₹10,000
(`src/lib/customs/fuzz/corpus.ts`); **audit trail** — hash-chained JSONL with a
tamper control (`src/lib/customs/ledger/`); **one failure handled gracefully** —
the ₹18,999 hold: refused silently? no — held at the desk, approved by a human,
captured, and the whole sequence is replayable.

## The numbers (never hand-written)

| Number | Value | File | Regenerate |
|---|---|---|---|
| attacks blocked / authored | 12/12 | `results/conformance_matrix.json` | `make fuzz` |
| agent GMV (deterministic 48h ledger) | ₹63,732 · 12 captures | `results/cost_meter.json` | `make meter` |
| ₹ AI cost per captured payment | ₹0.03 | `results/cost_meter.json` | `make meter` |
| p50 / p99 gate decision latency | sub-millisecond on the build machine (machine-dependent — never cited as a promise) | `results/cost_meter.json` | `make meter` |
| channel P&L @ 1M payments/month | net ₹1,06,19,000 (formula + labeled assumptions inside) | `results/project.json` | `make project` |
| audit chain | 257 events · tamper control detected | `results/audit_chain.json` | `make audit` |
| ablation (same batch, three protocols) | 8/8 verdicts · wire 443B / 4,150B / 9,862B | `results/ablation.json` | `make ablation` |

Deterministic values (fixed seed, fixed catalog, fixed clock) regenerate
identically on any machine. Latency is machine-dependent and is therefore
regenerated, never promised.

## The honest scope ledger

- Live deployment: PENDING — deployment is the operator's step after this
  build; `DEPLOY.md` is the runbook (free tier, no-spin-down plan included).
  CI enforces every link that appears, so no URL is shipped until it answers.
- D1-1 payment mechanism: `results/d1_1_spike.json` status `blocked-no-keys` —
  path C (labeled simulation) is the shipped default; the Orders + Checkout +
  signature + webhook code for test-mode rails is present and keyed off
  `RAZORPAY_KEY_ID/SECRET` in `.env`. Set test keys and run `make spike-d1-1`
  to execute paths A/B and flip the rail.
- x402 adapter: pre-declared **stretch goal**, not core scope. If cut, the cut
  is logged in `ENGINEERING_LOG.md` as scope discipline — the matrix's value
  is conformance, not protocol count.
- Closest prior art we found: EACP (https://github.com/HRaj07/eacp) — a gated
  agent-commerce stack whose own README states its agent's terminal capability
  is "generating a Razorpay Payment Link for a human to act on." Customs
  differs on the brief's own words: *transactable by an AI buyer end to end* —
  our payment completes inside signed mandate bounds.
- The ledger's demo history is a deterministic seed through the REAL engine
  (no hand-written events): every number above went through the same gate the
  live UI uses. Key material is test-only, generated at first boot, never
  committed.

## Why this builder

Prior art, admissible under "your code speaks louder than your resume":

- https://github.com/srivtx/lockr — escrow for Indian freelancers (fiat rails, mandate intuition)
- https://github.com/srivtx/sortie — execution debugger with trace UI: the replay panel's ancestor
- https://github.com/srivtx/nnn — local coding agents: the storefront agent runner's ancestor
- Merged PRs to Zed and GreptimeDB; PRs to viem and vocs.
