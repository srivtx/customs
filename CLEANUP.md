# CLEANUP.md — the operator's runbook before this repo goes public

You (or your agent) downloaded the `customs` tar, and you're about to push it
to GitHub and deploy it. This file tells you exactly what to delete, what to
check, and in what order. Follow it top to bottom; every step is a command.

## 0. What you received

A tar of the Customs repo **including `.git` history** (the skeleton commits +
the full build). The working tree is the deliverable; nothing else is needed.

```bash
tar xzf customs-repo-<date>.tar.gz
cd customs
git log --oneline        # you should see the whole story
```

## 1. Delete before the first push

| Path | Why delete | Command |
|---|---|---|
| `.env` (if you created one) | secrets — never committed, but verify | `rm -f .env` |
| `data/` | runtime state + test-only keys, regenerated at boot (already gitignored) | `rm -rf data/` |
| `dev.log`, `server.log` | local run logs (gitignored already) | `rm -f dev.log server.log` |
| `.zscripts/` | sandbox dev tooling, not part of the repo | `rm -rf .zscripts/` |
| `node_modules/`, `.next/` | rebuildable; never commit | `rm -rf node_modules .next` |

**Nothing inside the repo's tracked tree needs deletion** — research notes,
internal strategy docs and scan data were never copied in. The tar was
assembled from an allowlist, not a blacklist.

## 2. Secret scan (do not skip)

```bash
# no keys, no tokens, no passwords anywhere in what you're about to push:
grep -rnE "rzp_(live|test)_[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{20,}|nowayout|password" \
  --exclude-dir=node_modules --exclude-dir=.next . || echo CLEAN
```

Expect `CLEAN`. Any hit: fix, re-commit, re-run. (`.env.example` contains only
placeholder `x` runs — that's fine.)

## 3. Rotate anything shared in chat

If any credential was ever pasted into a chat (including the GitHub password
used while getting this repo online), rotate it now:
GitHub → Settings → Password / Developer settings → fine-grained PATs.
Use a **fine-grained PAT scoped to this one repo** for pushes from machines
you don't fully control. Do not reuse that password anywhere.

## 4. Create the GitHub repo and push

```bash
# on github.com: New repository → name: customs → Public → do NOT init with README
git remote add origin https://github.com/<you>/customs.git
git push -u origin main
```

Then confirm Actions goes green (the `verify` workflow runs three jobs:
zero-dep evidence, harnesses, lint+build — a few minutes).
Fix nothing unless it's red: the repo was verified green before tarring.

## 5. Deploy

Follow `DEPLOY.md` (Vercel is the primary path — free tier, never sleeps).
After the deploy answers 200:

1. In `JUDGE.md`, replace the "Live deployment: PENDING" line with the URL.
2. In `README.md` (and the form answers), add the live link.
3. Commit — CI's URL discipline will check the link answers 200 from then on.

## 6. Optional (only if time before the deadline)

- Record the 5:00 video per `VIDEO_TRANSCRIPT.md` (reset demo first).
- Set Razorpay test keys in the host's env, run `make spike-d1-1`, and let the
  D1-1 log entry flip from `blocked-no-keys` to the measured verdict.
- Paste the final form answers from `docs/FORM_ANSWERS.md`.

## What NOT to do

- Do **not** rewrite history to hide iteration — the dated commits are part of
  the story ("your code speaks louder than your resume").
- Do **not** edit any file under `results/` by hand — regeneration only.
- Do **not** add a live Razorpay key; the app refuses them at construction and
  so should you.
- Do **not** delete `ENGINEERING_LOG.md` entries — the incidents are the
  honesty artifact.
