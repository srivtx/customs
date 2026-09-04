# Video transcript — the 5:00 pitch (plain-English version)

The spoken lines are plain and simple — short sentences, no jargon without
a quick explanation. Read it like you talk. Timestamps are beats, not hard
cuts. One take, screen + voice, recorded on the live deployment so the URL
bar is evidence. The first 10 seconds carry the whole idea.

## 0:00–0:20 — the big idea

**On screen:** the landing page, hero stamp. The browser is on the live
site — customs.srivtx.xyz — and the URL bar stays visible all video.

> "AI agents are starting to shop and pay on their own. Almost everyone is
> building the buying side. Almost nobody is building the selling side —
> the part a payments company needs before it lets a robot spend money.
> We built both sides, in one project. It's called Customs — and it is
> live right now."

## 0:20–1:05 — the buyer side (live)

**On screen:** Playground. Type "headphones under 5000".

> "Here is the buying agent. I type: 'headphones under 5000.' Watch every
> step it takes — the search, the tools it calls, the messages it sends,
> and the price. The website re-checks the price on its own server, so
> nobody can trick it with a fake number. Now I say: 'checkout.'"

Type "checkout".

> "Before it pays, the agent gets a permission slip. It says the most it
> can spend, what it can buy, when it expires, and how much this user is
> trusted. It is signed with a strong digital signature. I approve it.
> Only then can the agent pay."

Approve → gate checklist → capture.

> "And just before money moves, plain code — not AI — checks everything
> again: the signature, the spending limit, the prices, the counts. The
> AI can talk. Only this code can move money. That is the rule, and we
> never break it."

## 1:05–1:50 — the attack (failure, handled)

**On screen:** red-team panel → "Overspend the tier" → BLOCKED.

> "Now the best part. I attack my own product. A fake session tries to
> buy a 2,199-rupee mouse with a 500-rupee limit. Blocked — with a short
> code that says why. And the attempt is saved in a log that cannot be
> secretly edited. We wrote twelve attacks like this. All twelve are
> blocked, every time we test. Not just a demo — it runs in our build
> check."

**On screen:** "Tamper the signature" → BLOCKED · SIGNATURE_INVALID.

> "What if someone edits the permission slip after it is signed? The
> signature catches it. And if anyone changes one old entry in the log,
> the chain breaks at that exact spot. Nothing can be changed in
> secret."

## 1:50–2:30 — the merchant side

**On screen:** Control Room. The P&L meter counting up.

> "Now walk around the counter. This is the merchant's room — what the
> shop, and honestly what Razorpay, would want to see. How much agents
> are selling. What it costs to serve them. What is left as profit.
> Live. And every number here can be re-made with one command. Nothing
> was typed in by hand."

**On screen:** approval queue → approve the ₹18,999 hold.

> "One more rule. Any order above ten thousand rupees waits for a human.
> I approve this one — it completes, step by step, right in front of
> you."

## 2:30–3:00 — the desk hires a second agent (the ghost)

**On screen:** the Agents view — the black desk agent on the mat. Type
"play africa by toto" — the wire fires, the red ghost is summoned, music
starts. Let it be visible; the packet riding the wire is the shot.

> "Here is the part almost nobody shows: one AI hiring another AI, live
> on the merchant's desk. I tell the desk agent: 'play Africa by Toto.'
> It summons a second agent — the red ghost — over a live wire, and the
> ghost performs it. Play, skip, pause — those are plain code, zero AI
> tokens, and a test file proves it. Ask it anything else, and a small,
> cheap model answers in a few tokens. Cheap on purpose. The desk stays
> the only thing that can move money."

## 3:00–3:35 — works with any agent protocol

**On screen:** adapter switcher → MCP-style → wire chip expands.

> "Agent systems speak different languages — direct calls, MCP, ACP. Our
> gate does not care. The same checks sit behind all three — and the MCP
> side is a real MCP server: connect any MCP client to it today. We
> measured all three: same decisions, different message sizes — and we
> published the byte cost. If a new standard wins, we swap the
> transport. We do not rewrite the product."

## 3:35–4:10 — built to be checked by a machine

**On screen:** terminal — `make triage` scrolling.

> "Thousands of projects will be judged. Many will be checked by a
> machine first. So we built this repo to be checked by a machine. One
> file maps every claim to a file and a command. One command — `make
> verify` — checks the whole repo with plain node, no setup. No number
> was typed by a human. No link ships unless it works. And every bug we
> ever hit became a test — forever."

## 4:10–4:45 — labeled, and what's next (honesty slide)

**On screen:** the desk ledger, one patch at a time — then `/api/health`
on the live site, `rail: razorpay-test, simulated:false` visible.

> "Now, how we label things — said plainly. The desk you are watching is
> live, on real Razorpay test-mode rails — test keys only, and the
> health endpoint proves it on every boot. On a fresh clone with no
> keys, the rail degrades to a clearly labeled simulation — nothing ever
> pretends to move money. The demo history comes from a fixed seed
> through the real engine — no fake rows anywhere. And the desk keeps
> its work order in the open — the next things we're building, on the
> same screen. Every limit is written on the screen, not hidden in a
> footnote."

## 4:45–5:00 — close

**On screen:** the manifest receipt, stamp lands — one last second of the
two agents on the mat.

> "Everyone is building the buyer. Nobody built the desk — or the ghost
> the desk hired. Both sides — every money action explainable, bounded and
> gated, one failure handled in the open — limited, measured, replayable,
> live now at customs dot srivtx dot xyz, and provable to a machine in
> sixty seconds. Customs. Thank you."

---

**Recording notes (simple)**

- Record on the live deployment — customs.srivtx.xyz — so the URL bar is
  evidence, not a localhost claim. If the connection misbehaves, fall
  back to `bun run dev` and say so plainly on camera.
- The ghost needs `YOUTUBE_API_KEY` in the deployment env — confirm the
  crate plays before recording. Have "play africa by toto" typed and
  ready; the summon (wire packet + ghost appearing) is the money shot.
- Reset the demo before recording, so the numbers on screen match the
  numbers in the repo.
- Keep the cursor and your typing visible — watching the steps happen is
  the whole trust story.
- Make the terminal text big enough to read at 720p.
- Do not rush the attack part at 1:05 — it is the heart of the video.
- Hard limit: 5:00. If you run long, cut inside the protocol section —
  never the attack, never the honesty slide, never the ghost.
