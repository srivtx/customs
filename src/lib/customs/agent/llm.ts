/**
 * LLM brain — optional, metered, never trusted with money.
 *
 * Provider order: OPENAI_API_KEY (any OpenAI-compatible endpoint, incl.
 * self-hosted) → none (the rules brain handles everything). The LLM's ONLY
 * job is intent → structured JSON; the gate still decides (invariant 5), and
 * every call's token counts land in the meter via span attributes.
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

export function getLlmBrain(): LlmBrain | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const base = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  return {
    name: `${model} @ ${new URL(base).host}`,
    async parseIntent(message) {
      const res = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
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
  return process.env.AGENT_BRAIN === "llm" && process.env.OPENAI_API_KEY ? "llm" : "rules";
}
