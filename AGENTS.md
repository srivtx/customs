# AGENTS.md — how to work in this repo

Working guide for coding agents (and humans). This repo is built agent-first and judged
agent-first: the evidence layer is a product surface, not documentation garnish.

## Stack (locked)

One Next.js 16 app (App Router, one route, view-switched) · TypeScript throughout ·
Node runtime for the gate (node:crypto, zero third-party deps in the money path) ·
hash-chained JSONL ledger (no ORM — the audit trail IS the database) · Tailwind CSS 4 ·
framer-motion for the few animations that earn their bytes · bun as the runner
(npm works too) · Razorpay test-mode rails behind env keys (labeled simulation
default).

## Commands

```bash
bun install            # or npm install
bun run dev            # the product → http://localhost:3000 (auto-seeds on boot)
bun run lint           # eslint
bun run typecheck      # tsc --noEmit

make verify            # evidence checks (CI entry) — zero deps, node only
make triage            # 60-second self-guided judge tour
make fuzz              # attack corpus → results/conformance_matrix.json
make ablation          # same batch × three protocols → results/ablation.json
make meter             # channel P&L → results/cost_meter.json
make project           # at-1M projection → results/project.json
make audit             # hash-chain walk + tamper control → results/audit_chain.json
make test              # fuzz + ablation + audit, exit codes propagate
make spike-d1-1        # payment-mechanism spike (needs RAZORPAY test keys)
```

`make verify` is zero-dependency (plain node) — a judge needs nothing installed
to check the repo's claims. The harnesses run the real engine, so they need one
`bun install` (or `npx tsx`).

## Invariants (violating any of these is a build failure of trust)

1. **Numbers enter `results/` only through regeneration scripts.** Never hand-edit a
   measured value. If a number is not measured yet, its status is `pending`.
2. **Zero competitor-specific numbers** in README / JUDGE.md / form answers / video.
   Not even flattering ones. Cite prior art qualitatively.
3. **No URL ships unless live.** CI checks every external link; a placeholder link is a
   build failure, not a README blemish.
4. **Money is integer paise.** Floats never touch financial arithmetic — canonical JSON
   refuses them, and the refusal is a fuzz case.
5. **Gate logic is deterministic code, never an LLM.** LLM earns its fee on intent
   parsing only — and the ablation must prove where.
6. **Mandates**: canonical JSON (sorted keys, no whitespace), Ed25519 signature,
   bounds re-verified server-side at bind time.
7. **Every incident → an ENGINEERING_LOG.md entry → a test.** If it broke once, it is
   a test case forever.
8. **Live keys refused at construction.** Test keys (`rzp_test_`) only.
9. **The README file map must match the actual tree** — `make verify` checks it.
10. **Anything PENDING says PENDING.** Never estimate, never round, never ship a vibe.
11. **PAPER.md and the in-app paper view are twins.** Edit both or neither; the page
   reads its §5–§6 numbers live from the ledger, the file cites regeneration
   commands — neither hand-writes a measured number. The Why page's desk
   ledger follows the same rule: it states what shipped, what is simulated,
   and the work order for what comes next — and stays true.

## How to add things

- **A protocol adapter**: implement the transport in
  `src/lib/customs/adapters/index.ts` following the MCP/ACP pattern (same tool
  schemas, logged wire), add its wire-overhead accounting to the ablation, and
  add corpus cases for anything it changes.
- **Any UI**: read `docs/DESIGN_SYSTEM.md` first — it is the design contract
  (tokens, type scale, motion rules, the bot's containment law). Match tokens,
  never hardcode colors; mono for machine output, sans for human words; one
  hairline, no shadows on panels; motion is transform/opacity only, with the
  SMIL-paint exception for ambient gradients. If the change contradicts the
  contract, fix the contract or fix the change — never both silently.
- **A fuzz case**: one entry in `src/lib/customs/fuzz/corpus.ts` — deterministic
  input, expected verdict (refuse + reason code), then `make fuzz`. Corpus design
  rule: attacks on legitimately-issued mandates keep valid signatures so the
  intended bound fires; only the tampering case mutates bytes after signing.
- **A measured number**: write the harness in `scripts/`, make it emit
  `results/<name>.json` with a `status` and a `regenerate` command, then
  reference the file from JUDGE.md. The number does not exist until the script
  produces it.
- **A catalog product**: one entry in `src/lib/customs/store/catalog.ts`
  (integer paise, image under `public/products/`). Price points are chosen to
  exercise tier boundaries — keep at least one item under ₹500.

## State & determinism

- `data/state/` (gitignored) holds the live ledger and test-only Ed25519 keys;
  both are generated at first boot. The seed history is deterministic (fixed
  clock, fixed RNG, fixed catalog) so meter numbers regenerate identically;
  ledger ids/hashes differ per machine — never cite them.
- Ephemeral runtimes (serverless, read-only FS) run in-memory and are flagged
  in the UI and `/api/health`. Honesty about state is part of the design.
