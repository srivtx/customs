.PHONY: help verify triage demo meter ablation fuzz project audit spike-d1-1 test all install

BUN := $(shell command -v bun 2>/dev/null)
RUNNER := $(if $(BUN),bun,npx tsx)

help:
	@echo "customs — targets"
	@echo "  verify       evidence checks (CI entry, zero deps — node only)"
	@echo "  triage       60-second self-guided judge tour"
	@echo "  fuzz         attack corpus vs the production gate → results/conformance_matrix.json"
	@echo "  ablation     same batch × three protocols → results/ablation.json"
	@echo "  meter        channel P&L over the deterministic ledger → results/cost_meter.json"
	@echo "  project      at-1M projection, assumptions declared → results/project.json"
	@echo "  audit        hash-chain walk + tamper control → results/audit_chain.json"
	@echo "  test         fuzz + ablation + audit (exit codes propagate)"
	@echo "  all          every harness, then verify"
	@echo "  demo         how to run the product locally"
	@echo "  spike-d1-1   payment-mechanism spike (needs Razorpay test keys)"

verify: ## evidence checks — the same ones CI runs on every push
	node scripts/verify.mjs

triage: ## 60-second self-guided judge tour (prints claims, runs checks, exits 0)
	node scripts/triage.mjs

spike-d1-1: ## payment-mechanism spike (needs RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET, test keys only)
	node scripts/spike-d1-1.mjs

fuzz: ## regenerate results/conformance_matrix.json
	$(RUNNER) scripts/fuzz.ts

ablation: ## regenerate results/ablation.json (protocol arms; LLM arm needs any one LLM key)
	$(RUNNER) scripts/ablation.ts

meter: ## regenerate results/cost_meter.json
	$(RUNNER) scripts/meter.ts

project: ## regenerate results/project.json (channel P&L at 1M payments/month)
	$(RUNNER) scripts/project.ts

audit: ## regenerate results/audit_chain.json (hash-chain walk + tamper control)
	$(RUNNER) scripts/audit.ts

test: ## the harness suite — exit codes propagate
	@if command -v bun >/dev/null 2>&1; then bun test tests/; else echo "skip: unit tests need bun"; fi
	$(RUNNER) scripts/fuzz.ts
	$(RUNNER) scripts/ablation.ts
	$(RUNNER) scripts/audit.ts

all: ## every harness, then the evidence checks
	$(RUNNER) scripts/fuzz.ts
	$(RUNNER) scripts/ablation.ts
	$(RUNNER) scripts/meter.ts
	$(RUNNER) scripts/project.ts
	$(RUNNER) scripts/audit.ts
	node scripts/verify.mjs

install: ## install dependencies (bun preferred; npm works too)
	$(if $(BUN),bun install,npm install)

demo: ## one-command product demo
	@echo "── customs · demo ──────────────────────────────────────────"
	@echo "1) $(if $(BUN),bun install,npm install)     (first run only)"
	@echo "2) $(if $(BUN),bun run dev,npm run dev)       → http://localhost:3000"
	@echo "3) the app seeds a deterministic 48h ledger on first boot."
	@echo "   Playground: 'search headphones under 5000' → add → checkout."
	@echo "   Over the tier cap? 'attest' to escalate, then checkout."
	@echo "   Red team: any 'attack: <id>' from the right rail."
	@echo "   Control Room: approvals over ₹10,000, replay, ablation."
	@echo "No keys needed — captures are labeled SIMULATED until Razorpay"
	@echo "test keys are set in .env (see .env.example)."
	@echo "───────────────────────────────────────────────────────────"
