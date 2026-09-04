# DESIGN_SYSTEM.md — the Customs design language, as rules an agent can follow

This file is the contract between the design and every future change. It is written
for coding agents (and humans) who need to add a screen, a component, or a motion
without breaking the look. If a change you are about to make contradicts a rule here,
the change is wrong — or this file is wrong and must be amended in the same commit.
Either way, never ship a silent contradiction.

The reference is x.ai / grok.com: a near-black desk (or pure-white desk), one ink,
hairlines instead of shadows, mono type wherever the system (not a human) is speaking.
Restraint reads as production.

## 1. The one device

Every surface is separated by **one hairline** (`--line`, 1px). Not shadows, not
gradients, not double borders. Depth is communicated by exactly two allowed means:
the hairline, and on the night desk only, a single soft shadow under the paper sheet.
There is no second border style in the product. If a design needs "more separation",
the answer is more whitespace, not more chrome.

## 2. Color tokens

Two themes flip the same token names. Nothing else in the DOM changes. Theme is a
class on `html` (`light` or default dark), persisted, applied pre-paint (no flash).

| Token | Dark (default) | Light | Use |
| --- | --- | --- | --- |
| `--paper` | `#050505` | `#ffffff` | the ground — nothing else |
| `--paper2` | `#0c0c0c` | `#f5f5f5` | the sunken well (composer wells, inset rows) |
| `--ink` | `#f5f5f5` | `#0a0a0a` | primary text, solid buttons, the bot's eyes |
| `--ink-soft` | `rgba(245,245,245,0.62)` | `rgba(10,10,10,0.58)` | body copy, secondary labels |
| `--line` | `rgba(255,255,255,0.08)` | `rgba(10,10,10,0.1)` | the hairline |
| `--line-strong` | `rgba(255,255,255,0.18)` | `rgba(10,10,10,0.2)` | emphasis borders (stamps, table heads) |
| `--card` | `#0a0a0a` | n/a (`--card-hover` `#fafafa`) | panels on the ground |
| `--card-hover` | `#0d0d0d` | `#fafafa` | hover fill for liftable cards |

Light mode is **pure white** — no cream, no warm cast. Never tint the ground.

### Verdict colors — meaning, not decoration

Only three hues are allowed to carry meaning, and nothing else in the product may
be colored (the single exception: the bot's aurora, §7):

| Verdict | Dark | Light | Means |
| --- | --- | --- | --- |
| cleared (sage) | `#a2c0a9` | `#0f7a4d` | the gate passed, money moved |
| refused (ember) | `#e5887a` | `#b3492f` | the gate refused, with a reason code |
| held (amber) | `#d6a251` | `#916a1e` | the human desk holds it (≥ ₹10,000) |

Each has `-ink` (a ~8–10% tint for fills) and `-contrast` (text on solid fills)
companions. A color that does not map to a verdict does not exist here.

**The one non-verdict hue: the band.** `--band` (`#e0604e` dark / `#c04a3a` light,
with `-ink`/`-contrast` companions) belongs to the music ghost — the second
agent — the way the aurora hues belong to the bot. It is a character color,
not a verdict: it must never appear on stamps, chips, text or borders outside
the ghost and its transcript chip. Nothing else in the product may wear it.

### The sheet

`.sheet` (the paper view) is a **white document in both themes** — x.ai's dark site
still shows white documents. The class re-scopes the tokens to ink-on-white inside
itself, so children need no per-element overrides. On the night desk it additionally
gets one hairline border and one soft shadow. Do not restyle the sheet per-theme by
hand; let the token flip do it.

## 3. Typography

Two families, from `next/font` (Geist + Geist Mono), wired as
`--font-geist-sans` / `--font-geist-mono`, exposed as Tailwind `font-sans` /
`font-mono` / `font-display` (display = sans; weight and tracking do the work).

- **Sans** is for humans: headings, body copy, buttons, field labels.
- **Mono** is for the system: timestamps, IDs, amounts, reason codes, tool-call
  badges, stat hints, anything the machine said or measured. If a string would be
  copied out of a log, it is mono.

Scale (sans): hero `clamp(32px–56px)/1.05, -0.03em, 600` · section heads 22px/600,
`-0.015em` · body 15px/1.8 `--ink-soft` · dense body 13–14px · small labels via
`.label-caps` (mono 10.5–11px, `0.1em` tracking, uppercase, `--ink-soft`).
Scale (mono): 10–11.5px for chips and metadata; 12.5px for reference lists; tabular
alignment is automatic in mono — use `.tnum` for sans numerals.

Rules: no font below 10px. No italic except paper-style emphasis (`<em>` in the
paper body). Headings never use mono. Amounts never use sans.

## 4. Geometry

- Radius: the system corner is **4px** (`.doc`); the sheet is 6px; stamps 3px;
  avatar pills are full-round. No other radii.
- Spacing rhythm: 4px base. Section rhythm: `mt-10` + `pt-8` after a hairline.
- Buttons: 32–36px tall, `px-3.5–4`, never full-width on desktop (mobile rows may).
- Cards lift 1–2px with `--card-hover` fill; never scale above 1.02.
- Alignment law: anything that continues a text column (buttons after a paragraph,
  badges under a heading) inherits the column's left edge — match the container's
  horizontal padding exactly.

## 5. Components (src/components/customs/bits.tsx and friends)

| Component | Look | Notes |
| --- | --- | --- |
| `InkButton` | solid `--ink` fill, `--paper` text, 4px radius, optional arrow | the one primary action per view; light mode: black button / white text; dark mode: white button / black text |
| `GhostButton` | 1px `--line-strong` border, transparent, ink text | secondary action; hover: border to ink |
| `Stamp` / `StatusChip` / `TierChip` | `.stamp` — mono uppercase 10.5px, verdict border + `-ink` fill | verdicts only; never decorative |
| `SectionLabel` | `.label-caps` | view eyebrow ("the desk", "the evidence") |
| `Kbd` | mono 10px, hairline border, 3px radius | keyboard hints |
| `.doc` panel | 4px radius, hairline, `--card` ground | the generic panel — no shadow |
| `.sheet` | §2 | the paper view only |
| ledger rows | hairline-separated, mono IDs/amounts, verdict chip at the right | newest at top; `row-fresh` flash on append |
| chat bubbles (agent view) | user: `--paper2` well; agent: transparent with hairline; badges (`AGENT`, `ATTESTED`, `GATE`) mono 9.5–10px with role colors | system badges are mono and small — they annotate, they never shout |

Badges and chips are the most over-designed thing in AI demos. Here they are
mono, ≤10.5px, single-hairline, and proportionate to their content — an
`AGENT catalog.search("bud-pro") → 1 match` badge is one compact inline chip,
never a wide bar.

## 6. Motion

- Budget: motion exists to confirm causality (something appeared, something
  appended), never to entertain. If a motion is noticed on the third loop, it is
  too loud.
- Durations: micro 120–200ms (hover, flash), enter 240–300ms (view/rise), ambient
  loops 5–10s (bot, pulse). Easing: `ease` for micro, `ease-out` for enters,
  `ease-in-out` for ambient. Spring stiffness beyond a 1.02 scale is banned.
- Mechanism law: CSS animations animate **transform and opacity only** — paint
  and layout properties are off-limits (`fill`/`color` transitions ≤ 0.6s are
  allowed as paint-only transitions). Framer-motion is for the few enters that
  need it; it must not add layout thrash.
- **The SMIL exception** (the only one): the bot's aurora animates the gradient's
  paint via `<animateTransform attributeName="gradientTransform">` over a static
  rect clipped to the body path. Rationale: a fill can never escape its geometry,
  and a static element can never drop its clip — this is the containment proof
  for "the effect stays inside the shape". Any new ambient color motion follows
  this pattern (animate the paint, not the element) or does not ship.
- **The FLIP rule for bottom-pinned lists:** when a list is anchored to its
  bottom edge (the demo transcript), inserting a child moves everything above
  it by the child's full height in one frame — a teleport the eye reads as
  "sudden". The list's stack must therefore glide: hold the last painted
  position with `translateY` for one frame, then transition to rest (the FLIP
  technique, 420ms `cubic-bezier(0.22, 1, 0.36, 1)`). Two laws from the
  implementation: derive the layout position arithmetically
  (`rect.top − current translateY`, parsed from the computed matrix, where the
  Y translate is the *sixth* value, not the fifth) and never touch the styles
  on commits that barely move the layout — cancelling an in-flight glide
  mid-transition snaps the list and undoes the whole effect.
- `prefers-reduced-motion: reduce`: every CSS loop is listed in the global
  kill-switch; SMIL is paused via `svg.pauseAnimations()` in the component.
  Theme flips and hover states remain (they are state, not motion).
- **Transcript cascade:** a chat turn's batch settles top-to-bottom — the last
  two children of `.chat-scroll` rise 70/140ms after the rest (a `--d` delay on
  the existing `.animate-rise`; transform/opacity only). The mark's diamond
  carries one subtle corner rounding (d=5 quadratic at each vertex) — sharp
  corners read blunt at badge sizes.
- Scrollbars: the window keeps one thin themed pill; inner panels hide theirs
  entirely and scroll on wheel/touch. **Chain rule:** a horizontal-only
  overflow window (`.quiet-scroll` — wide `<pre>`/`<table>` blocks) must NEVER
  set `overscroll-behavior: contain`: it can never scroll vertically, but it is
  still a scroll container the browser can latch a wheel or touch gesture to,
  and `contain` then swallows the page's scroll chain — the page freezes under
  the cursor. Only true scroll panels (chat, rails, live ledger) contain.

## 7. The bot (mascot) contract — `hero-bot.tsx`

The Customs bot is one egg, one face, one aurora. It is cute the way x.ai things
are cute: smooth, quiet, small tells.

1. **Containment law:** nothing — highlight, glow, gradient, shadow — may ever
   render outside the egg's silhouette. Structural proof: the aurora is a static
   rect, exactly the egg's bounds, clipped to the egg's path, with SMIL moving
   the gradient's paint. A drifted-rect-inside-a-clipped-group pattern failed
   twice (v3: clip lost on compositing; v4: ribbon core narrower than the sweep,
   so the body went empty at the extremes). Do not reintroduce it.
2. **The eye-window law** (same principle, smaller shape): each eye is ONE
   group — dark rect and glint together — so they blink as one (a highlight
   never floats beside a closed eye), and both glints are clipped to a
   clipPath of the two eye rectangles (`hb-eye-win`). The glints' counter-drift
   lives inside that clip: a sliver may cross the eye's edge and clip (reads as
   the highlight sliding across the cornea), but the paint can never leave the
   eye. The v5 face put the glints in a sibling group that drifted 2px against
   a 4.5px glance with ~1px of room — the dots visibly left the eyes.
3. **No hard-edged highlights.** Crown sheen and blush are blurred ellipses. A
   rect with a gradient stop still reads as a rect (the v4 forehead bug).
4. **Face geometry is fixed:** eyes, glints, blush, smile — no ears, no visor,
   no frame, no extra parts. Expressiveness comes from motion, not geometry.
5. **Subtlety budget for motion** (the whole budget — spend it, never exceed it):
   float ±7px/7s · shadow breathing · blink (with an occasional double blink) ·
   glance aside and a smaller counter-glance, ±4.5px / 9.5s · glints lag the
   glance ≤1.2px, clipped to the eye (the wet-eye tell) · aurora drift ±48px/9s ·
   hover: eyes to sage, blush warms, aurora +0.1 opacity. That is all. Nothing
   else moves.
6. Colors: structural colors are tokens; the aurora's four hues (sage, sky,
   lilac, amber at 0.7–0.85 stops, themed total opacity 0.55 dark / 0.38 light)
   are the only non-verdict colors in the product. Keep exactly four.

### The second character: coco, the music ghost — `music-ghost.tsx`

Coco is the desk head's own body in the band red: the same 32×32 round
volume, the same `desk-eye-g` / `desk-eye` classes (glance for glance,
blink for blink — the choreography is shared, not copied). It is
summoned by the desk agent's chat and plays what was asked.

1. **Face law:** eyes only — no mouth, ever (the desk head is mouthless;
   so is coco). Expression is eye state (wide; happy arcs when the
   passage earns it) plus body motion. No new parts.
2. **Twin law:** the silhouette is the desk head's own — one circle, no
   skirt, no extra geometry. The band fill, the beat bob, and the sheen
   (the bot's aurora pattern scaled down: a static rect clipped to the
   circle, the paint drifting via SMIL, paused under reduced motion)
   are the only departures. Paused music freezes the bob — coco
   breathes only when the track does.
3. **Motion budget:** arrive/sink (one 0.9s transform each), the beat
   bob, the shared eye choreography, the tucked-away fade. That is all.
4. **Controls** live in one hairline bubble: the YouTube player at
   visible size (never a hidden or 1px frame), track, channel, a
   transform-only progress ride, exactly three buttons (play/pause,
   skip, stop). Mono for the metadata, sans for the title. No close box
   on the card — the card is dismissed by stop, or hidden with the
   music still humming. The card stays mounted while a track lives —
   the background sink is visual only, so the music never dies
   mid-track; stop alone ends the player, and the next summon starts
   a fresh one.
5. **Coco's chat** is the desk agent's panel in miniature, and it opens
   on a click of coco: the same hairline header (the face at 24px, one
   status dot — band while humming), the same quiet text close, the
   same sunken composer well, TypeLine for coco's voice. It drops
   downward from coco when there is sky below, rises when coco sits
   low — clearing the card when the card is up (the desk panel's own
   below/above law). Its ear is the rules brain: control verbs run at
   zero tokens; a play wish rides the desk's chat pipeline over the
   wire — the server-side rules brain catches it at zero tokens (the
   LLM never wakes) and the crate answers in coco's own chat, no desk
   conversation required. Hide ≠ stop: "hide" (chat word or header button)
   tucks coco away while the music keeps humming; "give me controls"
   recalls it. A **double-click** on coco toggles the video: it sinks
   to the background — the music hums on, coco stays to talk to — and a
   second double-click brings the screen back (a video the browser
   still holds back can't sink — tap play first). "give me controls"
   always works too. A ↻ fresh page fades the conversation before it
   clears — turning a sheet over, not a wipe; the music is untouched.
6. The summon is logged in both transcripts as a compact `coco ·` chip
   with the chosen track — a receipt of the handoff, not decoration.
7. **The agents view** presents both characters on ONE felt desk split
   by the bus seam — the house's own craft vocabulary (static
   feTurbulence grain, running-stitch seams, woven-label nameplates,
   cross-stitch corner tacks, a band dye wash on the ghost's patch,
   thread = hairline gray except on the ghost's own cloth) held to the
   craft school's discipline (Web Interface Guidelines / 
   animations.dev / Linear's calmer interface): hover changes one
   quiet thing, the live heads and the one-shot wire ping are the
   delight budget, and the card/chat/head stack in one flow column
   below the head so nothing ever overlaps.

## 8. Copy voice

Lowercase for actions and system labels ("see the protocol run live",
"why it exists", "run the fuzz"). Verdicts are plain words with reason codes
(`refused: mandate expired`). Nothing says "revolutionary", "magic", "powered by".
Test mode is always labeled where money is shown. Numbers that came from the
ledger say so (`make meter`), numbers that did not exist yet do not appear.

**The chat speaks human.** One idea per bubble, two short sentences max. The
words "Razorpay", "test mode" and crypto ("Ed25519") never appear in prose —
the rail lives in the header stamp (`SANDBOX`/`SIM`) and the receipt's mono
footer, the signature hash lives on the mandate card, amounts live in the
cards (§3: amounts never use sans). Prose carries intent ("Paid.", "You're
verified.", "That's over your current limit."); chips carry the next step,
with human labels and parser-exact payloads (`Raise limit` → `attest`).

## 9. Do / Don't

Do: hairlines, tokens, mono for the machine, one primary action per view,
whitespace over chrome, motion that confirms, blur for organic highlights.
Don't: gradients outside the bot, glows, rotated stamps, second borders,
emoji, drop shadows on panels, all-caps sans, colored text that is not a
verdict, full-screen takeovers, skeleton loaders (the data is local — show it).

## 10. Verification workflow

1. `bun run typecheck && bun run lint && bun run build` — the floor.
2. `make verify && make test` — the evidence layer still passes.
3. Screenshot the changed view in **both themes** (`html.light`), desktop and
   375px. Check: ground is pure white in light, near-black in dark; the sheet is
   white in both; hairlines visible at 100% zoom; nothing colored that is not a
   verdict (or the aurora).
4. For bot changes: screenshot mid-cycle (aurora visible) and at both sweep
   ends — the egg must never be empty and no ribbon edge may cross the face.
   Toggle the theme mid-cycle: the aurora must stay inside the silhouette
   throughout (this was the shipped bug — it is now a regression test).
5. Record `docs/demo.gif` from the final state only.

Amend this file in the same commit as any intentional design change. The design
system is part of the product surface, not documentation garnish.
