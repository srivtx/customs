/**
 * The agent loop — one chat turn, end to end, with every tool call visible.
 *
 * Transparency is the product: each turn emits a step-by-step trace the UI
 * renders inline (intent → tool calls with wire formats → gate checklist →
 * rail), the same spans land in the ledger, and the Control Room can replay
 * the whole thing span-by-span. Nothing the agent does is invisible.
 */
import { randomUUID, createHmac } from "node:crypto";
import { CustomsRuntime, BuyerSession } from "../runtime";
import { parseIntent, Intent } from "./nlu";
import { adapterCall, AdapterId, ADAPTERS } from "../adapters";
import { getLlmBrain, brainMode, getChatVoice, COCO_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from "./llm";
import { Product, searchCatalog, parsePriceCeiling } from "../store/catalog";
import { GateDecision, TrustTier, TRUST_TIERS, Mandate } from "../gate/types";
import { signMandate, buildMandateBody } from "../gate/mandate";
import { runTransaction, newSpan } from "../engine";
import { ATTACK_CORPUS, AttackCase, attackTxInput } from "../fuzz/corpus";
import { railInfo } from "../payments";
import { searchTracks, Track } from "../music/youtube";
import { MusicAction } from "../music/brain";

export type ChatEvent =
  | { id: string; ts: number; role: "agent" | "user"; text: string }
  | { id: string; ts: number; kind: "step"; tool: string; adapter: AdapterId; summary: string; detail: string; ms: number }
  | { id: string; ts: number; kind: "products"; products: Product[]; note: string | null }
  | { id: string; ts: number; kind: "cart"; lines: { productId: string; name: string; quantity: number; unitPricePaise: number }[]; totalPaise: number }
  | { id: string; ts: number; kind: "mandate"; mandate: MandateView; pendingApproval: boolean }
  | { id: string; ts: number; kind: "gate"; orderId: string; decision: GateDecision; adapter: AdapterId }
  | { id: string; ts: number; kind: "payment"; orderId: string; totalPaise: number; status: "captured" | "held" | "refused"; rail: string; simulated: boolean }
  | { id: string; ts: number; kind: "receipt"; orderId: string; manifestNo: string; lines: { name: string; quantity: number; unitPricePaise: number }[]; totalPaise: number; rail: string; simulated: boolean }
  | { id: string; ts: number; kind: "attack"; attackId: string; label: string; verdict: string; code: string | null; checks: { label: string; pass: boolean | null; detail: string }[] }
  | { id: string; ts: number; kind: "tier"; tier: TrustTier; note: string }
  | { id: string; ts: number; kind: "music"; action: MusicAction; tracks: Track[]; query: string | null; mood: string | null; note: string | null };

export interface MandateView {
  id: string;
  tier: TrustTier;
  amountCapPaise: number;
  items: { productId: string; name: string; quantity: number; unitPricePaise: number }[];
  expiresAtMs: number;
  humanApproved: boolean;
  fingerprint: string;
  signature: string;
}

let eventCounter = 0;
const eid = () => `ev_${(eventCounter += 1).toString(36)}`;

export function newSession(rt: CustomsRuntime, tier: TrustTier = "UNVERIFIED"): BuyerSession {
  const sessionId = `ses_${randomUUID().slice(0, 8)}`;
  const session: BuyerSession = {
    sessionId,
    buyerId: `buyer-${sessionId.slice(-6)}`,
    tier,
    cart: new Map(),
    mandate: null,
    awaitingMandateApproval: false,
    lastOrderId: null,
    createdAtMs: Date.now(),
  };
  rt.sessions.set(sessionId, session);
  rt.ledger.append("session.opened", { sessionId, buyerId: session.buyerId, tier, adapter: null });
  return session;
}

export interface TurnResult {
  events: ChatEvent[];
  session: BuyerSession;
  needCheckoutRefresh: boolean;
  suggestions: Suggestion[];
}

export interface Suggestion {
  label: string;
  value: string;
}

/**
 * The next one-tap replies, derived from the session's final state — the
 * counter should never leave a human wondering what to type next (D5-2's
 * lesson: "attested" worked, but nobody knew to say "checkout" again).
 * Labels speak human ("Raise limit"); payloads stay parser-exact ("attest").
 * Pure function of (cart, tier, approval state) so it is unit-testable.
 */
export function suggestionsFor(
  lines: { quantity: number; unitPricePaise: number }[],
  tier: TrustTier,
  awaitingApproval: boolean,
  found?: { id: string; name: string } | null
): Suggestion[] {
  if (awaitingApproval && lines.length) return [{ label: "Approve", value: "approve" }];
  if (lines.length) {
    const total = lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
    return total > TRUST_TIERS[tier].maxAmountPaise
      ? [{ label: "Raise limit", value: "attest" }]
      : [{ label: "Checkout", value: "checkout" }];
  }
  if (found) return [{ label: `Add ${found.name}`, value: `add ${found.id}` }];
  return [{ label: "Keep browsing", value: "search audio" }];
}

export async function agentTurn(
  rt: CustomsRuntime,
  sessionId: string,
  message: string,
  adapter: AdapterId,
  opts?: {
    sessionless?: boolean;
    persona?: "desk" | "coco";
    /* what the ghost hums, published by the client — chatter context
       only, never the money path; commands stay on the rules brain */
    music?: { title: string; channel: string; playing: boolean } | null;
  }
): Promise<TurnResult> {
  const events: ChatEvent[] = [];
  const say = (text: string) => events.push({ id: eid(), ts: Date.now(), role: "agent", text });
  let firstMatch: { id: string; name: string } | null = null;
  const session = opts?.sessionless
    ? { sessionId: "ses_adhoc", buyerId: "buyer-adhoc", tier: "UNVERIFIED" as TrustTier, cart: new Map<string, number>(), mandate: null, awaitingMandateApproval: false, lastOrderId: null, createdAtMs: Date.now() }
    : rt.sessions.get(sessionId) ?? newSession(rt);
  const now = () => Date.now();

  events.push({ id: eid(), ts: now(), role: "user", text: message });

  // LLM brain (optional): parse intent via model, fall back to rules.
  // Music never reaches the model — the rules brain owns it entirely,
  // so summoning the ghost costs zero tokens (D7).
  let intent: Intent = parseIntent(message);
  let tokensIn = 0;
  let tokensOut = 0;
  const llm = brainMode() === "llm" && intent.kind !== "music" ? getLlmBrain() : null;
  /* the companion voice — independent of AGENT_BRAIN: any provider key
     unlocks it, because casual chat is not the demo-critical intent path */
  const voice = getChatVoice();
  /* the voice: two personas on the same cheap model — moco talks desk,
     coco talks ghost. Commands never reach here; this is chatter only,
     metered like everything else. */
  const cocoPersona = opts?.persona === "coco";
  /* one line of music context, appended to the persona prompt: with it
     the cheap voice understands ANY phrasing of "what's playing" —
     ~40 tokens, metered, and no state machine guessing English */
  const musicLine = opts?.music
    ? `Desk music right now: "${opts.music.title}" by ${opts.music.channel}, ${opts.music.playing ? "playing" : "paused"}. If asked about the music, answer from this line and nothing else — two short sentences, all lowercase.`
    : "";
  const speakThroughVoice = async (message: string, fallback: string) => {
    if (!voice) {
      say(fallback);
      return;
    }
    const t0 = performance.now();
    const system = cocoPersona || musicLine
      ? `${cocoPersona ? COCO_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT}${musicLine ? `\n\n${musicLine}` : ""}`
      : undefined;
    const { reply, usage, model } = await voice.chat(message, system);
    newSpan(rt.deps, `tr_ses_${session.sessionId}`, session.lastOrderId ?? "none", "llm.chat", Math.round(performance.now() - t0), adapter, {
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      model,
    });
    say(reply || fallback);
  };
  if (llm) {
    const t0 = performance.now();
    const { intent: parsed, usage } = await llm.parseIntent(message);
    tokensIn = usage.tokensIn;
    tokensOut = usage.tokensOut;
    if (parsed) intent = llmToIntent(parsed, message);
    newSpan(rt.deps, `tr_ses_${session.sessionId}`, session.lastOrderId ?? "none", "llm.parseIntent", Math.round(performance.now() - t0), adapter, { tokensIn, tokensOut, model: llm.name });
  }

  // adapter transport context: tools are injected, wire is logged
  const toolLog: { name: string; ms: number; wire: { dir: string; bytes: number; body: string }[] }[] = [];
  const callTool = async (name: string, args: Record<string, unknown>) => {
    const t0 = performance.now();
    const value = await executeTool(rt, session, name, args, events, say, adapter);
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const est = Math.ceil(JSON.stringify({ name, args }).length / 4) + Math.ceil(JSON.stringify(value ?? "").length / 4);
    newSpan(rt.deps, `tr_ses_${session.sessionId}`, session.lastOrderId ?? "none", `tool:${name}`, ms, adapter, {
      tokensIn: tokensIn > 0 ? 0 : Math.ceil(JSON.stringify(args).length / 4),
      tokensOut: tokensIn > 0 ? tokensOut : est,
    });
    return value;
  };
  const signCtx = (payload: string) => createHmac("sha256", rt.keys.fingerprint).update(payload).digest("hex").slice(0, 32);

  /* coco is not a shopping agent: shopping intents typed to coco are
     honestly deflected to moco — one line, zero tokens */
  const cocoShopping =
    cocoPersona &&
    intent.kind !== "music" &&
    intent.kind !== "greeting" &&
    intent.kind !== "unknown" &&
    intent.kind !== "help" &&
    intent.kind !== "status";

  if (cocoShopping) {
    say(`that's moco's desk — tell the black head.`);
  } else
  switch (intent.kind) {
    case "greeting": {
      /* a greeting is casual speech — when the cheap voice is available it
         answers like a person; without a key, the canned desk-open line */
      await speakThroughVoice(
        message,
        cocoPersona
          ? "hey — coco here. say \u201cplay\u201d with a song, or ask me anything."
          : `Customs desk, open. I'm **moco**, your buying agent for Fieldnote Supply — ${rt.catalog.byId.size} items in the catalog. ` +
          `Tell me what you need ("noise cancelling headphones under ₹5,000") and I'll search, build a cart, and ask the desk for a bounded mandate. ` +
          `Your trust tier is **${TRUST_TIERS[session.tier].label}** (${TRUST_TIERS[session.tier].blurb}).`
      );
      break;
    }
    case "help": {
      say(
        `I can: **search** (" ANC headphones under 3k"), **add** ("add the ridge mouse"), **cart**, ` +
          `**checkout** (requests a signed mandate and pays within its bounds), **status**. ` +
          `The desk can also red-team itself: type "attack: overspend-tier" or use the Red Team panel. ` +
          `Escalation: type "attest" to raise your trust tier.`
      );
      break;
    }
    case "status": {
      const lines = cartLines(rt, session);
      say(
        `Passport: **${TRUST_TIERS[session.tier].label}** — cap ${rupees(TRUST_TIERS[session.tier].maxAmountPaise)} per transaction, ` +
          `${TRUST_TIERS[session.tier].maxItems} item(s). Cart: ${lines.length ? lines.map((l) => `${l.name} ×${l.quantity}`).join(", ") : "empty"}. ` +
          (session.mandate ? `Mandate ${session.mandate.id} active until ${new Date(session.mandate.expiresAtMs).toLocaleTimeString("en-IN")}.` : `No active mandate.`)
      );
      break;
    }
    case "attest": {
      const next: TrustTier = session.tier === "UNVERIFIED" ? "ATTESTED" : "MANDATED";
      if (session.tier === "MANDATED") {
        say(`You already hold the highest tier — ${TRUST_TIERS.MANDATED.blurb}`);
        break;
      }
      session.tier = next;
      rt.ledger.append("tier.raised", { sessionId: session.sessionId, buyerId: session.buyerId, to: next, via: "attest (OTP-bound in production)" });
      const t = TRUST_TIERS[next];
      events.push({ id: eid(), ts: now(), kind: "tier", tier: next, note: `${rupees(t.maxAmountPaise)} cap · ${t.maxItems} item${t.maxItems > 1 ? "s" : ""} · ${Math.round(t.mandateTtlMs / 60000)} min` });
      say(next === "ATTESTED" ? "You're verified." : "Standing mandate — the highest limits.");
      break;
    }
    case "music": {
      if (intent.action === "play") {
        const query = intent.query ?? "chill lofi beats mix";
        const res = await searchTracks(query);
        if (res.error === "no-key") {
          events.push({ id: eid(), ts: now(), kind: "music", action: "play", tracks: [], query, mood: intent.mood, note: "no-key" });
          say(`The ghost can't reach the record crate — no YouTube key on the desk. Add YOUTUBE_API_KEY to .env and summon again.`);
          break;
        }
        if (res.error || !res.tracks.length) {
          say(`Nothing surfaced for that — try another name.`);
          break;
        }
        events.push({ id: eid(), ts: now(), kind: "music", action: "play", tracks: res.tracks, query, mood: intent.mood, note: null });
        say(
          `The ghost takes it from here — **${res.tracks[0].title}**, ${res.tracks[0].channel}.` +
            (intent.mood ? ` (${intent.mood} mood)` : ``)
        );
        break;
      }
      events.push({ id: eid(), ts: now(), kind: "music", action: intent.action, tracks: [], query: null, mood: null, note: null });
      say(`Relayed to the ghost.`);
      break;
    }
    case "search": {
      // the ceiling rides with the intent — the cleaned query no longer
      // carries "under 5,000", so re-parsing it from text would lose it
      const res = await runTool("search_catalog", { query: intent.query, maxPricePaise: intent.maxPricePaise }, "Searched the catalog");
      firstMatch = Array.isArray(res) && res[0]?.id ? { id: String(res[0].id), name: String(res[0].name) } : null;
      break;
    }
    case "add": {
      if (!intent.productId) {
        say(`I couldn't find "${intent.query}" in the catalog. Try "search <what you need>" first.`);
        break;
      }
      await runTool("add_to_cart", { productId: intent.productId, quantity: intent.quantity }, "Added to cart");
      break;
    }
    case "remove": {
      session.cart.delete(intent.productId);
      const lines = cartLines(rt, session);
      events.push({ id: eid(), ts: now(), kind: "cart", lines, totalPaise: lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0) });
      say(`Removed. The cart now holds ${lines.length} line(s).`);
      break;
    }
    case "cart": {
      const lines = cartLines(rt, session);
      events.push({ id: eid(), ts: now(), kind: "cart", lines, totalPaise: lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0) });
      say(lines.length ? `That's the cart.` : `The cart is empty — search for something first.`);
      break;
    }
    case "checkout": {
      const lines = cartLines(rt, session);
      if (!lines.length) {
        say(`Nothing to check out yet. Search and add something first.`);
        break;
      }
      const total = lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
      if (total > TRUST_TIERS[session.tier].maxAmountPaise) {
        const cap = TRUST_TIERS[session.tier];
        say(
          `The cart totals ₹${Math.round(total / 100).toLocaleString("en-IN")} — over your ${cap.label} limit of ₹${Math.round(cap.maxAmountPaise / 100).toLocaleString("en-IN")}. Escalate with "attest" or trim the cart.`
        );
        break;
      }
      await runTool("request_mandate", {}, "Requested a mandate from the desk");
      break;
    }
    case "confirm": {
      if (session.awaitingMandateApproval && session.cart.size > 0) {
        session.awaitingMandateApproval = false;
        await runTool("bind_and_pay", {}, "Bound the order and paid");
      } else {
        say(`Nothing is waiting on your approval right now.`);
      }
      break;
    }
    case "attack": {
      const attack = ATTACK_CORPUS.find((a) => a.id === intent.attackId);
      if (!attack) {
        say(`Unknown attack "${intent.attackId}". The corpus: ${ATTACK_CORPUS.map((a) => a.id).join(", ")}.`);
        break;
      }
      executeAttack(rt, session, attack, events);
      break;
    }
    case "unknown": {
      /* the desk admits what it didn't understand — and the cheap voice
         answers casual questions briefly. Shopping commands never reach
         here (regex caught them above), so this path costs a few tokens
         only when a human actually chats. */
      await speakThroughVoice(
        message,
        cocoPersona ? "hmm — I hum and I hold the playback. that one's beyond me." : `I didn't catch that.`
      );
      break;
    }
  }

  async function runTool(name: string, args: Record<string, unknown>, summary: string) {
    const t0 = performance.now();
    const res = await adapterCall(adapter, name, args, { callTool, sign: signCtx, sessionId: session.sessionId });
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const detail = res.wire.map((w) => `${w.dir === "out" ? "→" : "←"} ${w.method ?? ""} ${w.body.slice(0, 220)}`).join("\n");
    toolLog.push({ name, ms, wire: res.wire.map((w) => ({ dir: w.dir, bytes: w.bytes, body: w.body })) });
    events.push({ id: eid(), ts: now(), kind: "step", tool: name, adapter, summary: `${summary} · ${ADAPTERS[adapter].label}`, detail, ms });
    return res.value;
  }

  return {
    events,
    session,
    needCheckoutRefresh: toolLog.some((t) => t.name === "bind_and_pay" || t.name === "request_mandate"),
    suggestions:
      intent.kind === "unknown"
        ? [{ label: "Help", value: "help" }, ...suggestionsFor(cartLines(rt, session), session.tier, session.awaitingMandateApproval)]
        : suggestionsFor(cartLines(rt, session), session.tier, session.awaitingMandateApproval, firstMatch),
  };
}

/* ------------------------- tool implementations ------------------------- */

export async function executeTool(
  rt: CustomsRuntime,
  session: BuyerSession,
  name: string,
  args: Record<string, unknown>,
  events: ChatEvent[],
  say: (t: string) => void,
  _adapter: AdapterId
): Promise<unknown> {
  switch (name) {
    case "search_catalog": {
      const query = String(args.query ?? "");
      // budget from the intent when the brain parsed one, else from the raw text
      const carried = Number(args.maxPricePaise ?? args.ceilingPaise ?? NaN);
      const ceiling = Number.isFinite(carried) && carried > 0 ? carried : parsePriceCeiling(query);
      const results = searchCatalog(query, 3, { ceilingPaise: ceiling });
      const note = ceiling ? `budget ≤ ${rupees(ceiling)}` : null;
      events.push({ id: eid(), ts: Date.now(), kind: "products", products: results, note });
      say(
        results.length
          ? results.length === 1 ? `One match.` : `${results.length} matches.`
          : `Nothing matched — try a broader search.`
      );
      return results.map((p) => ({ id: p.id, name: p.name, pricePaise: p.pricePaise, stock: p.stock }));
    }
    case "get_product": {
      const p = rt.catalog.byId.get(String(args.productId));
      return p ? { id: p.id, name: p.name, pricePaise: p.pricePaise, stock: p.stock } : null;
    }
    case "add_to_cart": {
      const p = rt.catalog.byId.get(String(args.productId));
      if (!p) return { added: false, reason: "unknown product" };
      const qty = Math.max(1, Math.min(10, Number(args.quantity ?? 1)));
      session.cart.set(p.id, (session.cart.get(p.id) ?? 0) + qty);
      const lines = cartLines(rt, session);
      const total = lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
      events.push({ id: eid(), ts: Date.now(), kind: "cart", lines, totalPaise: total });
      say(`Added.`);
      return { added: true, cartLines: lines.length, totalPaise: total };
    }
    case "request_mandate": {
      const lines = cartLines(rt, session);
      const total = lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
      const body = buildMandateBody(
        {
          buyerId: session.buyerId,
          tier: session.tier,
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPricePaise: l.unitPricePaise })),
          nowMs: Date.now(),
          humanApproved: false,
          amountCapPaise: total,
        },
        `man_${randomUUID().slice(0, 8)}`
      );
      const mandate = signMandate(body, rt.deps.privateKeyPem);
      session.mandate = { id: mandate.id, amountCapPaise: mandate.amountCapPaise, expiresAtMs: mandate.expiresAtMs };
      session.awaitingMandateApproval = true;
      rt.ledger.append("mandate.issued", {
        mandateId: mandate.id,
        buyerId: session.buyerId,
        tier: mandate.tier,
        amountCapPaise: mandate.amountCapPaise,
        liveSession: session.sessionId,
      });
      const view: MandateView = {
        id: mandate.id,
        tier: mandate.tier,
        amountCapPaise: mandate.amountCapPaise,
        items: lines,
        expiresAtMs: mandate.expiresAtMs,
        humanApproved: false,
        fingerprint: rt.keys.fingerprint,
        signature: mandate.signature.slice(0, 24) + "…",
      };
      events.push({ id: eid(), ts: Date.now(), kind: "mandate", mandate: view, pendingApproval: true });
      const over10k = total >= 1_000_000;
      say(
        `The desk approved your mandate — it holds for ${Math.round((mandate.expiresAtMs - Date.now()) / 60000)} minutes.` +
          (over10k ? ` It's above ₹10,000, so the merchant desk signs off too.` : ``)
      );
      return { mandateId: mandate.id, cap: mandate.amountCapPaise, expiresAtMs: mandate.expiresAtMs };
    }
    case "bind_and_pay": {
      const lines = cartLines(rt, session);
      if (!lines.length || !session.mandate) return { bound: false, reason: "no pending mandate" };
      // the approval gate lives HERE, at the tool layer — not in any one
      // client — so chat, the MCP server and ACP all refuse the same way:
      // no principal approval, no money moves.
      if (session.awaitingMandateApproval) {
        return { bound: false, reason: "MANDATE_NOT_APPROVED", note: "the principal must approve the signed mandate before it can move money" };
      }
      const tx = runTransaction(rt.deps, {
        buyerId: session.buyerId,
        tier: session.tier,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        adapter: _adapter,
        nowMs: Date.now(),
      });
      session.lastOrderId = tx.orderId;
      events.push({ id: eid(), ts: Date.now(), kind: "gate", orderId: tx.orderId, decision: tx.decision, adapter: _adapter });
      if (tx.decision.kind === "ALLOW" && tx.payment) {
        const rail = railInfo();
        events.push({ id: eid(), ts: Date.now(), kind: "payment", orderId: tx.orderId, totalPaise: tx.decision.totalPaise, status: "captured", rail: rail.id, simulated: rail.simulated });
        const manifestNo = `FN-MA-${String(rt.ledger.all().length).padStart(6, "0")}`;
        events.push({ id: eid(), ts: Date.now(), kind: "receipt", orderId: tx.orderId, manifestNo, lines: lines.map((l) => ({ name: l.name, quantity: l.quantity, unitPricePaise: l.unitPricePaise })), totalPaise: tx.decision.totalPaise, rail: rail.id, simulated: rail.simulated });
        say(
          `Paid.` +
            (rail.simulated ? ` (simulated)` : ``)
        );
        session.cart.clear();
        session.mandate = null;
        return { bound: true, captured: true, orderId: tx.orderId, manifestNo };
      }
      if (tx.decision.kind === "HOLD_FOR_APPROVAL") {
        events.push({ id: eid(), ts: Date.now(), kind: "payment", orderId: tx.orderId, totalPaise: tx.decision.totalPaise, status: "held", rail: "none", simulated: false });
        say(`Above ₹10,000 — the merchant desk holds it. Approve it in the Control Room.`);
        return { bound: true, held: true, orderId: tx.orderId };
      }
      events.push({ id: eid(), ts: Date.now(), kind: "payment", orderId: tx.orderId, totalPaise: 0, status: "refused", rail: "none", simulated: false });
      say(`The gate said no — the card above shows why.`);
      return { bound: false, refused: true, code: tx.decision.code, orderId: tx.orderId };
    }
    default:
      return { error: `unknown tool ${name}` };
  }
}

/* ------------------------------ attacks ------------------------------ */

export function executeAttack(
  rt: CustomsRuntime,
  session: BuyerSession,
  attack: AttackCase,
  events: ChatEvent[]
): void {
  const tx = runTransaction(
    rt.deps,
    attackTxInput(attack, { orderId: `ord_atk_live_${randomUUID().slice(0, 6)}`, nowMs: Date.now(), adapter: "acp", buyerPrefix: `attacker-${session.sessionId}` })
  );
  const blocked = tx.decision.kind !== "ALLOW";
  rt.ledger.append("attack.blocked", {
    attackId: attack.id,
    label: attack.label,
    orderId: tx.orderId,
    tier: attack.tier,
    verdict: blocked ? "BLOCKED" : "PASSED",
    code: tx.decision.code,
    reason: tx.decision.reason,
    expected: attack.expect.code,
    matched: blocked && tx.decision.code === attack.expect.code,
    live: true,
  });
  events.push({
    id: eid(),
    ts: Date.now(),
    kind: "attack",
    attackId: attack.id,
    label: attack.label,
    verdict: blocked ? "BLOCKED" : "PASSED",
    code: tx.decision.code,
    checks: tx.decision.checks.map((c) => ({ label: c.label, pass: c.pass, detail: c.detail })),
  });
}

export function cartLines(rt: CustomsRuntime, session: BuyerSession) {
  return [...session.cart.entries()].map(([productId, quantity]) => {
    const p = rt.catalog.byId.get(productId)!;
    return { productId, name: p.name, quantity, unitPricePaise: p.pricePaise };
  });
}

export function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function llmToIntent(parsed: { action: string; query?: string; productId?: string; quantity?: number; maxPriceInr?: number }, raw: string): Intent {
  switch (parsed.action) {
    case "search":
      return { kind: "search", query: parsed.query ?? raw, maxPricePaise: parsed.maxPriceInr ? Math.round(parsed.maxPriceInr * 100) : parsePriceCeiling(raw), results: searchCatalog(parsed.query ?? raw, 3) };
    case "add":
      return { kind: "add", productId: parsed.productId ?? null, query: parsed.query ?? raw, quantity: parsed.quantity ?? 1 };
    case "remove":
      return { kind: "remove", productId: parsed.productId ?? "" };
    case "cart":
      return { kind: "cart" };
    case "checkout":
      return { kind: "checkout" };
    case "confirm":
      return { kind: "confirm" };
    case "status":
      return { kind: "status" };
    default:
      return { kind: "unknown", query: raw };
  }
}
