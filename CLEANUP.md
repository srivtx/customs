# CLEANUP.md — the operator's runbook for this repo (post-push)

The repo is **already live at https://github.com/srivtx/customs** (pushed from
the build machine with a fine-grained PAT). This file tells you (or your agent)
exactly what stays, what goes, how to re-push, and how to keep it standing on
the free tier. Follow it top to bottom; every step is a command.

## 0. What exists where

| Thing | Where | State |
|---|---|---|
| Source of truth | the build machine's `repo-out/customs/` + every tar in `download/` | 7 commits (design round on top of v1.1), all green locally |
| Public repo | `https://github.com/srivtx/customs` | `main` pushed, CI: `verify` workflow (3 jobs) |
| Private research | build machine `download/*.md`, `data/`, `scripts/*.py` | **never** in the repo — assembled by allowlist |
| Deploy | `DEPLOY.md` (Vercel primary) | run when ready; JUDGE.md line flips from PENDING |

If you're starting from a tar: `tar xzf customs-repo-<date>.tar.gz && cd customs`.
On the build machine, the whole sync is one command:
`SYNC_PAT=<pat> bash scripts/sync-repo.sh` (allowlist copy → verify → commit →
push → token scan; `COMMIT_MSG` env overrides the message).

## 1. Delete before any re-push from a fresh tree

| Path | Why delete | Command |
|---|---|---|
| `.env` | secrets — never committed, but verify | `rm -f .env` |
| `data/` | runtime state + generated keys, regenerated at boot (gitignored) | `rm -rf data/` |
| `dev.log`, `server.log` | local run logs (gitignored) | `rm -f dev.log server.log` |
| `.zscripts/` | sandbox dev tooling, not part of the repo | `rm -rf .zscripts/` |
| `node_modules/`, `.next/` | rebuildable; never commit | `rm -rf node_modules .next` |

**Nothing inside the repo's tracked tree needs deletion** — research notes,
internal strategy docs, competitor scans and private numbers were never copied
in. The tar and the repo were assembled from an allowlist, not a blacklist.
That is the whole privacy model: check `git ls-files`, not your memory.

## 2. Secret scan (do not skip before every push)

```bash
grep -rnE "rzp_(live|test)_[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{20,}|github_pat_|nowayout|gsk_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,}" \
  --exclude-dir=node_modules --exclude-dir=.next . || echo CLEAN
```

Expect `CLEAN`. Any hit: fix, commit, re-run. (`.env.example` carries only
placeholder `x` runs — fine.) The PAT and the old password must never appear.

## 3. Rotate what was shared in chat (after the deadline, or now if paranoid)

Two credentials were pasted into chat during the build: the account password
and the fine-grained PAT used for the push. Treat both as burned:

1. GitHub → Settings → Password → change it (it was shared, so it's public to
   anyone who saw the chat).
2. GitHub → Developer settings → Fine-grained tokens → **revoke** the push PAT.
3. If you need to push again, mint a new fine-grained PAT scoped to **only
   `customs`**, permission `Contents: Read and write`, expiry short.

## 4. How to push (token method — passwords are dead)

```bash
cd customs
git add -A && git commit -m "…"          # or a proper logical commit
git push https://<user>:<PAT>@github.com/srivtx/customs.git main
# or: git push origin main               # origin is already set, no token stored
git remote -v                            # must show the clean URL, no token
```

`git remote -v` must print `https://github.com/srivtx/customs.git` — no token
in the URL, no token in `.git/config`, no token in any file. If a token ever
lands in a URL, `git remote set-url origin https://github.com/srivtx/customs.git`.

After each push: confirm the **Actions tab goes green** (verify workflow:
zero-dep evidence → bun harnesses → lint+build, a few minutes). Fix nothing
unless it's red — the tree was verified green before every push so far.

## 5. Deploy (free tier that stays up)

Follow `DEPLOY.md`. The one-liner:

```
https://vercel.com/new/clone?repository-url=https://github.com/srivtx/customs
```

Vercel Hobby = always awake, zero cost, perfect for a judge clicking at 11pm.
Add env vars in the Vercel dashboard (all optional — the app runs fully on the
labeled simulation rail with zero keys): Razorpay test keys + webhook secret,
any one LLM key (`GROQ_API_KEY` / `GEMINI_API_KEY` have free tiers) with
`AGENT_BRAIN=llm`, and `NEXT_PUBLIC_SITE_URL=https://<your-app>.vercel.app`
(for correct OG image URLs). After it answers 200:

1. `JUDGE.md`: replace the "Live deployment: PENDING" line with the URL.
2. `README.md` + `docs/FORM_ANSWERS.md`: add the live link.
3. Commit + push — CI's URL discipline checks the link from then on.

## 6. Before you submit (the last mile)

- Record the 5:00 video per `VIDEO_TRANSCRIPT.md` (reset the demo first:
  `curl -X POST <live-url>/api/reset`).
- Refresh `docs/screenshots/` if the UI changed (landing, playground,
  control-room — the README embeds them).
- Razorpay test keys set → run `make spike-d1-1` → the D1-1 log entry flips
  from `blocked-no-keys` to the measured verdict, and the rail goes live-test.
- Paste the form answers from `docs/FORM_ANSWERS.md` (claim → evidence file →
  regenerate command, every line).
- Final sweep: `make verify && make triage` — both green, then submit.

## What NOT to do

- Do **not** rewrite history to hide iteration — the dated commits are part of
  the story ("your code speaks louder than your resume").
- Do **not** edit any file under `results/` by hand — regeneration only.
- Do **not** add a live Razorpay key; the app refuses them at construction and
  so should you.
- Do **not** delete `ENGINEERING_LOG.md` entries — the incidents (D1-1 … D6-1)
  are the honesty artifact.
- Do **not** let `PAPER.md` and the paper view drift apart — they are twins
  (AGENTS.md invariant 11); edit both or neither.
- Do **not** commit `.env`, `data/`, or any tar of the workspace — the repo's
  whole credibility is that the private layer never leaks.
