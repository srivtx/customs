# Video transcript — the 5:00 pitch (plain-English version)

Same beats as before, but the spoken lines are plain and simple — short
sentences, no jargon without a quick explanation. Read it like you talk.
Timestamps are beats, not hard cuts. One take, screen + voice. The first
10 seconds carry the whole idea.

## 0:00–0:20 — the big idea

**On screen:** the landing page, hero stamp.

> "AI agents are starting to shop and pay on their own. Almost everyone is
> building the buying side. Almost nobody is building the selling side —
> the part a payments company needs before it lets a robot spend money.
> We built both sides, in one project. It's called Customs."

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

## 1:50–2:35 — the merchant side

**On screen:** Control Room. The P&L meter counting up.

> "Now walk around the counter. This is the merchant's room — what the
> shop, and honestly what Razorpay, would want to see. How much agents
> are selling. What it costs to serve them. What is left as profit.
> Live. At one million payments a month, this channel earns real money
> — and every number here can be re-made with one command. Nothing was
> typed in by hand."

**On screen:** approval queue → approve the ₹18,999 hold.

> "One more rule. Any order above ten thousand rupees waits for a human.
> I approve this one — it completes, step by step, right in front of
> you."

## 2:35–3:20 — works with any agent protocol

**On screen:** adapter switcher → MCP-style → wire chip expands.

> "Agent systems speak different languages — direct calls, MCP, ACP. Our
> gate does not care. The same checks sit behind all three. We measured
> all three: same decisions, different message sizes — and we published
> the byte cost. If a new standard wins, we swap the transport. We do
> not rewrite the product."

## 3:20–4:05 — built to be checked by a machine

**On screen:** terminal — `make triage` scrolling.

> "Thousands of projects will be judged. Many will be checked by a
> machine first. So we built this repo to be checked by a machine. One
> file maps every claim to a file and a command. One command — `make
> verify` — checks the whole repo with plain node, no setup. No number
> was typed by a human. No link ships unless it works. And every bug we
> ever hit became a test — forever."

## 4:05–4:45 — labeled, and what's next (honesty slide)

**On screen:** the desk ledger, one patch at a time.

> "Now, how we label things — said plainly. The desk runs on real
> Razorpay test-mode rails — test keys only, and the health endpoint
> proves it on every boot. On a fresh clone with no keys, the rail
> degrades to a clearly labeled simulation — nothing ever pretends to
> move money. The demo history comes from a fixed seed through the real
> engine — no fake rows anywhere. And the desk keeps its work order in
> the open — the next four things we're building, on the same screen.
> Every limit is written on the screen, not hidden in a footnote."

## 4:45–5:00 — close

**On screen:** the manifest receipt, stamp lands.

> "Everyone is building the buyer. Nobody built the desk. Both sides —
> limited, measured, replayable — and provable to a machine in sixty
> seconds. Customs. Thank you."

---

**Recording notes (simple)**

- Reset the demo before recording, so the numbers on screen match the
  numbers in the repo.
- Keep the cursor and your typing visible — watching the steps happen is
  the whole trust story.
- Make the terminal text big enough to read at 720p.
- Do not rush the attack part at 1:05 — it is the heart of the video.
- Hard limit: 5:00. If you run long, cut inside the protocol section —
  never the attack, never the honesty slide.
