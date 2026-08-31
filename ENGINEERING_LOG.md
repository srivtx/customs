# Engineering Log

Append-only. Dated. Every entry: what happened → evidence → what we changed → the test
it became. If it broke once, it is a test case forever (`AGENTS.md`, invariant 7).

---

## 2026-09-01 — D1-1: payment-mechanism spike

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
spike: total vs concurrent vs per-day. Volume runs (ablation batch, fuzz corpus) use the
simulation rail regardless — links are for the human-facing demo path only.

**Result:** `results/d1_1_spike.json` → status `blocked-no-keys`. No test keys were
available at build time, so the spike could not execute paths A/B. What shipped instead:
path C as the honest default (every capture stamped `SIMULATED: true`, in the UI, the
ledger, and the meter), plus the complete A/B code path — Orders API creation,
Checkout.js completion, server-side HMAC signature verification, signature-verified and
id-deduped webhooks — keyed off `RAZORPAY_KEY_ID/SECRET` in `.env`.
**Decision:** C ships by default; set test keys and run `make spike-d1-1` to execute A/B
and flip the rail; the log entry updates itself from the results file.
**The test it became:** live-key refusal at construction (invariant 8) + the
rail-label discipline in every capture event.

---

## 2026-09-01 — D1-2: the ledger is a JSONL file, not a database

**What happened:** the original plan said SQLite. While wiring the audit chain it became
clear the ORM would be a second source of truth beside the hash chain, and serverless
deploys would fight the native module.
**Evidence:** the brief's bar is "show the audit trail"; the audit trail being the
database makes `head data/state/ledger.jsonl` a legitimate debugging command, and the
chain's tamper control (`make audit`) covers the whole store.
**What we changed:** `src/lib/customs/ledger/` — one append-only JSONL, order/span
projections derived in a single pass; zero native deps.
**The test it became:** `make audit` walks all 257 events and a negative control mutates
one byte at seq 129 — the chain must break exactly there.

---

## 2026-09-01 — D1-3: the default brain is rules, not a model

**What happened:** the demo agent needed an intent parser. An LLM-only brain would make
every number in results/ irreproducible and every demo non-replayable.
**Evidence:** `results/ablation.json`'s LLM arm is `skipped-no-key` — skipped, never
simulated, when no key is present.
**What we changed:** `src/lib/customs/agent/nlu.ts` (deterministic parser) as the
default; `llm.ts` optional behind `AGENT_BRAIN=llm` + key; whichever brain parses intent,
the gate stays plain code.
**The test it became:** invariant 5 + the ablation's honesty note.

---

## 2026-09-01 — D2-1: protocol adapters are shaped, not claimed

**What happened:** "MCP adapter" and "ACP adapter" are easy to overclaim. Ours are
in-process transports: JSON-RPC 2.0 tool envelopes (MCP-shaped) and signed
agent-to-agent message envelopes with ack + receipt (ACP-shaped), over identical tool
implementations.
**Evidence:** the wire logs in the Playground step chips show the exact envelopes;
the ablation measures their byte overhead (443B / 4,150B / 9,862B for the same batch).
**What we changed:** the honesty note lives in code (`src/lib/customs/adapters/index.ts`)
and in ARCHITECTURE.md decision 9 — the repo never claims spec conformance it didn't test.
**The test it became:** the ablation verdict parity — all three transports must produce
identical gate verdicts (8/8 each), or the abstraction leaked.

---

## 2026-09-01 — D2-2: corpus design — forged vs legitimately-issued

**What happened:** the first corpus draft made every attack a post-signature forgery.
Three cases (overspend-cap, item-substitution, quantity-overrun) died at
`SIGNATURE_INVALID` before the intended bound could fire — the attack tested the wrong
thing.
**Evidence:** first fuzz run 7/12 with mismatched codes; the corpus now distinguishes
legitimately-issued tight mandates (signature stays valid, the *bound* fires) from true
tampering.
**What we changed:** `issueCapPaise` / `mandateItems` in `attackTxInput`; the design rule
is documented in AGENTS.md.
**The test it became:** `make fuzz` = 12/12 with the *expected* reason codes, not just
any refusal.

---

## 2026-09-01 — D3-1: check order — tier before cap (incident)

**What happened:** running the corpus showed `overspend-tier` and `over-50k` refusing
with `AMOUNT_OVER_CAP` instead of `AMOUNT_OVER_TIER`. Root cause: `buildMandateBody`
clamps the issued cap to the tier ceiling, so the cap check was unreachable-by-shadowing
— the mandate fired before the policy could.
**Evidence:** fuzz mismatches (5/12 at first); the semantics mattered because the tier
refusal is the quotable line ("the tier caps it at ₹500"), and a signed cap must never
appear to be the policy ceiling.
**What we changed:** `decide.ts` now checks trust-tier bounds *before* the mandate cap —
ARCHITECTURE.md decision 10.
**The test it became:** fuzz cases `overspend-tier` and `over-50k` pin the order; any
reordering breaks CI with the wrong reason code.

---

## 2026-09-01 — D3-2: two stringifiers (the float that had to be evidence)

**What happened:** the `float-amount` attack forged `amountCapPaise: 500.5`. Canonical
JSON rightly refused it — but the *ledger* then crashed trying to hash an event whose
span attribute carried that float. The audit trail could not record the attack that
proved floats are refused.
**Evidence:** `CanonicalError: non-integer number` crashing `make fuzz` mid-corpus.
**What we changed:** two functions in `canonical.ts` — strict `canonicalJson` (signatures:
floats refused) and lenient `stableStringify` (chain hashing: any JSON value, because
malformed inputs are *evidence*, not arithmetic).
**The test it became:** the `float-amount` corpus case now passes *through* the ledger:
refused at the gate, recorded in the chain.

---

## 2026-09-01 — D4-1: manifest pruning

**What happened:** the scaffold carried 60+ dependencies the app never imported
(prisma, next-auth, recharts, dnd-kit, MDX editor, …). A judge reading package.json
reads intent; dead weight reads as generated.
**Evidence:** `make verify` now asserts the manifest stays pruned (checks 8).
**What we changed:** 34 packages removed, 16 unused UI components deleted; lint, build
and the full browser walkthrough re-verified after pruning.
**The test it became:** verify check 8 — the pruned deps may not silently return.

---

*Entry template:*

```
## YYYY-MM-DD — <short name>
What happened:
Evidence: (file / command / HTTP receipt)
What we changed:
The test it became:
```
## 2026-09-01 — D5-1: the ledger forked itself (incident)

**What happened:** the live demo ledger's chain verdict flipped to FAIL mid-session.
`verifyChain` reported a break at seq 284; the file held duplicate seqs 284–295. Root
cause: a dev-server hot reload re-instantiated the runtime module while the old
instance's state lived on — the new instance appended from a stale in-memory head/seq,
forking the chain onto the same file. The file is the database, but the app was
trusting its memory over the file.
**Evidence:** `data/state/ledger.jsonl` with `284..295` twice; `prev` mismatch at line
296; every individual event's own hash still valid — a *fork*, not a tamper.
**What we changed:** `Ledger` now tracks the byte size it last saw and re-reads the
whole file before every append and every read (`all`, `since`, `audit`) whenever
another writer touched it. Concurrent instances converge onto the file's chain; the
audit verdict is computed over the file, never over memory. The corrupted demo state
was reset and reseeded through the normal `/api/reset` path.
**The test it became:** `scripts/ledger-fork.ts` (wired into `make test`): two Ledger
instances over one state dir, interleaved writes from a stale head — asserts no
duplicate seqs, contiguous numbering, chain verifies, heads agree after reset.
**Why it matters for the pitch:** "the audit trail IS the database" is only credible
if the database can survive its own writers being restarted underneath it. D5-1 is
the second incident (after D3-2) where the honesty layer caught a real defect — both
are in the video's failure beat, both became regression harnesses.

---

## 2026-09-01 — D6-1: the design round — the gate diamond, two reading surfaces, the ledger as a terminal

**What happened:** the product worked but read as "engineered, then styled." Three
concrete complaints from the operator: (1) no logo — the masthead carried a stamped
"C"; (2) the order ledger scrolled on default browser gutters and overflowed its
container, which reads as generated rather than designed; (3) no page explained why
this exists, and the deep story (protocol, economics, evaluation) lived only in repo
files a judge might never open.
**Evidence:** v1.1 masthead (`shell.tsx` `stamp` "C"), `chat-scroll` at 8px default
thumb with no Firefox story, no `why`/`paper` views in the nav.
**What we changed:**
- **The gate diamond** — one mark, drawn once, used everywhere: a solid diamond
  (value) with a negative-space pill slot (authorization) cut through it. Favicon
  (`src/app/icon.svg`), masthead + footer (`LogoMark`, currentColor, inline SVG),
  README lockup (`public/logo-lockup.svg`), badge (`public/logo.svg`). Fraunces
  wordmark, Georgia fallback so the GitHub-rendered image still reads correctly.
- **The ledger as a terminal** — one designed scrollbar system (7px inset pill
  thumb, transparent track, hover-darkens, Firefox `scrollbar-width/color`,
  `overscroll-contain`), status filter tabs with live counts, a time column,
  `table-fixed` colgroup, sticky blurred thead, right-aligned tabular totals, a
  summary rule footer (rows · captured/refused · Σ shown · chain · events), rows
  keyboard-focusable, new rows rise then flash and *drain* (2.4s) instead of
  blinking.
- **Two reading surfaces** — "Why it exists" (`why.tsx`): the problem in plain
  words, the mandate principle, a hand-drawn SVG architecture diagram (no
  screenshot slop), and the honest scope ledger in three stamps: SHIPPED /
  SIMULATED / NOT YET. "The Paper" (`paper.tsx` + `PAPER.md` as its
  machine-legible twin): abstract, §1–§7, tables for tiers and the ten checks,
  §5–§6 numbers read live from `/api/state` at page load.
- **The settle** — view transitions (instant swap + 260ms settle, sections stagger
  via Reveal; reduced-motion inert), button press physics (140ms, hover lift,
  active pressed into the paper, approve/danger variants, arrow slide), the
  recorded demo GIF embedded on the landing page ("watch it clear"), simplified
  hero copy ("AI agents can finally pay. Safely."), README rebuilt around the
  centered lockup + badge row.
**The test it became:** `make verify` (REQUIRED list grew: why.tsx, paper.tsx,
PAPER.md, LICENSE, logo assets, public/demo.gif; filemap follows; shields.io
badge URLs explicitly allowlisted as static and non-tracking). AGENTS invariant 11:
PAPER.md and the paper view are twins — edit both or neither.
**Why it matters for the pitch:** judges triage in minutes; the two reading
surfaces are the pitch, pre-rendered. The scope ledger converts "what's missing?"
from an attack surface into an exhibit of discipline.

---

## D7-1 — the v2 redesign: research-first, one device

**Date:** 2026-09-01 (evening)
**Phase:** design round 2 — the x.ai benchmark, taken literally

**What happened:** the first design language ("the customs house": warm paper,
rotated rubber stamps, grain overlay, double borders, hard offset shadows,
duotone photo collage, a recorded GIF) read as *decorated* rather than
*deliberate* — the opposite of the reference. Before changing anything we
fetched the reference itself (x.ai) and measured it: pure-black ground,
Geist Sans/Mono, hairline borders at `rgba(255,255,255,0.06–0.1)`, 2–4px
radii, near-zero tracking on huge sentence-case headlines, 300ms ease
transitions, one muted sage accent. Our v1 used six decorative devices where
the benchmark uses one.

**The redesign ("the night ledger"):**
- Palette inverted to near-black ground (#050505) with white ink and ONE
  device — the hairline (8%/18% white). Fraunces demoted from app-wide display
  to the paper sheet only; Geist Sans carries everything else.
- Removed: grain overlay, rotated stamps, double borders, offset hard
  shadows, perforation masks, the hero photo collage, ALL-CAPS 0.22em mono
  tracking (now 0.1em micro-labels).
- **The GIF is gone.** Its replacement is `demo-player.tsx`: the golden path
  plays itself in live code — typed user turns, tool steps, the tier refusal,
  attestation, the mandate, ten gate checks ticking in, capture, and the
  ledger row landing; loops, holds on hover, replays on command. Crisp at
  every DPI, zero bytes of media. `docs/demo.gif`, `public/demo.gif`,
  `scripts/make-demo-gif.sh` deleted; `hero-customs.jpg` deleted; a designed
  `public/og.png` social card generated (`scripts/make-og.py`).
- The paper page became the one deliberate light surface: a white sheet on
  the black desk, serif, numbered sections.
- Verdict chips went upright (a finance system states verdicts, it does not
  decorate them) and were re-tuned for legibility after VLM review flagged
  contrast (borders 50%, tint 15%).
- Motion unified on 300ms ease-out (the measured x.ai curve), 150ms
  micro-interactions, reduced-motion inert.

**Bugs found and fixed during the round:**
- The trace dialog's backdrop was `bg-ink/30` — with ink now white, that
  rendered a *white* veil over a black page. Now `bg-black/70` + blur.
- Demo player: typing/gate-tick effects only bound to the first beat
  (SCRIPT[0]) — restructured so every beat starts its own effect. Hover-pause
  made real by a self-re-checking timer wrapper (every scheduled callback
  re-schedules at 200ms while paused, so the whole sequence holds).
- Next.js dev-tools indicator ("N" badge) polluted captures —
  `devIndicators: false` (dev-only anyway; production was never affected).

**The test it became:** `make verify` REQUIRED list now pins the v2 tree
(demo-player.tsx, og.png, screenshots; GIF/script/hero removed). VLM design
review at x.ai benchmark on five surfaces; both FIX verdicts (stats-bar
breathing room, paper leading) applied and re-reviewed.

**Why it matters for the pitch:** design is the first thing a judge sees and
the last thing most hackathon repos get right. One device, one accent, and
numbers in mono is the aesthetic of a payment network, not a template.

