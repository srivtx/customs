# AGENT_KIT.md — bring your own agent

The counter is not reserved for our buyer. The same HTTP surface the
playground uses is the kit's contract: an outside agent — your harness, a
notebook, a curl loop — speaks plain JSON to one endpoint and clears the
counter like any customer. Every check it passes is visible, every span
lands in the hash-chained ledger, and the reference client in `make kit`
proves the whole walk with no in-repo state.

**Test mode only.** Live keys are refused at construction; the rail runs
Razorpay test mode where keys are set and a loudly-labeled simulation
otherwise. Nothing ever pretends to move real money.

---

## The one endpoint

```http
POST /api/chat
Content-Type: application/json

{ "message": "search earbuds" }
```

| Field | | |
|---|---|---|
| `sessionId` | optional | omit on the first call; the response hands one back. Cart, tier and mandate live server-side under it. |
| `message` | required | the agent's utterance — the protocol is below |
| `adapter` | optional | `naive` (default) · `mcp` · `acp` — the wire format of the turn |
| `tier` | optional | the tier a *new* session starts at: `UNVERIFIED` / `ATTESTED` / `MANDATED` |

The response carries `sessionId`, `cart`, `awaitingMandateApproval`, the
full `events[]` trace of the turn (every tool call, the gate's 10-check
card, the payment, the receipt) and parser-exact `suggestions[]`.

Machine-readable kit: **`GET /api/agent/kit`** — generated from the same
constants the product runs on (`TOOL_SCHEMAS`, `TRUST_TIERS`, rail, brain),
so it cannot drift from the code. This file is its human twin.

## The protocol (messages)

| message | effect |
|---|---|
| `search <query> [under <₹n>]` | catalog search → a `products` event |
| `add <productId> [×n]` | adds to the cart |
| `cart` | echoes the cart with the running total |
| `attest` | raises the trust tier (OTP-bound in production; asserted here) |
| `checkout` | drafts **and signs** a mandate for the cart, then waits |
| `approve` | releases the mandate → gate decides → rail captures |
| `status` | passport: tier, caps, cart, active mandate |
| `attack: <corpus-id>` | red-team: replays an authored attack against the live gate |

Escalation is the session's own act: `attest` walks UNVERIFIED → ATTESTED →
MANDATED (₹500 → ₹5,000 → ₹50,000 caps). Approval is the principal's:
`checkout` drafts an Ed25519-signed mandate over canonical JSON and holds;
`bind_and_pay` refuses without a signed mandate in bounds. **No approval,
no money** — the fuzz corpus pins that.

## Tools (the schemas the buyer agent runs)

The same five schemas serve all three transports (`naive` / `mcp` / `acp`
— protocol-shaped; see `src/lib/customs/adapters/index.ts` and the
ablation for the measured overheads):

- `search_catalog` — `{ query }`
- `get_product` — `{ productId }`
- `add_to_cart` — `{ productId, quantity }`
- `request_mandate` — `{}` (drafts + signs, waits for the principal)
- `bind_and_pay` — `{}` (binds against the mandate and pays)

## The golden path, in curl

```bash
BASE=http://localhost:3000   # or the live deployment

# 1 — open a session and search
curl -s $BASE/api/chat -H 'content-type: application/json' \
  -d '{"message":"search earbuds"}'

# 2 — add the first match (copy its id from the products event)
curl -s $BASE/api/chat -H 'content-type: application/json' \
  -d '{"sessionId":"ses_…","message":"add bud-pro-earbuds"}'

# 3 — raise the tier (₹500 walk-in cap will not cover ₹4,999)
curl -s $BASE/api/chat -H 'content-type: application/json' \
  -d '{"sessionId":"ses_…","message":"attest"}'

# 4 — checkout: mandate comes back signed, pendingApproval: true
curl -s $BASE/api/chat -H 'content-type: application/json' \
  -d '{"sessionId":"ses_…","message":"checkout"}'

# 5 — approve: gate checklist ticks, rail captures, receipt lands
curl -s $BASE/api/chat -H 'content-type: application/json' \
  -d '{"sessionId":"ses_…","message":"approve"}'

# the ledger remembers — and still verifies
curl -s $BASE/api/health
```

## The proof

```bash
make kit          # bun scripts/agent-kit-demo.ts $BASE_URL
```

The reference client imports nothing from `src/` — it is exactly what an
outside agent is. It walks search → add → attest → checkout → approve,
asserts every verdict (gate ALLOW, payment captured, receipt issued, chain
still verifying) and exits non-zero on any deviation. Its output is the
shortest demonstration that the counter is not ours alone.

## Honesty notes

- The buyer agent is still in-house; this kit publishes its surface so
  *yours* can drive it. Real MCP-stdio / ACP wire transports are an
  interface change, pre-logged in `ARCHITECTURE.md` and `ENGINEERING_LOG.md`.
- The gate is deterministic code — your agent's words become tool calls;
  bounds are re-verified server-side at bind time regardless of what the
  agent believes it was promised.
- Integer paise end to end. Floats never touch money; the refusal itself
  is a fuzz case.
