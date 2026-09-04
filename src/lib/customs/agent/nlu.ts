/**
 * The rules brain — deterministic intent parsing for the buyer agent.
 *
 * Design decision (ENGINEERING_LOG, D2): the default brain is rules-only and
 * deterministic. Every demo is replayable bit-for-bit, every number in
 * results/ regenerates identically, and the ablation can hold the LLM arm
 * honest ("what did the model actually buy us over these rules?"). An LLM
 * brain is one env var away (AGENT_BRAIN=llm + key) and is measured, never
 * trusted: whichever brain parses intent, the gate decides money in plain
 * code (AGENTS.md invariant 5).
 */
import { parsePriceCeiling, searchCatalog, Product } from "../store/catalog";
import { parseMusicIntent, MusicIntent } from "../music/brain";

export type Intent =
  | { kind: "greeting" }
  | { kind: "help" }
  | { kind: "search"; query: string; maxPricePaise: number | null; results: Product[] }
  | { kind: "add"; productId: string | null; query: string; quantity: number }
  | { kind: "remove"; productId: string }
  | { kind: "cart" }
  | { kind: "checkout"; rest?: string }
  | { kind: "confirm" }
  | { kind: "attack"; attackId: string }
  | { kind: "status" }
  | { kind: "attest"; rest?: string }
  | { kind: "checkout"; rest?: string }
  | { kind: "music"; action: MusicIntent["action"]; query: string | null; mood: string | null }
  | { kind: "unknown"; query: string };

const ATTACK_RE = /^attack[:\s]+([a-z0-9-]+)/i;

/* the words a human strings around a command — "attest the pro earbuds",
   "checkout then add socks". The command fires AND the remainder is kept,
   never silently dropped (the ghost-cart incident, 2026-09-04). */
function remainder(text: string, match: RegExpMatchArray): string {
  const start = match.index ?? 0;
  const around = (text.slice(0, start) + " " + text.slice(start + match[0].length)).trim();
  return around
    .replace(/^(?:please|now|and|then|also|first|after that)\b[\s,]*/i, "")
    .replace(/[\s,]*(?:and|then|also|after that|please|now)?[.!\s]*$/, "")
    .trim();
}

function quantityOf(text: string): number {
  const m = text.match(/(?:x|qty|quantity)?\s*(\d{1,2})\s*(?:x|qty|pcs|pieces|units)?\b/i);
  if (!m) return 1;
  const n = Number(m[1]);
  return n >= 1 && n <= 10 ? n : 1;
}

export function parseIntent(raw: string): Intent {
  const text = raw.trim();
  const lower = text.toLowerCase();

  if (!text) return { kind: "unknown", query: "" };

  const atk = lower.match(ATTACK_RE);
  if (atk) return { kind: "attack", attackId: atk[1] };

  /* the ghost's commands ride their own rules brain, before the buyer
     verbs — "play" and "skip" are nobody's shopping words, and music
     text must never reach the LLM path (zero tokens, D7) */
  const music = parseMusicIntent(text);
  if (music) return { kind: "music", action: music.action, query: music.query, mood: music.mood };

  if (/^(whats up|what's up|wassup|sup|how are you|how are things|how is it going|thanks|thank you|thx|ty|who are you|what are you|good (night|day))\b/.test(lower) || /^(hi|hello|hey|namaste|yo|good (morning|evening|afternoon))\b/.test(lower))
    return { kind: "greeting" };
  if (/^(help|what can you do|commands|how does this work)/.test(lower)) return { kind: "help" };
  const attestM = lower.match(/\b(attest\w*|verify me|otp|upgrade (my )?(tier|identity))\b/);
  if (attestM) {
    const rest = remainder(text, attestM);
    return rest ? { kind: "attest", rest } : { kind: "attest" };
  }
  if (/\b(status|balance|mandate status|my tier|who am i)\b/.test(lower)) return { kind: "status" };
  const checkoutM = lower.match(/\b(checkout|pay now|buy now|place the order|complete (the )?purchase|bind and pay)\b/);
  if (checkoutM) {
    const rest = remainder(text, checkoutM);
    return rest ? { kind: "checkout", rest } : { kind: "checkout" };
  }
  if (/^(yes|y|confirm|go ahead|do it|approve|proceed|continue)\b/.test(lower))
    return { kind: "confirm" };

  const remove = lower.match(/(?:remove|drop|delete|take out)\s+(?:the\s+)?([a-z0-9-]+)/);
  if (remove) {
    const tok = remove[1];
    const hit = searchCatalog(tok, 1)[0];
    return { kind: "remove", productId: hit ? hit.id : tok };
  }

  const add = lower.match(
    /(?:add|buy|get|i(?:'| a)?ll take|i want|i need|order|put in)\s+(.+?)(?:\s+to\s+cart)?$/
  );
  if (add) {
    const rest = add[1];
    const qty = quantityOf(rest);
    // find an explicit product id mention
    const idHit = rest.match(/[a-z]+(?:-[a-z0-9]+){1,3}/g)?.find((t) =>
      searchCatalog(t, 1).some((p) => p.id === t)
    );
    if (idHit) return { kind: "add", productId: idHit, query: rest, quantity: qty };
    const hits = searchCatalog(rest, 1);
    return { kind: "add", productId: hits[0]?.id ?? null, query: rest, quantity: qty };
  }

  if (/\b(cart|basket|what am i buying|my items)\b/.test(lower)) return { kind: "cart" };

  if (/\b(search|find|show|look(?:ing)? for|browse|list|what.*do you have|any)\b/.test(lower) || parsePriceCeiling(lower)) {
    const query = text
      .replace(/\b(under|below|less than|max|upto|up to)\s*[₹\s]*[\d,.]+k?/gi, "")
      .replace(/\b(search|find|show|me|for|looking|browse|list|do you have|any|some|good)\b/gi, "")
      .replace(/[₹]/g, "")
      .trim();
    const maxPricePaise = parsePriceCeiling(lower);
    const results = searchCatalog(query || lower, 3);
    return { kind: "search", query: query || text, maxPricePaise, results };
  }

  // last resort: try it as a product query — but only on a confident hit.
  // A stray 2-point substring (the "up" inside "Supply") must not turn small
  // talk into a product card (D5-3).
  const results = searchCatalog(lower, 3, { minScore: 3 });
  if (results.length > 0) {
    return { kind: "search", query: text, maxPricePaise: parsePriceCeiling(lower), results };
  }
  return { kind: "unknown", query: text };
}
