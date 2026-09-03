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

The product itself is live: **https://customs.srivtx.xyz** (or `make demo`
locally — without keys captures are stamped SIMULATED; the live rail is real
test mode).

## Mapped to the judging criteria

### 1 — Problem selection & why-now
Claim: agentic checkout is arriving (the brief's own why-now: NPCI's UAP,
ACP/AP2/x402), and the merchant half of the counter — trust, cost
accountability — is unbuilt. The two-sided product is the differentiator:
buyer-side chat storefronts exist; nobody ships the merchant desk with a
pricing story attached.
Evidence: `ARCHITECTURE.md` (the one diagram + decisions) · the two surfaces in
one app: Playground (`src/components/customs/playground.tsx`) and Control Room
(`src/components/customs/control-room.tsx`) · the **Why it exists** view
(`src/components/customs/why.tsx`) states the problem and the unbuilt merchant
half in plain words, with the architecture diagram and the desk ledger.

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
ledger is a file you can `head` — and the whole technical story is pre-rendered
as three reading surfaces: **Why it exists** (problem, principle, diagram, desk
ledger), **the Agent kit** (the counter's HTTP contract, with a live
golden-path walkthrough in-page) and **the Paper** (working paper; §5–§6
numbers read live from the ledger).
Evidence: `make demo` · `make triage` · `data/state/ledger.jsonl` (hash-chained
JSONL — the audit trail IS the database) · `src/components/customs/why.tsx` ·
`src/components/customs/paper.tsx` + `PAPER.md` (twins, AGENTS invariant 11).

### 4 — Failure handling & recovery
Claim: twelve authored attacks are refused (or held) with specific reason
codes; a tamper control proves the audit chain catches a single flipped byte;
real incidents are dated in the engineering log, and every incident becomes a
test.
Evidence: `results/conformance_matrix.json` → `make fuzz` (12/12) ·
`results/audit_chain.json` → `make audit` (258 events, tamper detected at the
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
| agent GMV (deterministic 48h ledger) | ₹60,530 · 13 captures | `results/cost_meter.json` | `make meter` |
| ₹ AI cost per captured payment | ₹0.03 | `results/cost_meter.json` | `make meter` |
| p50 / p99 gate decision latency | sub-millisecond on the build machine (machine-dependent — never cited as a promise) | `results/cost_meter.json` | `make meter` |
| channel P&L @ 1M payments/month | net ₹9,30,93,000 (formula + labeled assumptions inside) | `results/project.json` | `make project` |
| audit chain | 258 events · tamper control detected | `results/audit_chain.json` | `make audit` |
| ablation (same batch, three protocols) | 8/8 verdicts · wire 443B / 4,150B / 9,862B | `results/ablation.json` | `make ablation` |

Deterministic values (fixed seed, fixed catalog, fixed clock) regenerate
identically on any machine. Latency is machine-dependent and is therefore
regenerated, never promised.

## The desk ledger

- Reading surfaces: the Why view (problem, architecture diagram, desk ledger),
  the Agent kit view (the HTTP contract + live walkthrough) and the Paper view
  + `PAPER.md` (protocol, economics, evaluation) ship in-app
  and in-repo; the paper's §5–§6 numbers are the live ledger's, never printed.
- Live deployment: **https://customs.srivtx.xyz** — `/api/health` answers
  `ok:true` with `rail: razorpay-test, simulated:false` (real test-mode rails),
  chain verified, deterministic seed, ephemeral state honestly labeled.
  CI keeps the URL in this file on every push.
- The agent kit: the counter's HTTP surface is published for outside agents —
  `AGENT_KIT.md` (the contract) · `GET /api/agent/kit` (machine twin,
  generated from the running constants) · `make kit` (the proof: a reference
  client with no in-repo state walks search → add → attest → checkout →
  approve over pure HTTP and asserts every verdict). The transports are REAL:
  **MCP server over Streamable HTTP at `/api/mcp`** (spec 2025-06-18 —
  initialize handshake, Mcp-Session-Id sessions, tools/list, tools/call; any
  MCP client can connect) and **ACP core REST at `/api/acp`** (request → ack →
  result → receipt signed with the mandate's Ed25519 key, verifiable offline
  against the public key in `GET /api/acp/agents`). Approval is enforced at
  the tool layer: `bind_and_pay` refuses with `MANDATE_NOT_APPROVED` until the
  principal approves — no transport can route around the human.
- D1-1 payment mechanism: **executed with test keys on 2026-09-01**
  (`results/d1_1_spike.json`) — Orders API verified live; server-side
  tokenization refused by test mode (path A impossible, receipt in the log);
  decision **B: hosted-checkout completion on real rails** (order → Checkout →
  documented test card → signature-verified, id-deduped webhook capture), with
  the labeled simulation rail as the no-keys/volume fallback. Playwright
  auto-completion of the hosted page is the declared stretch for the
  on-camera autonomous payment.
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
