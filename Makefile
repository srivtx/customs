.PHONY: help verify triage demo meter ablation fuzz project spike-d1-1 test

help:
	@echo "targets: verify | triage | demo | meter | ablation | fuzz | project | spike-d1-1 | test"

verify: ## evidence checks — the same ones CI runs on every push
	node scripts/verify.mjs

triage: ## 60-second self-guided judge tour (prints claims, runs checks, exits 0)
	node scripts/triage.mjs

spike-d1-1: ## payment-mechanism spike (needs RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET, test keys only)
	node scripts/spike-d1-1.mjs

demo: ## one-command product demo
	@echo "DEMO: pending - storefront + Customs land Day 1 EOD. Run 'make triage' for current state."

meter: ## regenerate results/cost_meter.json
	@echo "PENDING: measurement harness lands Day 3. Numbers are never hand-written (AGENTS.md invariant 1)."

ablation: ## regenerate results/ablation.json (rules-only vs LLM, same batch)
	@echo "PENDING: ablation harness lands Day 3."

fuzz: ## regenerate results/conformance_matrix.json
	@echo "PENDING: conformance suite lands Day 2-3."

project: ## regenerate results/project.json (channel P&L, explicit assumptions)
	@echo "PENDING: projection harness lands Day 3. Formula + labeled assumptions only."

test: ## run the test suite
	@echo "PENDING: gate test suite lands Day 1 night."
