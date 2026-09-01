<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/wordmark-dark.svg" />
    <img src="public/wordmark-light.svg" alt="Customs" width="300" />
  </picture>
</p>

<p align="center">
  <strong>Agents can finally pay. Safely.</strong><br/>
  The checkout AI buyers transact on — and the desk merchants trust.<br/>
  Signed mandates · trust tiers · a hash-chained ledger · a live channel P&amp;L.
</p>

<p align="center">
  <a href="https://github.com/srivtx/customs/actions/workflows/verify.yml"><img src="https://github.com/srivtx/customs/actions/workflows/verify.yml/badge.svg" alt="verify" /></a>
  <a href="https://customs.srivtx.xyz"><img src="https://img.shields.io/badge/live-customs.srivtx.xyz-00875a.svg" alt="live deployment" /></a>
  <img src="https://img.shields.io/badge/razorpay-real%20test%20rails-a2c0a9.svg" alt="Razorpay real test rails" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1b180f.svg" alt="license: MIT" /></a>
</p>

<p align="center">
  <a href="JUDGE.md"><img src="https://img.shields.io/badge/-JUDGE.md-1b180f.svg?label=read&logo=github" alt="read JUDGE.md" /></a>
  <a href="ARCHITECTURE.md"><img src="https://img.shields.io/badge/-ARCHITECTURE.md-1b180f.svg?label=read" alt="read ARCHITECTURE.md" /></a>
  <a href="PAPER.md"><img src="https://img.shields.io/badge/-PAPER.md-1b180f.svg?label=read" alt="read PAPER.md" /></a>
</p>

---

Built for the **Razorpay AI Buildathon 2026** · Track 1 (AI Growth & Agentic
Commerce) · **test mode only — no live keys, no real money.**

**The whole golden path, rendered live by the page itself** — intent,
search, tier refusal, attestation, mandate, approval, the ten-check gate,
capture, and the ledger line landing, with the live ledger ticking:

![Customs — the golden path, played live](docs/demo.gif)

## The problem, in one paragraph

Every checkout on the internet assumes a human is paying — PINs, OTPs, faces.
An AI buying agent has none of those. **Customs** is the checkpoint that lets
the agent through anyway, on paper terms: the agent never holds a payment
credential. It holds a **mandate** — an Ed25519-signed envelope over canonical
JSON that says how much, for which items, until when, at which trust tier —
and a deterministic gate re-verifies every bound in plain code at the moment
of payment. Ten checks. Reason codes. A hash-chained ledger that *is* the
database. A human desk over ₹10,000, at every tier.

## What's in the box

**One app, two counters, one gate.**

| Buyer side — the Agent Playground | Merchant side — the Control Room |
|---|---|
| Natural-language buying with tool transparency | Live channel P&amp;L (agent GMV − AI serving cost) |
| Mandate approval by the principal | ₹10k+ human-approval queue |
| Protocol switcher — naive / MCP-style / ACP-style | The order ledger — live, hash-chained |
| Red-team panel — fire the authored attack corpus | Span-by-span replay, ablation, blocks log |

Plus three reading surfaces: **Why it exists** (the problem and the mandate
principle, with the architecture drawn as the site's own cards), **the
Paper** (a working paper rendered as a clean document page — §5–§6 numbers
read live from the running ledger), and **the live demo** on the landing
page (the golden path plays itself in code — the GIF above is a recording of
that page, not a separate asset). One design system, two themes (dark
default, a pure-white light mode one click away in the footer), and one
type system: the house sans carries every human sentence, the mono carries
only what a machine would read.

## The gate in one look

```
tier caps        unverified ₹500 / attested ₹5,000 / mandated ₹50,000
human desk       every order ≥ ₹10,000 holds for a human, any tier
signature        Ed25519 over canonical JSON (sorted keys, no whitespace)
bind-time        price re-verification vs live catalog · item allowlist · qty
replay           payment confirmations deduped — REPLAY_DETECTED
audit            hash-chained JSONL · tamper control proves detection
refusals         twelve authored attacks, each with its reason code
```

## Quickstart

```bash
bun install       # or: npm install
bun run dev       # → http://localhost:3000 (seeds a deterministic 48h ledger on boot)

make triage       # 60-second self-guided judge tour
make verify       # the exact evidence checks CI runs (zero deps)
make test         # fuzz + ablation + audit + ledger-fork — exit codes propagate
```

No keys required: the rail is an honestly-labeled simulation until Razorpay
test keys are set in `.env` (see `.env.example`). Live keys are refused at
construction. The LLM brain is optional too — set any one of
`OPENAI_API_KEY` / `GROQ_API_KEY` / `GEMINI_API_KEY` / `XAI_API_KEY` (Groq and
Gemini have free tiers) plus `AGENT_BRAIN=llm`; without a key the
deterministic rules brain runs everything, replayable.

## Status (honest, by construction)

| | |
|---|---|
| attacks blocked / authored | 12/12 — `results/conformance_matrix.json` (`make fuzz`) |
| agent GMV (deterministic 48h ledger) | ₹60,530 · 13 captures — `make meter` |
| ₹ AI cost per captured payment | ₹0.03 — `make meter` |
| channel P&amp;L @ 1M payments/month | net ₹9,30,93,000 — `make project` |
| audit chain | 258 events · tamper control detected — `make audit` |
| D1-1 payment spike | executed 2026-09-01 — Orders API verified; demo rail = hosted checkout on real test rails (B), simulation stays the volume/no-keys fallback |
| Live deployment | **[customs.srivtx.xyz](https://customs.srivtx.xyz)** — real Razorpay test-mode rails; `/api/health` verifies the chain live |

Numbers enter this repo only through regeneration — never by hand
(`AGENTS.md`, invariant 1). The full shipped/simulated/not-yet ledger lives in
the **Why it exists** view and `PAPER.md` §7.

## Proof layer (60 seconds, runs itself)

- `JUDGE.md` — every claim mapped to a file and a regenerate command
- `PAPER.md` — the working paper (machine-legible twin of the in-app paper)
- `make triage` — self-guided judge tour: prints claims, runs checks, exits 0
- `make verify` — the exact checks CI runs on every push
- `ENGINEERING_LOG.md` — dated incidents; every incident becomes a test
- `ARCHITECTURE.md` — one diagram + the decisions that mattered
- `llms.txt` / `AGENTS.md` — the repo, machine-legible; the invariants
- `CLEANUP.md` / `DEPLOY.md` — the operator runbooks

## File map

<!-- FILEMAP:START -->
| Path | What it is |
|---|---|
| `JUDGE.md` | evidence index mapped to the judging criteria |
| `PAPER.md` | the working paper — protocol, economics, evaluation |
| `LICENSE` | MIT |
| `llms.txt` | machine index (what / where / verify) |
| `AGENTS.md` | how coding agents work here + the invariants |
| `docs/DESIGN_SYSTEM.md` | the design contract — tokens, type, motion, the bot's containment law |
| `ENGINEERING_LOG.md` | dated incidents, the honest failure story |
| `ARCHITECTURE.md` | the one diagram + decisions table |
| `VIDEO_TRANSCRIPT.md` | the 5:00 pitch script (recorded at submission) |
| `CLEANUP.md` | operator runbook: what to delete before pushing to GitHub |
| `DEPLOY.md` | operator runbook: run locally, keep it alive, deploy free, operate |
| `Makefile` | verify / triage / fuzz / ablation / meter / project / audit / test |
| `scripts/verify.mjs` | repo-evidence checks (CI entry, zero deps) |
| `scripts/triage.mjs` | 60-second self-guided judge tour |
| `scripts/fuzz.ts` | attack corpus harness → `results/conformance_matrix.json` |
| `scripts/ablation.ts` | protocol ablation harness → `results/ablation.json` |
| `scripts/meter.ts` | cost meter harness → `results/cost_meter.json` |
| `scripts/project.ts` | at-scale projection → `results/project.json` |
| `scripts/audit.ts` | hash-chain walk + tamper control → `results/audit_chain.json` |
| `scripts/ledger-fork.ts` | D5-1 regression: concurrent writers must converge, never fork |
| `scripts/spike-d1-1.mjs` | payment-mechanism spike (needs Razorpay test keys) |
| `results/` | all measured numbers — JSON only, regeneration-only |
| `src/lib/customs/gate/types.ts` | mandate schema + trust-tier policy (the contract) |
| `src/lib/customs/gate/canonical.ts` | canonical JSON + lenient chain stringify |
| `src/lib/customs/gate/mandate.ts` | Ed25519 issuance / signature verification |
| `src/lib/customs/gate/decide.ts` | the decision checklist — bind-time re-verification |
| `src/lib/customs/ledger/ledger.ts` | the JSONL ledger (audit trail IS the database) |
| `src/lib/customs/ledger/chain.ts` | hash chaining + verify + tamper control |
| `src/lib/customs/engine.ts` | one code path for chat, seed, ablation and fuzz |
| `src/lib/customs/agent/loop.ts` | the agent turn machine with tool transparency |
| `src/lib/customs/agent/nlu.ts` | deterministic rules brain |
| `src/lib/customs/agent/llm.ts` | optional LLM brain — measured, never trusted |
| `src/lib/customs/adapters/index.ts` | naive / MCP-style / ACP-style transports |
| `src/lib/customs/fuzz/corpus.ts` | the authored attack corpus |
| `src/lib/customs/meter.ts` | channel P&L + projection (assumptions declared) |
| `src/lib/customs/store/catalog.ts` | Fieldnote Supply — 21 products, integer paise |
| `src/lib/customs/runtime.ts` | wiring + deterministic 48h seed history |
| `src/app/page.tsx` | one route, five surfaces |
| `src/app/icon.svg` | the gate diamond — favicon (night tile) |
| `src/app/globals.css` | the design system — night + day ledger themes |
| `src/components/customs/` | the design system + all screens |
| `src/components/customs/shell.tsx` | the app shell — views, transitions, masthead |
| `src/components/customs/landing.tsx` | overview: hero + bot, the live demo, ladder, proof layer |
| `src/components/customs/demo-player.tsx` | the golden path, played live in code (what the README GIF records) |
| `src/components/customs/hero-bot.tsx` | the customs bot — one smooth volume, token-inked, reduced-motion aware |
| `src/components/customs/why.tsx` | why it exists + the architecture (drawn as cards) + scope ledger |
| `src/components/customs/paper.tsx` | the working paper view — a clean document page, numbers live |
| `src/components/customs/playground.tsx` | buyer side: chat, mandate approval, red team |
| `src/components/customs/control-room.tsx` | merchant side: P&L, approvals, the order ledger |
| `src/components/customs/bits.tsx` | design primitives: chips, buttons, the gate diamond |
| `src/components/customs/chat-events.tsx` | the transcript — tool calls, gate checklist, receipts |
| `src/components/customs/theme.tsx` | the desk lamp — footer dark/light toggle, persisted, no-flash |
| `src/components/customs/footer.tsx` | the footer — mark, quiet link columns, the theme toggle (x.ai pattern) |
| `src/app/api/` | route handlers: chat, state, decision, fuzz, webhook, health |
| `public/logo.svg` | the gate diamond (badge tile) |
| `public/wordmark-light.svg` | the wordmark, light surfaces (this README) |
| `public/wordmark-dark.svg` | the wordmark, dark surfaces (this README) |
| `public/og.png` | the social card |
| `docs/demo.gif` | the recorded golden path (this README) |
| `docs/FORM_ANSWERS.md` | the 12 submission-form answers, claim → evidence |
<!-- FILEMAP:END -->

*Built for the Razorpay AI Buildathon 2026. Test-mode only — no live keys, no
real money.*
