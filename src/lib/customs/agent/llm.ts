/**
 * LLM brain — optional, metered, never trusted with money.
 *
 * Provider order (first key present wins, all OpenAI-compatible):
 *   OPENAI_API_KEY → GROQ_API_KEY (free tier) → GEMINI_API_KEY (free tier)
 *   → XAI_API_KEY → none (the rules brain handles everything).
 * LLM_BASE_URL / LLM_MODEL override any provider default, so any
 * OpenAI-compatible endpoint (incl. self-hosted) works without code changes.
 *
 * The LLM's ONLY job is intent → structured JSON; the gate still decides
 * (invariant 5), and every call's token counts land in the meter via span
 * attributes. No key is required to run the full product — the deterministic
 * rules brain is the default and the demo path.
 */
export interface ParsedIntentJson {
  action: "search" | "add" | "remove" | "cart" | "checkout" | "confirm" | "status" | "help";
  query?: string;
  productId?: string;
  quantity?: number;
  maxPriceInr?: number;
}

export interface LlmUsage {
  tokensIn: number;
  tokensOut: number;
}

export interface LlmBrain {
  name: string;
  parseIntent: (message: string) => Promise<{ intent: ParsedIntentJson | null; usage: LlmUsage }>;
}

const SYSTEM_PROMPT = `You are the intent parser for a shopping agent. Convert the user's latest message into ONE JSON object, nothing else.
Schema: {"action":"search|add|remove|cart|checkout|confirm|status|help","query":string?,"productId":string?,"quantity":integer?,"maxPriceInr":number?}
Rules: productId must be a known catalog id if the user references an item clearly, else omit it. Never invent prices. Output JSON only.`;

/* Free-tier-friendly defaults: every one of these has a real free tier today,
 * so the optional LLM arm of the ablation can run without spending money. */
const PROVIDERS: { key: string; base: string; model: string }[] = [
  { key: "OPENAI_API_KEY", base: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { key: "GROQ_API_KEY", base: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { key: "GEMINI_API_KEY", base: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
  { key: "XAI_API_KEY", base: "https://api.x.ai/v1", model: "grok-3-mini" },
];

function resolveProvider(): { key: string; base: string; model: string } | null {
  for (const p of PROVIDERS) {
    const key = process.env[p.key];
    if (key) {
      return {
        key,
        base: process.env.LLM_BASE_URL ?? p.base,
        model: process.env.LLM_MODEL ?? p.model,
      };
    }
  }
  // generic override: any OpenAI-compatible endpoint with its own key name
  if (process.env.LLM_BASE_URL && process.env.LLM_API_KEY) {
    return {
      key: process.env.LLM_API_KEY,
      base: process.env.LLM_BASE_URL,
      model: process.env.LLM_MODEL ?? "custom",
    };
  }
  return null;
}

export function getLlmBrain(): LlmBrain | null {
  const p = resolveProvider();
  if (!p) return null;
  return {
    name: `${p.model} @ ${new URL(p.base).host}`,
    async parseIntent(message) {
      const res = await fetch(p.base + "/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${p.key}` },
        body: JSON.stringify({
          model: p.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: message },
          ],
          temperature: 0,
          max_tokens: 200,
        }),
      });
      if (!res.ok) return { intent: null, usage: { tokensIn: 0, tokensOut: 0 } };
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = json.choices?.[0]?.message?.content ?? "";
      try {
        const start = content.indexOf("{");
        const end = content.lastIndexOf("}");
        const intent = start >= 0 && end > start ? (JSON.parse(content.slice(start, end + 1)) as ParsedIntentJson) : null;
        return {
          intent,
          usage: {
            tokensIn: json.usage?.prompt_tokens ?? Math.ceil((SYSTEM_PROMPT.length + message.length) / 4),
            tokensOut: json.usage?.completion_tokens ?? Math.ceil(content.length / 4),
          },
        };
      } catch {
        return { intent: null, usage: { tokensIn: json.usage?.prompt_tokens ?? 0, tokensOut: 0 } };
      }
    },
  };
}

export function brainMode(): "llm" | "rules" {
  return process.env.AGENT_BRAIN === "llm" && resolveProvider() ? "llm" : "rules";
}

/** true when ANY provider key is present (openai / groq / gemini / xai / generic) */
export function hasAnyLlmKey(): boolean {
  return resolveProvider() !== null;
}

/** the env var names we honor, for honest "why skipped" notes */
export const LLM_KEY_ENV_NAMES = ["OPENAI_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY", "XAI_API_KEY", "LLM_API_KEY"];
