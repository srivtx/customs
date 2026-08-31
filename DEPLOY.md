# DEPLOY.md — free-tier deployment that stays up

Goal: a public URL that answers 200 at any hour a judge might click it, on a
free plan, with the honest-state story intact. Primary path: **Vercel**.

## Why Vercel (primary)

- Hobby tier is free and **never sleeps** — no 50-second cold starts like
  Render's free dynos.
- Zero-config Next.js: `bun install` + `bun run build` detected automatically
  (bun.lockb present).
- Custom domain / stable `*.vercel.app` URL for the submission form.
- Per-function timeouts are fine for our route handlers (the agent turn is a
  single-digit-ms gate + one fetch, when the LLM brain is off — which is the
  default and the deterministic-brain demo mode).

## Steps (10 minutes)

1. Push the repo to GitHub first (see `CLEANUP.md`).
2. vercel.com → Add New → Project → import the repo.
3. Framework preset: **Next.js** (auto). Build command: `bun run build`.
   Install command: auto (`bun install`).
4. Environment variables (Project → Settings → Environment Variables):

   | Variable | Value | Required |
   |---|---|---|
   | `RAZORPAY_KEY_ID` | `rzp_test_…` | optional — flips the rail to real test-mode |
   | `RAZORPAY_KEY_SECRET` | from the Razorpay test dashboard | with the above |
   | `RAZORPAY_WEBHOOK_SECRET` | from webhook settings (below) | optional |
   | `AGENT_BRAIN` | `ll` + `OPENAI_API_KEY` | optional — LLM brain |

   Everything else works with **zero variables**: simulation rail, rules brain.
5. Deploy. Verify: `https://<project>.vercel.app/api/health` →
   `{"ok":true,"rail":…,"chainOk":true,…}`.

## The state story (read this — it's the honest part)

Vercel's filesystem is read-only except `/tmp`, so the JSONL ledger runs
in-memory per lambda instance and **the demo history re-seeds on cold boot**
(deterministic — same numbers every time). The UI and `/api/health` flag the
ephemeral state; the committed `results/` artifacts carry the durable proof.
For a submission demo this is correct behavior: the store is always stocked,
the chain is always valid, and nothing depends on a database bill.

If you want persistent state later (post-deadline): swap `CUSTOMS_STATE_DIR`
to a Turso/libSQL URL or a Postgres append table — the ledger interface is one
class, `src/lib/customs/ledger/ledger.ts`, and the decision is pre-logged in
`ARCHITECTURE.md`.

## Webhooks (only with Razorpay test keys)

Dashboard → Settings → Webhooks → add:
`https://<project>.vercel.app/api/hook/webhook`, event `payment.captured`,
and paste the secret into `RAZORPAY_WEBHOOK_SECRET`. The route verifies the
HMAC signature and dedupes event ids — a replayed webhook is refused and
logged (`REPLAY_DETECTED`).

## Alternates (if you must)

| Host | Free? | Stays up? | Notes |
|---|---|---|---|
| **Vercel** | yes (hobby) | **yes** | primary path above |
| Render (web service) | yes | no — sleeps after 15 min idle; ping every 5 min with UptimeRobot to mask it (still recycles daily; the re-seed covers you) | uses `bun run start` with the standalone build |
| Railway | $5 trial credit | while credit lasts | best DX, not forever-free |
| Fly.io | pay-as-you-go (≈$3/mo tiny VM) | yes | persistent volume possible |

## After it's live

1. Replace the PENDING deployment line in `JUDGE.md`/`README.md` with the URL.
2. CI now checks the link answers 200 on every push (verify's URL discipline).
3. Optional: attach a custom domain in Vercel settings.
