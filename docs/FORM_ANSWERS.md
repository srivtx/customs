# The 12 form answers — claim → evidence → command

Pattern for every answer: one verifiable claim, the file that proves it, the
command that regenerates it. No number lives only in this document.

1. **What does your project do?**
   Customs is a two-sided agentic checkout: an agent storefront (chat → cart →
   signed mandate → payment inside bounds) and the merchant desk a payments
   company needs before trusting agent traffic (channel P&L meter, approvals,
   replay, red team). Evidence: `README.md`, `docs/screenshots/`, `make demo`.

2. **Which track?** Track 1 — AI Growth & Agentic Commerce. The product is the
   track's named example ("conversational in-app checkout") plus its unbuilt
   merchant half. Evidence: `README.md`.

3. **What problem does it solve?** Agent checkout arrives with no merchant-side
   trust, cost or audit surface. Evidence: `ARCHITECTURE.md` (problem framing +
   the two-sided diagram), `JUDGE.md` criterion 1.

4. **Why now?** The brief's own why-now: NPCI's UAP and the ACP/AP2/x402
   protocol wave. Our matrix rides the wave without betting on one horse.
   Evidence: `ARCHITECTURE.md` decision 9.

5. **Tech stack?** Next.js 16 (one app, two surfaces) · TypeScript · Node
   crypto (Ed25519, zero third-party deps in the money path) · hash-chained
   JSONL ledger · Tailwind 4 · Razorpay test-mode rails (labeled simulation
   default). Evidence: `AGENTS.md`, `package.json` (deliberately pruned —
   `make verify` check 8).

6. **How does AI power it?** A deterministic rules brain by default (replayable,
   zero-key), an optional metered LLM brain for intent parsing — and the gate
   that decides money is always plain code. The ablation measures the boundary.
   Evidence: `src/lib/customs/agent/`, `results/ablation.json`, `make ablation`.

7. **What did you build on top of?** Razorpay Orders/Checkout/webhooks
   (test-mode code path, keyed off env). Our own prior art is the lineage:
   lockr (escrow → mandate intuition), sortie (trace UI → replay panel), nnn
   (agent runner). Evidence: `JUDGE.md` ("Why this builder").

8. **How do you handle failures/edge cases?** Twelve authored attacks, each
   refused or held with a specific reason code; payment-confirmation replay
   dedupe; price-drift refusal at bind; hash-chain tamper control; a dated
   engineering log where every incident became a test. Evidence:
   `results/conformance_matrix.json` (12/12), `results/audit_chain.json`,
   `ENGINEERING_LOG.md`, `make fuzz`.

9. **What's working end to end?** Live at https://customs.srivtx.xyz: buyer
   chat → mandate → gate → capture → manifest on **real Razorpay test-mode
   rails** (D1-1 spike executed 2026-09-01 — Orders API verified, hosted-
   checkout completion chosen, receipts in the log). Evidence:
   `/api/health` (`rail: razorpay-test, simulated:false`),
   `results/d1_1_spike.json`, `make demo`.

10. **What metrics matter?** Agent GMV ₹60,530 / 13 captures on the
    deterministic ledger; ₹0.03 AI cost per captured payment; at 1M
    payments/month the channel nets ₹9,30,93,000 (formula + labeled
    assumptions). Evidence: `results/cost_meter.json`, `results/project.json`,
    `make meter`, `make project`.

11. **What would you do next?** Flip the rail with test keys (spike ready);
    real MCP/ACP transports behind the existing adapter interface; x402 as the
    declared stretch; mandates backed by real KYC attestation. Evidence:
    `DEPLOY.md`, `ARCHITECTURE.md` decisions 1/9/11.

12. **Anything the judges should know?** The repo is built to be judged by a
    machine: `JUDGE.md` maps claims to files and commands, `make verify` runs
    the same checks as CI with zero dependencies, no number is hand-written,
    no URL ships until it answers 200, and the scope ledger states the limits
    (simulation stays the volume/no-keys fallback, x402 = stretch). Evidence:
    `JUDGE.md`, `make triage`, https://customs.srivtx.xyz/api/health.

*(Adjust wording to the live form's exact fields — the claim/evidence/command
pattern is what carries.)*
