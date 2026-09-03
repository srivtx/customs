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

## The three doors

| door | where | what |
|---|---|---|
| **MCP — real** | `POST /api/mcp` | a true Model Context Protocol server over Streamable HTTP (spec 2025-06-18). Point Claude, Cursor, or the MCP Inspector at it. |
| **plain JSON** | `POST /api/chat` | the playground's own surface — one message in, the whole turn back as events |
| **ACP — core REST** | `POST /api/acp/sessions/{id}` | request → ack → result → receipt signed with the mandate's Ed25519 key |

## Connect an MCP client (the real one)

The server implements the spec, not a sketch: `initialize` (negotiates
`2025-06-18` / `2025-03-26`, assigns an `Mcp-Session-Id`), `tools/list`
(seven tools), `tools/call` (JSON-RPC 2.0; tool results as `content`;
real failures as `isError`), `ping`, session teardown via `DELETE`,
`GET` → 405 (no server-initiated stream). A refusal is an ordinary
result — a refused mandate is the gate working.

```bash
BASE=https://customs.srivtx.xyz   # or localhost:3000

# 1 — initialize (the response carries Mcp-Session-Id)
curl -s $BASE/api/mcp -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",
       "params":{"protocolVersion":"2025-06-18","capabilities":{},
                 "clientInfo":{"name":"my-agent","version":"1"}}}'

# 2 — everything else rides the session header
SID=<Mcp-Session-Id from the response header>

curl -s $BASE/api/mcp -H 'content-type: application/json' \
  -H 'accept: application/json' -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

curl -s $BASE/api/mcp -H 'content-type: application/json' \
  -H 'accept: application/json' -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call",
       "params":{"name":"search_catalog","arguments":{"query":"earbuds"}}}'
```

Two protocol tools ride alongside the five shopping tools, because
consent must cross every transport: `attest_tier` (raise the session's
trust tier) and `approve_mandate` (**ask your human first**). The
invariant is enforced in the tool layer, not the client:
`bind_and_pay` refuses with `MANDATE_NOT_APPROVED` until
`approve_mandate` runs — no transport can route around the principal.

In an MCP host (Claude Desktop, Cursor) add:

```json
{ "mcpServers": { "customs": { "url": "https://customs.srivtx.xyz/api/mcp" } } }
```

## ACP core REST — signed receipts

```bash
# who is out there (includes the Ed25519 public key)
curl -s $BASE/api/acp/agents

# open a session, then speak in envelopes
curl -s -X POST $BASE/api/acp/sessions -H 'content-type: application/json' -d '{}'

curl -s -X POST $BASE/api/acp/sessions/$SID -H 'content-type: application/json' \
  -d '{"tool":"request_mandate","args":{}}'
# → { ack: {ref}, run: {state:"completed"}, body: {value}, receipt: {algorithm:"ed25519", signature, fingerprint} }
```

The receipt signs `sha256(result envelope)` with the same key that signs
mandates — any client can verify it offline against the public key in the
agents descriptor. The build verified this live: digest match +
ed25519 verify = true.

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

The same five schemas serve all three transports — one definition, shared
with the ablation's wire measurement (`src/lib/customs/adapters/index.ts`):

- `search_catalog` — `{ query }`
- `get_product` — `{ productId }`
- `add_to_cart` — `{ productId, quantity }`
- `request_mandate` — `{}` (drafts + signs, waits for the principal)
- `bind_and_pay` — `{}` (binds against the mandate and pays)

MCP and ACP add the two **protocol tools** that carry consent:
`attest_tier` and `approve_mandate` (described above).

## Give your agent its context

The kit page's **copy agent context** button puts one block on your
clipboard — what Customs is, the three doors, the golden path, the rules
that will not bend — ready to paste into any LLM harness. The same block
ships in the machine kit: `GET /api/agent/kit` → `context`.

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
  *yours* can drive it. The transports are real (MCP Streamable HTTP,
  ACP core REST with offline-verifiable receipts); the ablation's
  in-process arms measure the wire shapes separately and remain unchanged.
- The gate is deterministic code — your agent's words become tool calls;
  bounds are re-verified server-side at bind time regardless of what the
  agent believes it was promised.
- Integer paise end to end. Floats never touch money; the refusal itself
  is a fuzz case.
