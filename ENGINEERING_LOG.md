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

**Result (test keys arrived same day — spike executed for real):**
`results/d1_1_spike.json` carries the receipts. Orders API verified live
(`order_TWsKOTexAwD82e`). Path A is **dead in test mode** — customer creation
succeeds, but server-side token creation refuses (`400`: "type is/are not
required and should not be sent"); tokens require the Checkout surface, so a
zero-UI agent payment does not exist in test mode. The 429 at link 6 is an API
**rate limit, not** the documented 30/business link cap — cap scope stays
unresolved, and the volume-runs-on-simulation constraint holds regardless.
**Decision (final):** **B — hosted-checkout completion on real rails** (order →
Checkout → documented test card → signature-verified, id-deduped webhook
capture) is the demo mechanism; C remains the no-keys fallback and the volume
path; A is re-classified as impossible in test mode, with the receipts to
prove it. Machine-driven path B completion (Playwright) is the declared
stretch for the on-camera autonomous payment.

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


---

## D8-1 — the desk lamp: dual themes, the quiet footer, real photos

**Date:** 2026-09-01 · **Round:** v3 polish

**What changed:**

- **Two themes, one desk.** The night ledger stays the default; a light
  "day ledger" is one toggle away — x.ai's footer pattern, measured from
  their live DOM: a 28px round icon button at 40%/80% opacity, sun on the
  night desk, moon on the day desk. Implementation: every color was already
  a token, so the light theme is one `html.light { … }` block of flipped
  values plus contrast tokens (`--cleared-contrast` etc. for filled chips),
  `color-scheme` per theme, and a pre-paint no-flash script in layout.tsx
  (persisted in `localStorage`). The window scrollbar and every scrollable
  panel share one themed pill (`--sb-thumb`), engine-split for
  Chromium/Firefox as before.
- **The white/N utilities audit.** Every `border-white/25`, `bg-white/[0.05]`,
  `hover:border-white/30`, `bg-black/70` was replaced with `ink`-based
  overlays (`border-ink/25`, `bg-ink/[0.05]`, `bg-paper/70`) so overlays
  invert with the theme instead of vanishing on the light ground. The
  why-page architecture diagram re-inks itself: every stroke/fill is now a
  `--di-*` CSS variable set via SVG `style` props (var() does not resolve
  in presentation attributes — that detail cost one failed attempt).
- **The footer rebuilt on x.ai's actual footer skeleton** (fetched and
  measured): left column = mark + tiny © + theme toggle + source pill,
  right = quiet 13px link columns at half opacity. Killed: four columns of
  hints, two paragraphs, seven evidence blurbs, six command blurbs, three
  stamps, the second closing bar. A footer says where things are; it does
  not repeat the site.
- **The "img text" fix.** The demo player's product card showed a literal
  `img` placeholder box — the catalog had real photos all along
  (`public/products/*.jpg`). The product and cart beats now render the
  actual Bud-Pro photo (56px thumb on the cart line), same asset the
  playground serves.
- **Typography discipline.** Fraunces removed from the app entirely —
  Geist Sans/Mono everywhere (x.ai uses its own sans for docs, not a
  serif); the paper page keeps its white-sheet concept but set in Geist
  with mono furniture, wider margins (sm:px-14, §-sections at mt-12/pt-8),
  1.8 leading, and `.quiet-scroll` pills on every `overflow-x-auto` block
  (pre, tables) so no raw Chromium scrollbar appears on a text page. The
  why essay gets the same breathing room (py-20 sections, space-y-6).

**Bugs found and fixed during the round:**
- Stale dev-server console showed a phantom parse error at
  chat-events.tsx:298 (mid-edit hot reload) — reload-verified clean; tsc
  and eslint both green. Lesson re-learned: always re-check after HMR.
- `hover:bg-white` on the primary InkButton would have rendered
  white-on-white in light mode — now `hover:bg-ink/90`.

**The test it became:** `make verify` REQUIRED now pins theme.tsx; a
full 8-screenshot VLM review across both themes (landing light+dark,
footer light, why+diagram light, paper light, playground, control room)
returned SHIP on every surface, including "masterclass in grid-based
structure" on the light control room. Theme persistence across reload
verified in-browser (localStorage → pre-paint class, zero flash).

**Why it matters for the pitch:** judges open the site at unknown hours
in unknown color contexts — a footer that offers them the lamp, a diagram
that re-inks itself, and photos where photos belong are the details that
separate "a dark demo" from a product.

---

## D9-1 — the customs bot, one transcript system, the clean document page

**Trigger:** the fourth review round. The product read well at a distance,
but up close it spoke several dialects: the demo transcript had a white
SMS-style user bubble that popped against the hairline system (three
different border weights in one panel: 0.06 / 0.08 / 0.15), the "AGENT"
tag was set in gold so it ran into the mono text as one word
("AGENTcatalog.search"), the live ticker floated unframed on the page,
the paper page was a cream "sheet" artifact rather than a document, and
the control room opened with a wall of four badge chips. x.ai was
re-fetched and re-measured before changing anything: Geist Mono in the
hero headline spans, `font-medium` (not semibold) display type, radii
3–6px, and — the useful find — their homepage animates the hero with
`gridShimmerH`: 1px horizontal rules carrying gradient sweeps.

**What we changed:**

- **hero-bot.tsx (new)** — the customs bot: a small SVG desk officer
  beside the hero text. It borrows x.ai's shimmer (sage/ink gradient
  sweeps riding three resting rails) and gives it a body: a geometric
  bot that floats, blinks (scaleY keyframes; eyes turn sage on hover),
  stamps a verdict ring out of its chest diamond every 3.8s, and wears
  the mandate ring — a hairline circle rotating 46s with three bounds
  ("₹ cap 5,000", "✓ ed25519", "10 checks") counter-rotating about
  their own centers to stay upright. A receipt and a ledger line bob
  out of phase around it. Every stroke is a token; illustration inks
  (`hb-strong` 0.44 / `hb-rail` 0.18, stronger under `html.light`)
  sit above UI-hairline strength so the bot holds its shape on white.
  Reduced motion: it stands still on duty.
- **demo-player.tsx** — the transcript rebuilt as one system. The
  user's intent is now a logged input (right-aligned, `border-line`,
  `bg-ink/[0.04]`, 4px radius) — not a white bubble; the AGENT tag is
  a bordered chip so it reads as a token; the tool line splits at the
  arrow (call in soft ink, `→` in sage, result in full ink); every
  beat carries the same border weight, radius, and padding rhythm.
- **the ticker** — wrapped in a `doc` panel with a header row (LiveDot
  + "same lines the control room shows"), and the items became
  structured ledger rows: mono id · amount · status in its verdict
  color · rail, with a status-colored dot.
- **paper.tsx** — the white-sheet artifact is gone. The page is the
  document: same Geist, same hairlines, same tokens as every other
  surface, so it re-inks with the theme (x.ai renders its documents in
  whatever theme you are in — so do we). Masthead restored to the
  exact landing label: "razorpay ai buildathon 2026 · track 1 · test
  mode". The `.sheet` class is deleted from globals.css.
- **control-room.tsx** — the four-badge header wall is now one quiet
  mono strip (`rail simulated · brain rules · chain ok · 257` with a
  verdict dot); the red-team log rows breathe (space-y-2.5, pb-2.5);
  the at-1M projection band states its regeneration path without
  spraying the formula across the card.
- **light theme tokens** — `--line` 9%→12%, `--line-strong` 24%→28%:
  day-mode hairlines were one notch too faint against the white ground
  (VLM flagged the tier-card dividers and code chips as near-invisible;
  the bump fixed all of them at once).

**Bugs found and fixed along the way:**

- The README had been quoting the at-1M projection an order of
  magnitude low: "net ₹1,06,19,000" vs the measured
  `results/project.json` `netInr: 106190000` = ₹10,61,90,000. Fixed;
  caught because this round's rule was re-read every number shown
  before shipping the GIF.
- The dev server could not be restarted with a plain background spawn —
  the tool session reaped child processes when each command exited
  (three servers died mid-review before the pattern was clear). Fixed
  with `scripts/start-dev.py`: a double-fork + setsid daemon so the
  server survives between commands. Recorded here because the next
  agent will hit the same wall.

**Validation:** tsc clean, eslint clean, `make verify` green (new
REQUIRED entries: hero-bot.tsx, docs/demo.gif), `make test` green
(fuzz 12/12, ablation 8/8×3, audit 257 ok + tamper@129). Browser
walkthrough both themes with VLM design review: hero bot "cute and
premium" (dark + light), demo panel "one consistent system", paper
"native dark-mode docs", control-room header "calm telemetry, not a
badge wall". The new GIF (960×600, 322 frames, 2.7MB, palette-
optimized) records the live page: hero + bot, the golden path playing,
the ticker ticking.

## D10-1 — the white desk: one type system, pure white, the smooth bot

**Date:** 2026-09-01 · **Round:** v3.2 design-accuracy pass.

**What the round fixed (all user-flagged, all verified in-browser):**

- **The mono was everywhere.** Measured x.ai and grok.com directly
  (page_reader; Cloudflare blocks both curl and headless browsing):
  both set their UI in **Universal Sans Text/Display 400+550** with
  **Geist Mono only for code-ish spans** — and our control room alone
  carried 39 `font-mono` usages. That was "the weird font." The fix is
  a rule, not a font swap: the house sans carries every human sentence
  (labels, sub-captions, buttons, filter tabs, gate checks, chain
  lines, captions); mono is reserved for what a machine would read
  (ids, tool calls, code, the caps label line — the masthead
  "razorpay ai buildathon 2026 · track 1 · test mode" style, which
  was always right). `GhostButton`, `TierChip`, inline code chips, the
  demo loop bar, and every small caption reset in the sans.
- **Light mode was cream.** x.ai's light ground is `#ffffff` (verified
  from the fetched HTML: `background-color:#fff`); ours was `#faf9f7`
  with warm inks. The day ledger is now pure white with neutral
  near-black ink and neutral hairlines; `--cleared` sharpened to
  `#0f7a4d` after VLM flagged the forest green as muddy; themeColor
  follows.
- **The paper page went black in dark mode.** The working paper is a
  **white sheet in both themes** again: `.sheet` scopes the whole
  ledger token set back to ink-on-white, so one class re-inks every
  child (tables, pre blocks, stamps) — the document is a lit sheet on
  the night desk (border + lift) and the page itself on the day desk.
- **The bot was a diamond pile.** Rebuilt as one smooth body —
  gradient fill lit from above, glass crown, visor face with blinking
  eyes + a tiny smile, side pods, a ground shadow that breathes with
  the float, and ONE mandate chip (`✓ ED25519 · ₹5,000`, set in the
  site's own label mono) orbiting a single ring. The stamp rings,
  receipt, ledger line, chest diamond, antenna diamond and shimmer
  rails are gone. VLM: "premium, smooth, distinctly 3D-ish."
- **The live ledger was a marquee.** Now a quiet data list — the
  latest rows (time · id · amount · status · rail) hairline-separated,
  polling every 8s, new rows rising with the same flash the control
  room gives. x.ai shows live data sitting still.
- **Control room redesigned properly:** a real page intro under the
  h2, a sans status strip, GMV promoted to a 38px hero stat, the
  at-1M four-cell band collapsed into one breathing summary row, sans
  filter tabs, quieter trace dialog.
- **Demo badges back to black-and-white:** AGENT/ATTESTED chips and
  tool lines are strictly ink; verdict color stays reserved for
  verdicts (refusal red, capture sage).

**Bugs found and fixed along the way:**

- A JSX comment in control-room.tsx lost its closing brace in the
  rewrite (`in mono */` instead of `*/}`) — tsc caught it in one pass.
- The GIF pipeline: two-pass palette conversion via PNG frame
  intermediates timed out at 600s (PNG-encoding 355 frames is the slow
  path, not the palette); `scripts/make-gif.sh` now runs palettegen/
  paletteuse straight off the video — the whole GIF builds in ~6s
  (ffmpeg exits 255 on the last frame flush but the file is complete
  and ffprobe-valid).

**Validation:** tsc clean (app), eslint clean, `next build` green,
`make verify` green, `make test` green (fuzz 12/12, ablation 8/8×3,
audit chain ok + tamper@129, meter, project). Browser walkthrough both
themes with VLM verdicts: landing dark SHIP, landing light SHIP (pure
white confirmed), control room SHIP (after the projection-row and
green fixes), demo badges SHIP, paper sheet SHIP, live ledger SHIP,
GIF frames SHIP. Zero console errors.

## D11-1 — 2026-09-01 · the pebble, the window, the honest search

**Round:** v3.3. Trigger: three real product complaints — (1) the demo
player trapped the page's scroll (an internal `overflow-y-auto` pinned to
the newest beat: wheel-down went nowhere, wheel-up fought the auto-pin —
the page "stuck" whenever the cursor crossed it); (2) `search headphones
under 5000` returned the ₹18,999 headphones; (3) the bot had regressed
into an orbiting gadget rack (ring + chip + antenna + pods) after being
asked for "smooth, cute, minimal".

**Fixes:**

- **The demo player is a window, not a scroll region.** `overflow-hidden`
  + `flex-col justify-end` (flexbox clips the START when justify-end
  overflows — the exact "pinned to newest" behavior without a scrollbar)
  + a `mask-image` top fade. A boot line seeds the panel so it never
  renders empty. No wheel capture, no scrollbar to style.
- **The search lost the budget.** Root cause: `nlu.ts` strips "under
  5000" from the query before handing it to `search_catalog`, and the
  tool re-parsed the ceiling from the *cleaned* string — always null.
  The ceiling now rides with the intent into the tool args; filtering
  happens BEFORE the 3-result limit (limiting first starved budget
  queries); a synonym set (headphones ↔ earbuds/buds/earphones) plus a
  same-category fallback lands "headphones under 5000" on the ₹4,999
  earbuds. Deterministic throughout — the ablation still replays
  bit-for-bit.
- **The bot, v3 — the pebble.** One smooth egg-shaped volume: vertical
  gradient light, a gloss band across the crown, blurred ambient
  occlusion at the foot, a breathing ground shadow, a quiet visor face
  that blinks. Deleted: the orbit ring, the mandate chip, the antenna,
  the side pods. 3D read from light, not from line-art.
- **One transcript system:** buyer intent = sent message (solid
  `bg-ink`/`text-paper` — black-on-white by day, white-on-black by
  night, exactly the send button's colors), desk voice = incoming white
  card, AGENT/adapter tag = the agent's own green, tool rows `w-fit` so
  they hug their content.
- **Why page:** centered opening claim; the architecture redrawn as the
  site's own cards (HTML, not a fixed-width SVG) — reflows on phones,
  never scrolls sideways, re-inks with the theme.
- **README:** centered wordmark as transparent SVG light+dark variants
  via `prefers-color-scheme` (the night-tile lockup is gone), the GIF is
  the only embedded image, tone tightened to production.

**Lesson:** an auto-scrolling inner container is a scroll trap — if a
panel must follow its own output, make it a clipped window (justify-end
+ overflow-hidden), never a scroll region the visitor's wheel can fall
into. And: state parsed upstream (the price ceiling) must travel
downstream with the request — re-deriving it from a *cleaned* string
silently drops it.

**Validation:** tsc clean, eslint clean, `next build` green, `make
verify` green (wordmarks replace lockup+screenshots in REQUIRED), `make
test` green. Browser walkthrough both themes + VLM review; GIF
re-recorded from the final state.

## D12-1 — 2026-09-01 · the fixed dialog, the alive bot, the calm opening

**Round:** v3.4. Five user reports, two of them real bugs with
surprising root causes.

**The trace dialog you had to scroll to find:** the modal was
`position: fixed` inside `.view-enter`, whose animation declared
`fill-mode: both` — so `transform: translateY(0)` stayed computed on
the wrapper FOREVER, and (CSS spec: a transformed element becomes the
containing block for fixed descendants) the "viewport-fixed" dialog
measured against the entire 1462px page instead of the 900px viewport.
Fix 1: dropped `both` from every transform keyframe animation
(view-enter, animate-rise, row-fresh's rise) — end state equals base
state, so nothing visually changes. Fix 2: the dialog itself rebuilt
the robust way — backdrop scrolls (`overflow-y-auto` + `min-h-full`
cradle), card is a flex column capped at `calc(100dvh-3rem)` with the
span list scrolling inside, body scroll-locked while open. Verified:
card 207–693 in a 900px viewport, body locked, long traces scroll
internally, Escape closes.

**The half-typed "get" glitch in the demo (and on tab switch):** two
causes. (1) The IntersectionObserver callback called `start()` inside
the `setVisible` state updater — React StrictMode double-invokes
updaters in dev, so two timer chains ran concurrently, both writing to
the same last-entry slot: one typing word N while the other advanced
to beat N+1 — the transcript showed half-words fighting. (2) Timers
cleared on scroll-out left the partial text frozen. Fix: a generation
counter — every (re)start mints a new generation and every scheduled
callback checks it before firing; the observer now only sets state
(pure), a separate effect owns start/stop on `visible`. Re-entry
verified: scroll away mid-word → scroll back → clean restart, no
duplicates.

**The bot, v4:** the visor rectangle read as a face-frame — deleted.
The face is drawn straight on the body now: bigger glossy eyes with
white glint dots, a whisper of blush, the same pleased smile. And the
one flourish the user asked for: an iridescent aurora — a soft
multi-hue gradient (sage → sky → lilac → amber) clipped to the body's
own shape, gliding through it on an 8s ease-in-out sweep
(transform-only, compositor-safe, dimmer in light mode). The eyes also
glance aside every 9s. VLM: "clean, polished, and exactly as
requested" — SHIP.

**Why page opening:** the giant clamp(64px) headline block held most
of the section's whitespace while the body text sat dense beneath it —
the imbalance read as "cramped then empty". Rebalanced: headline
clamp(32/56px) + text-balance, label→h1 gap up, body leading 1.75,
one consistent rhythm. VLM: SHIP.

**Mobile masthead:** five nav links + wordmark + chip could not fit
375px — they crunched into a horizontal scroll strip. Now: desktop nav
(md+), and on phones a bordered menu button whose two lines become
one; the dropdown is five full-width rows + the TEST MODE chip. Escape
closes it. VLM: both SHIP.

**The quiet stuff:** inner scrollbars (chat, rail, ledger, pre) hidden
entirely — the window keeps its thin themed pill; wheel/touch still
scroll everywhere. Footer © line drops ", Track 1" so it sets on one
line. And a small power feature: "/" focuses the playground composer
from anywhere on the page (the placeholder says so).

**Lesson:** fill-mode `both` on a transform animation is a permanent
transform — it silently turns every fixed-position descendant against
its ancestor. Modals that live inside animated view wrappers must
either escape the wrapper or the wrapper must never keep a computed
transform. And never run side effects inside a setState updater —
StrictMode will run them twice.

**Validation:** tsc clean, eslint clean, `next build` green, `make
verify` green, `make test` green. Browser: dialog geometry + lock +
long-trace scroll verified by DOM measurement; demo re-entry clean
under the generation guard; typing progression frame-checked (2fps
strip: partial → complete, no freeze, no duplicate beats); mobile
masthead + menu SHIP; why opening SHIP; bot SHIP (dark). GIF
re-recorded (36.7s, 1.93MB). Zero console errors after the stale-HMR
entry was cleared by a touch-recompile.

---

## D13-1 — 2026-09-01 · the aurora that left the egg, and the rectangle on the forehead

**What happened:** Two bot bugs shipped in v4 and were reported within
the hour. (1) A small hard-edged rectangle sat on the bot's forehead in
both themes. (2) As the aurora swept, "the effect goes out of the
shape" — part of the body went empty/white while a visible edge crossed
the face, worst at the right end of the sweep.

**Root causes, both geometric:**

1. The forehead rectangle was the crown "gloss": a `<rect>` filled with
   a white 0.2-opacity gradient. A rect with a fading fill still has
   four corners — over the body's top tint it read as a sticker.
2. The aurora was a 400px-wide gradient rect translating ±150px inside
   a clipped group. The ribbon's opaque core (~264px) was narrower than
   the egg (208px) plus the travel (300px) — so at each end of the sweep
   the core mostly left the egg (empty body, "nothing there"), and the
   ribbon's soft edge crossed the visible face ("the edge is looking").
   The clip never failed; the geometry inside it was wrong. Separately,
   a CSS-transformed rect clipped only by an ancestor group is a
   compositing risk in Chrome (ancestor clips can be dropped on layer
   invalidation, e.g. on theme repaint) — a second way the same bug
   could present.

**Fix (v5):** animate the paint, never the element. The aurora rect is
now static, exactly the egg's bounds, clipped to the egg's own path —
and SMIL `<animateTransform>` moves the *gradient* (userSpaceOnUse)
through it. A fill cannot escape its geometry; a static element cannot
misalign its clip; there is no transform layer to lose anything. The
gradient's opaque core (offsets 0.31–0.94 of a 480px vector) is sized
to cover the egg at both ends of the ±48px drift, so the body is never
empty and no edge is ever visible. The forehead gloss became a blurred
ellipse (a sheen with no boundary cannot read as a shape). The SMIL
clock is paused under `prefers-reduced-motion` via
`svg.pauseAnimations()`.

**The verification trap:** the first VLM regression run still showed the
v4 artifact — because `next build` had been run while `next dev` was
live, and the dev server served stale modules from the corrupted shared
`.next` (Fast Refresh "done" ≠ your code is live). Caught by asserting
the live DOM (`querySelector('.hb-aurora')` attributes matched v5, not
v4) before trusting any screenshot. Rule recorded: after any build,
restart the dev server; before any visual verdict, check the DOM
actually renders the new markup.

**Validation:** deterministic SMIL phases (setCurrentTime 0 / 2.25 /
4.5 / 6.75) screenshotted in dark and light, plus a theme flip
mid-cycle: no rectangle, no escape past the silhouette, no empty phase,
no edge (VLM SHIP ×8 frames). Hover state: eyes sage, blush warmer,
aurora +0.1 — SHIP. Paper CTAs re-measured by DOM geometry: 396 vs 397
(the text column) — aligned. tsc / eslint / build / `make verify` /
`make test` all green. The regression test for this bug is codified in
`docs/DESIGN_SYSTEM.md` §10.4 (bot containment checklist).

## D14-1 — 2026-09-01 · the dots that left the eyes, the frozen page, the sudden transcript

**What happened:** Three reports in one message. (1) On the hero bot, "the eye
dots are moving out of the eye when the eye is moving right or blinking."
(2) On `/paper`, "sometimes the scrolling stucks, may be near the jsons."
(3) In the watch-it-clear demo, "the messages are bit sudden — why don't they
come cool and smooth."

**Root causes:**

1. *The glints were structurally homeless.* The v5 face drew the two glints
   in a sibling group BELOW the eyes group: the glance translated the eyes
   +4.5px while the glints counter-drifted −2px on their own clock — a
   −6.5px relative shift into ~0.9px of room. The white dots slid fully out
   of the dark eyes. And the blink scaled each eye rect to `scaleY(0.08)`
   while the glints, outside the eye, stayed full-size circles floating
   beside a 2px slit.
2. *A horizontal window that swallowed vertical scroll.* `.quiet-scroll`
   (the paper's wide `<pre>` JSON and tables) is `overflow-x: auto`, which
   computes `overflow-y: auto` — a scroll container in BOTH axes that can
   never scroll vertically. It also carried `overscroll-behavior: contain`
   (swept in with the real scroll panels), so a wheel or touch gesture that
   latched it consumed the scroll chain: the page froze under the cursor.
   Exactly "stuck near the jsons", exactly "sometimes" — only when the
   gesture began over those blocks.
3. *A bottom-pinned list teleports on insert.* The demo window anchors its
   transcript to the bottom edge, so every arriving beat moved everything
   above it by the beat's full height in one frame; the old 0.28s entrance
   animated the new card, not the jump. A second defect hid in my first
   fix attempt: the FLIP effect reset `transition`/`transform` on every
   commit, so typing ticks (34ms) cancelled each 420ms glide mid-flight —
   snapping the stack back to "sudden". A third: the computed-transform
   parser read `matrix(a, b, c, d, tx, ty)` at index 4 — the horizontal
   translate, always 0 — so the in-flight glide corrupted the layout
   measurement and the stack oscillated.

**Fixes:**

1. *Eyes follow the containment law* (same proof as the aurora): each eye
   is ONE group — dark rect and glint together — so blink scales them as
   one (a squashed eye squashes its highlight); the glance carries the
   whole eye window; and both glints are clipped to `hb-eye-win`, a
   clipPath of the two eye rectangles. The counter-drift survives at
   ≤1.2px, now relative to the eye and clipped at its edge — the wet-eye
   tell without the escape. Paint cannot leave geometry; the face cannot
   leak dots again.
2. *Horizontal-only windows chain.* `overscroll-behavior: contain` removed
   from `.quiet-scroll` alone; the true scroll panels (chat, rails, live
   ledger) keep it. Wheel over the JSON now chains: 10×80px over the
   pre scrolls exactly 800px.
3. *The transcript glides.* A FLIP effect on the stack wrapper: derive the
   layout top arithmetically (`rect.top − ty`, ty parsed at matrix index
   5), hold the last painted visual position (in-flight remainder + shift)
   for one frame, transition to rest over 420ms; no-op commits touch
   nothing so glides are never cancelled; shrinks (restart) snap on
   purpose; the transform clears on arrival (no lingering containing
   block — D12-1). Beats enter on a softer 0.4s expo-out curve, gate rows
   stagger, the loop fades its last line out before clearing the desk,
   and product photos preload so cards never pop half-formed.

**Validation:** eyes measured by DOM geometry at home / glance-right /
glance-left / blink-closed / blink-mid-glance (glints inside or clipped
≤0.3px; blink rides to 0.4px with the lid) + VLM SHIP on all five frozen
phases and the light theme; /paper wheel chains exactly over the JSON;
the glide verified by sampling the computed transform (decaying ease-out
sequences at real card heights, e.g. 92 → 49 → 18 → 8 → 2); console clean;
tsc / eslint / build / `make verify` / `make test` green. The eye-window
law, the FLIP rule, and the scroll-chain rule are codified in
`docs/DESIGN_SYSTEM.md`.
