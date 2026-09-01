# DEPLOY.md — run it, keep it alive, put it on the internet

One document for the whole operating story: what "active" means for Customs,
how to run it locally in under a minute, how to deploy it on a free tier,
how to keep it answering 200 at any hour a judge might click, and what to
check when something looks off. Everything here was executed or verified on
this build; nothing is aspirational.

---

## 0. What "active" means for this product

Customs is built to look alive without lying about what it is. Three things
on the site are live at all times, and one thing deliberately is not:

- **The golden-path player** (landing page) is rendered by the page itself,
  in code — typed chat, tool steps, a tier refusal, a mandate, ten gate
  checks ticking, a capture, a ledger row landing. It is not a recording; it
  re-renders at any resolution, loops, and holds when hovered.
- **The ledger lines and stats** (landing ticker, control room, paper §5–§6)
  are read from the running system's ledger via `/api/state`. When you buy
  something in the playground, those numbers move.
- **The control room** polls the same state every few seconds: the ledger
  table, the filter tabs, the P&L meter, the chain verdict.

What is not live by default: the payment rail (a loudly-labeled simulation
until Razorpay **test** keys are set — the real Orders+Checkout+webhook path
is implemented and `make spike-d1-1` proves it the moment keys exist) and
the LLM brain (optional by design; the deterministic rules brain runs
everything by default so demos replay bit-for-bit).

## 1. Run it locally (60 seconds)

```bash
git clone https://github.com/srivtx/customs.git && cd customs
bun install
bun run dev          # http://localhost:3000
```

Zero environment variables needed — simulation rail, rules brain, full
product. On first boot the runtime seeds a deterministic demo ledger (orders,
approvals, refusals, one attack) so every surface has something honest to
show. The seed is deterministic: same ledger numbers on every fresh boot.

Walk the golden path to make it move: playground → "get me the bud pro
earbuds" → "add 2 to my cart" → the desk refuses (over the ₹500 unverified
envelope) → "attest" → "approve" the mandate → the gate checklist ticks →
capture → the control room's ledger grows by one row and the meter ticks.

Production mode locally:

```bash
bun run build && bun run start   # standalone server, same port
```

## 2. Put it on the internet — Vercel (10 minutes, free)

Primary path: **Vercel hobby tier** — free, and it does not sleep, so the
public URL answers at 3 a.m. without a keep-alive hack.

1. The repo is pushed: `https://github.com/srivtx/customs`.
2. One-click: open
   `https://vercel.com/new/clone?repository-url=https://github.com/srivtx/customs`
   (or vercel.com → Add New → Project → import `srivtx/customs`).
3. Framework preset **Next.js** (auto-detected); build `bun run build`;
   install `bun install`.
4. Environment variables (Settings → Environment Variables) — all optional:

   | Variable | Value | What it flips |
   |---|---|---|
   | `SITE_URL` | `https://customs.srivtx.xyz` | absolute OG/social URLs, server-only (recommended) |
   | `RAZORPAY_KEY_ID` | `rzp_test_…` | rail from labeled simulation → real **test-mode** |
   | `RAZORPAY_KEY_SECRET` | from the Razorpay test dashboard | with the above |
   | `RAZORPAY_WEBHOOK_SECRET` | from webhook settings (§4) | HMAC-verified webhook |
   | `AGENT_BRAIN` | `llm` + one LLM key | LLM brain on (rules brain stays the fallback) |
   | `GROQ_API_KEY` | `gsk_…` (free tier) | fills the ablation's LLM arm at zero cost |
   | `GEMINI_API_KEY` | `AIza…` (free tier) | likewise |
   | `OPENAI_API_KEY` / `XAI_API_KEY` | paid | likewise |
   | `LLM_BASE_URL` + `LLM_MODEL` | any OpenAI-compatible endpoint | advanced override |

   **Live Razorpay keys are refused at construction** — the app hard-fails
   rather than run live money. This is a buildathon demo by rule.
5. Deploy, then check `https://<project>.vercel.app/api/health` →
   `{"ok":true,…,"chainOk":true,…}`. That URL is the one to paste in the
   submission form and in JUDGE.md's deployment line.

### The state story (the honest part)

Vercel's filesystem is read-only except `/tmp`, so the JSONL ledger runs
in-memory per lambda instance and the demo history **re-seeds on cold boot**
— deterministic, same numbers every time, chain always valid. For a
submission demo this is the correct behavior: the store is always stocked
and nothing depends on a database bill. The UI and `/api/health` label the
ephemeral state; the committed `results/` artifacts carry the durable proof.

Persistent state later (post-deadline): point `CUSTOMS_STATE_DIR` at a
Turso/libSQL URL or a Postgres append table — the ledger is one class,
`src/lib/customs/ledger/ledger.ts`, and the decision is pre-logged in
ARCHITECTURE.md.

## 3. Keep it alive / keep it watched

- **Vercel hobby** does not sleep — no keep-warm needed. Every deploy
  re-seeds the demo state, so even a redeploy lands healthy.
- **Uptime watch**: point any monitor (UptimeRobot, Better Stack free tier)
  at `/api/health`. It returns `ok:true` only when the ledger chain
  verifies, so it is a real health check, not a ping.
- **CI is the canary**: every push runs `make verify` on GitHub Actions
  (evidence files, results parse, URL discipline). If the badge is green,
  the repo is coherent.
- **On other hosts** (Render free sleeps after 15 min idle): a 5-minute
  uptime ping masks it, and the deterministic re-seed covers the daily
  recycle. Use `bun run start` with the standalone build.

| Host | Free? | Stays up? | Notes |
|---|---|---|---|
| **Vercel** (hobby) | yes | **yes** | primary path above |
| Render (web service) | yes | no — sleeps when idle; ping it | standalone build, re-seed covers recycles |
| Railway | trial credit | while credit lasts | best DX |
| Fly.io | ≈$3/mo tiny VM | yes | persistent volume possible (real ledger file) |

## 4. Webhooks (only once Razorpay test keys are set)

Razorpay dashboard → Settings → Webhooks → add
`https://<project>.vercel.app/api/hook/webhook`, event `payment.captured`,
paste the secret into `RAZORPAY_WEBHOOK_SECRET`. The route verifies the
HMAC signature and dedupes event ids — a replayed webhook is refused and
logged (`REPLAY_DETECTED`), which is exactly what the fuzz corpus pins.

## 5. Daily operation

| Task | How |
|---|---|
| Check health | `GET /api/health` — `ok`, `chainOk`, `rail`, brain, ledger length |
| Reset the demo to a clean seeded state | `POST /api/reset` (the playground's reset button does this) |
| Re-verify everything from a cold clone | `make verify` (zero deps) → `make test` (fuzz, ablation, audit, ledger-fork) |
| 60-second judge tour | `make triage` |
| Re-read the live numbers | `make meter` / `make project` — regenerate from the ledger |

## 6. When something looks off

- **Stats show `—`**: `/api/state` unreachable or errored — check
  `/api/health` and the browser console; the page itself still renders.
- **Chain verdict broken**: don't ship around it. `make audit` walks the
  chain and pinpoints the sequence number; the D5-1 incident in
  ENGINEERING_LOG.md is the playbook (converging multi-writer appends).
- **Payments always "simulated"**: Razorpay test keys absent or the key id
  does not start with `rzp_test_` — the rail refuses to pretend.
- **LLM brain not engaging**: `AGENT_BRAIN=llm` plus exactly one provider
  key; the rules brain takes over silently otherwise (by design — the demo
  must never depend on an external model).

## 7. After it's live

1. Replace the PENDING deployment line in `JUDGE.md` and `README.md` with
   the URL — CI then checks it answers 200 on every push.
2. Record the 5:00 video against the live URL (VIDEO_TRANSCRIPT.md is the
   script).
3. Paste the submission form from `docs/FORM_ANSWERS.md`.
4. After the deadline: rotate the GitHub PAT (it was shared in chat) per
   CLEANUP.md §3.
