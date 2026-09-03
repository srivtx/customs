"use client";

/**
 * agent-kit.tsx — the agent kit view: the counter's HTTP contract, rendered
 * as a product surface. The counter is not reserved for our buyer — the
 * page shows the three doors (plain JSON chat, a REAL MCP server over
 * Streamable HTTP, ACP core REST with Ed25519-signed receipts), the message
 * protocol, the tools and the trust ladder — drawn as the site's felt
 * patches, wired with running stitch. The raw kit JSON is fetched live from
 * /api/agent/kit (it cannot drift from the code — it IS the code,
 * serialized); the copy button hands a visitor's agent its full context;
 * and the walkthrough runs the golden path over pure HTTP in-page, the same
 * walk `make kit` performs as a standalone client with no in-repo state.
 * AGENT_KIT.md is the human twin; this view is the twin's face.
 */
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { GhostButton, InkButton, Reveal, TierChip, Stamp } from "./bits";
import type { View } from "./shell";
import { TRUST_TIERS, TrustTier } from "@/lib/customs/gate/types";
import { TOOL_SCHEMAS } from "@/lib/customs/adapters";

/* ------------------------------------------------------------------ */
/* data                                                                */
/* ------------------------------------------------------------------ */

interface WalkEvent {
  kind?: string;
  products?: { id: string; name: string; pricePaise: number }[];
  totalPaise?: number;
  orderId?: string;
  decision?: { kind: string; checks: { pass: boolean | null }[] };
  status?: string;
  rail?: string;
  simulated?: boolean;
  manifestNo?: string;
}

interface ChatResponse {
  ok: boolean;
  sessionId: string;
  tier: string;
  awaitingMandateApproval: boolean;
  events: WalkEvent[];
  error?: string;
}

interface KitDoc {
  service?: { rail?: { id: string; simulated: boolean }; brain?: string; catalogSize?: number };
  context?: string;
}

const PROTOCOL: { message: string; effect: string }[] = [
  { message: "search <query> [under <₹n>]", effect: "catalog search → a products event" },
  { message: "add <productId> [×n]", effect: "adds to the session cart" },
  { message: "cart", effect: "echoes the cart with the running total" },
  { message: "attest", effect: "raises the trust tier — UNVERIFIED → ATTESTED → MANDATED" },
  { message: "checkout", effect: "drafts and signs a mandate for the cart, then waits" },
  { message: "approve", effect: "releases the mandate → the gate decides → the rail captures" },
  { message: "status", effect: "passport: tier, caps, cart, active mandate" },
  { message: "attack: <corpus-id>", effect: "red-team: replays an authored attack against the live gate" },
];

const WALK: { message: string; expect: string }[] = [
  { message: "search earbuds", expect: "a products event with matches" },
  { message: "add <first match>", expect: "a cart event with the total" },
  { message: "attest", expect: "the cap now covers the cart" },
  { message: "checkout", expect: "a signed mandate, pendingApproval" },
  { message: "approve", expect: "gate → captured → receipt" },
];

const DOORS: { id: string; title: string; endpoint: string; badge: string; blurb: string; sample: string }[] = [
  {
    id: "chat",
    title: "plain json",
    endpoint: "POST /api/chat",
    badge: "the playground's own surface",
    blurb: "One message in, the whole turn back as events — tool calls, gate card, receipt.",
    sample: `{ "message": "search earbuds" }`,
  },
  {
    id: "mcp",
    title: "mcp — real",
    endpoint: "POST /api/mcp",
    badge: "streamable http · spec 2025-06-18",
    blurb: "A true Model Context Protocol server: initialize, tools/list, tools/call. Point Claude, Cursor or the Inspector at it.",
    sample: `{"jsonrpc":"2.0","id":1,"method":"initialize",
 "params":{"protocolVersion":"2025-06-18"}}`,
  },
  {
    id: "acp",
    title: "acp — core rest",
    endpoint: "POST /api/acp/sessions/{id}",
    badge: "receipts signed ed25519",
    blurb: "Request → ack → result → a signed receipt any client can verify offline against the published public key.",
    sample: `{ "tool": "request_mandate", "args": {} }`,
  },
];

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/* ------------------------------------------------------------------ */
/* the kit board — the felt, stitched                                  */
/* ------------------------------------------------------------------ */

/** one hand-cut felt board: the counter in the middle, every tool a
    patch pinned around it, running stitch wiring the whole thing. */
function KitBoard() {
  return (
    <div className="relative" aria-hidden="true">
      <svg viewBox="0 0 1200 430" className="block h-auto w-full" role="img" aria-label="the kit board — seven tool patches wired by running stitch to the counter">
        <defs>
          <filter id="kb-grain" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <filter id="kb-edge" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="11" result="w" />
            <feDisplacementMap in="SourceGraphic" in2="w" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="kb-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <radialGradient id="kb-pom-sage" cx="0.36" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#cfdccf" />
            <stop offset="0.5" stopColor="#a2c0a9" />
            <stop offset="1" stopColor="#6f8f79" />
          </radialGradient>
          <radialGradient id="kb-pom-butter" cx="0.36" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#f4e6c2" />
            <stop offset="0.5" stopColor="#e7cf9e" />
            <stop offset="1" stopColor="#b99a5e" />
          </radialGradient>
        </defs>

        {/* the felt */}
        <g filter="url(#kb-edge)">
          <rect x="18" y="16" width="1164" height="398" rx="14" fill="var(--card)" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="1.5" />
        </g>
        <rect x="18" y="16" width="1164" height="398" rx="14" fill="var(--card)" opacity="0" />
        {/* dye washes — the same pastels as the hero mat (screen-blend on the dark desk) */}
        <g className="hfx-wash">
          <ellipse cx="240" cy="90" rx="230" ry="90" fill="#a2c0a9" opacity="0.34" filter="url(#kb-soft)" />
          <ellipse cx="620" cy="360" rx="250" ry="86" fill="#9ec8e6" opacity="0.3" filter="url(#kb-soft)" />
          <ellipse cx="980" cy="120" rx="220" ry="88" fill="#c9b6e4" opacity="0.3" filter="url(#kb-soft)" />
          <ellipse cx="420" cy="240" rx="200" ry="80" fill="#e7cf9e" opacity="0.3" filter="url(#kb-soft)" />
        </g>
        <rect x="18" y="16" width="1164" height="398" rx="14" filter="url(#kb-grain)" opacity="0.07" style={{ mixBlendMode: "multiply" }} />
        <rect x="30" y="28" width="1140" height="374" rx="10" fill="none" stroke="var(--ink)" strokeOpacity="0.4" strokeWidth="1.8" strokeDasharray="0.5 10" strokeLinecap="round" />

        {/* running stitch — tools to counter */}
        <g fill="none" stroke="var(--ink)" strokeOpacity="0.42" strokeWidth="1.6" strokeDasharray="0.5 7.5" strokeLinecap="round">
          <path d="M 336 96 C 420 110 480 150 500 178" />
          <path d="M 336 210 L 448 210" />
          <path d="M 336 324 C 420 310 480 270 500 242" />
          <path d="M 864 96 C 780 110 720 150 700 178" />
          <path d="M 864 210 L 752 210" />
          <path d="M 480 356 C 500 320 540 290 560 254" />
          <path d="M 760 356 C 740 320 700 290 680 254" />
        </g>

        {/* tool patches — left column */}
        {[
          { x: 60, y: 74, label: "search_catalog", sub: "query → matches" },
          { x: 60, y: 188, label: "add_to_cart", sub: "id, qty → total" },
          { x: 60, y: 302, label: "get_product", sub: "id → price, stock" },
        ].map((p) => (
          <g key={p.label}>
            <rect x={p.x} y={p.y} width="276" height="54" rx="7" fill="var(--paper)" stroke="var(--ink)" strokeOpacity="0.28" strokeWidth="1.4" />
            <rect x={p.x + 5} y={p.y + 5} width="266" height="44" rx="5" fill="none" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="1.2" strokeDasharray="3 4.5" strokeLinecap="round" />
            <text x={p.x + 20} y={p.y + 25} fontSize="13.5" fontFamily="var(--font-mono, monospace)" fontWeight="600" fill="var(--ink)">{p.label}</text>
            <text x={p.x + 20} y={p.y + 42} fontSize="10.5" fontFamily="var(--font-mono, monospace)" fill="var(--ink)" opacity="0.55">{p.sub}</text>
          </g>
        ))}

        {/* tool patches — right column */}
        {[
          { x: 864, y: 74, label: "request_mandate", sub: "drafts + signs, holds" },
          { x: 864, y: 188, label: "bind_and_pay", sub: "gate decides → rail" },
        ].map((p) => (
          <g key={p.label}>
            <rect x={p.x} y={p.y} width="276" height="54" rx="7" fill="var(--paper)" stroke="var(--ink)" strokeOpacity="0.28" strokeWidth="1.4" />
            <rect x={p.x + 5} y={p.y + 5} width="266" height="44" rx="5" fill="none" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="1.2" strokeDasharray="3 4.5" strokeLinecap="round" />
            <text x={p.x + 20} y={p.y + 25} fontSize="13.5" fontFamily="var(--font-mono, monospace)" fontWeight="600" fill="var(--ink)">{p.label}</text>
            <text x={p.x + 20} y={p.y + 42} fontSize="10.5" fontFamily="var(--font-mono, monospace)" fill="var(--ink)" opacity="0.55">{p.sub}</text>
          </g>
        ))}

        {/* the protocol tools — the consent pair, butter-tinted */}
        {[
          { x: 330, y: 330, label: "attest_tier", sub: "raise the trust tier" },
          { x: 610, y: 330, label: "approve_mandate", sub: "the principal's yes" },
        ].map((p) => (
          <g key={p.label}>
            <rect x={p.x} y={p.y} width="260" height="54" rx="7" fill="var(--paper)" stroke="#b99a5e" strokeOpacity="0.55" strokeWidth="1.4" />
            <rect x={p.x + 5} y={p.y + 5} width="250" height="44" rx="5" fill="none" stroke="#b99a5e" strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray="3 4.5" strokeLinecap="round" />
            <text x={p.x + 20} y={p.y + 25} fontSize="13.5" fontFamily="var(--font-mono, monospace)" fontWeight="600" fill="var(--ink)">{p.label}</text>
            <text x={p.x + 20} y={p.y + 42} fontSize="10.5" fontFamily="var(--font-mono, monospace)" fill="var(--ink)" opacity="0.55">{p.sub}</text>
          </g>
        ))}

        {/* the counter, center */}
        <g>
          <rect x="500" y="168" width="200" height="84" rx="8" fill="var(--paper)" stroke="var(--ink)" strokeOpacity="0.5" strokeWidth="1.8" />
          <rect x="505" y="173" width="190" height="74" rx="6" fill="none" stroke="var(--ink)" strokeOpacity="0.4" strokeWidth="1.3" strokeDasharray="3 4.5" strokeLinecap="round" />
          <path d="M 528 196 L 542 210 L 528 224 L 514 210 Z" fill="var(--ink)" />
          <path d="M 528 202 L 534 210 L 528 218 L 522 210 Z" fill="var(--paper)" />
          <text x="556" y="205" fontSize="13" fontFamily="var(--font-mono, monospace)" fontWeight="600" fill="var(--ink)">the counter</text>
          <text x="556" y="222" fontSize="10.5" fontFamily="var(--font-mono, monospace)" fill="var(--ink)" opacity="0.6">one gate · every transport</text>
        </g>

        {/* pompoms tucked on the board */}
        <g className="hb-pom" style={{ "--tilt": "-9deg" } as CSSProperties} filter="url(#kb-edge)">
          <circle cx="64" cy="404" r="13" fill="url(#kb-pom-sage)" />
          <path d="M 55 399 Q 64 394 73 399" stroke="#6f8f79" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M 54 407 Q 64 402 74 407" stroke="#cfdccf" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M 57 414 Q 64 410 71 414" stroke="#6f8f79" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
        <g className="hb-pom" style={{ "--tilt": "8deg" } as CSSProperties} filter="url(#kb-edge)">
          <circle cx="1146" cy="402" r="13" fill="url(#kb-pom-butter)" />
          <path d="M 1137 397 Q 1146 392 1155 397" stroke="#b99a5e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M 1136 405 Q 1146 400 1156 405" stroke="#f4e6c2" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M 1139 412 Q 1146 408 1153 412" stroke="#b99a5e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

/** one stitched felt patch — solid hairline frame outside, dashed stitch
    inside, tinted paper between (the why page's patch, shared) */
function Patch({ children, className, accent }: { children: React.ReactNode; className?: string; accent?: boolean }) {
  return (
    <div className={className}>
      <div className="rounded-[4px] border border-line bg-paper2/50 p-[7px]">
        <div className={cn("h-full rounded-[3px] border border-dashed px-5 py-5", accent ? "border-ink/25" : "border-ink/15")}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AgentKitPage({ onEnter }: { onEnter: (v: View) => void }) {
  const [kit, setKit] = useState<KitDoc | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walkLines, setWalkLines] = useState<string[] | null>(null);
  const [walking, setWalking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/agent/kit", { cache: "no-store" });
        setKit((await res.json()) as KitDoc);
      } catch {
        /* the page stands without the live kit */
      }
    })();
  }, []);

  const copyContext = useCallback(async () => {
    const text =
      kit?.context ??
      `Customs — a signed-mandate agentic checkout (test mode only). Connect: POST /api/mcp (real MCP, Streamable HTTP) or POST /api/chat ({"message":"..."}) or ACP core REST /api/acp. Machine kit: GET /api/agent/kit. Golden path: search_catalog → add_to_cart → attest_tier → request_mandate → approve_mandate (ask your human) → bind_and_pay. No approval, no money. Full contract: AGENT_KIT.md.`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [kit]);

  /** the golden path, run from this page over pure HTTP — the same walk
      scripts/agent-kit-demo.ts performs as a standalone outside client */
  const runWalk = useCallback(async () => {
    setWalking(true);
    const lines: string[] = [];
    const log = (s: string) => {
      lines.push(s);
      setWalkLines([...lines]);
    };
    try {
      const post = async (sessionId: string | null, message: string): Promise<ChatResponse> => {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...(sessionId ? { sessionId } : {}), message }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ChatResponse;
      };
      const health = (await (await fetch("/api/health", { cache: "no-store" })).json()) as { chainOk: boolean; rail: { id: string } };
      log(`desk open · rail ${health.rail.id} · chain ${health.chainOk ? "verifies" : "BROKEN"}`);

      let r = await post(null, "search earbuds");
      const sid = r.sessionId;
      const products = r.events.find((e) => e.kind === "products")?.products ?? [];
      const pick = products.find((p) => p.id === "bud-pro-earbuds") ?? products[0];
      if (!pick) throw new Error("catalog search returned nothing");
      log(`session ${sid} · searched → ${pick.id} (${rupees(pick.pricePaise)})`);

      r = await post(sid, `add ${pick.id}`);
      const total = r.events.find((e) => e.kind === "cart")?.totalPaise ?? 0;
      log(`added → cart ${rupees(total)}`);

      r = await post(sid, "attest");
      log(`tier raised → ${r.tier}`);

      r = await post(sid, "checkout");
      const mandate = r.events.find((e) => e.kind === "mandate");
      log(`mandate ${mandate ? "signed, pending approval" : "MISSING"}`);
      if (!r.awaitingMandateApproval) throw new Error("mandate did not wait for approval");

      r = await post(sid, "approve");
      const gate = r.events.find((e) => e.kind === "gate");
      const payment = r.events.find((e) => e.kind === "payment");
      const receipt = r.events.find((e) => e.kind === "receipt");
      const checks = gate?.decision?.checks.filter((c) => c.pass).length ?? 0;
      log(
        `gate ${gate?.decision?.kind ?? "?"} · ${checks}/${gate?.decision?.checks.length ?? 10} checks · ` +
          `${payment?.status ?? "?"} on ${payment?.rail ?? "?"}${payment?.simulated ? " (simulated)" : ""}`
      );
      log(`receipt ${receipt?.manifestNo ?? "?"} · order ${receipt?.orderId ?? "?"}`);
      log("the outside agent paid — bounded, gated, hash-chained.");
    } catch (err) {
      log(`walkthrough failed: ${err instanceof Error ? err.message : String(err)} — is the desk running?`);
    } finally {
      setWalking(false);
    }
  }, []);

  return (
    <div>
      {/* ------------------------------ the claim ------------------------------ */}
      <section aria-label="the agent kit" className="pb-10 pt-4 text-center sm:pt-8">
        <p className="label-caps">the agent kit — bring your own agent</p>
        <h1 className="mx-auto mt-7 max-w-[24ch] text-balance font-display text-[clamp(32px,4.8vw,56px)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
          The counter is not reserved for our buyer.
        </h1>
        <div className="mx-auto mt-8 max-w-[62ch] text-left text-[16px] leading-[1.75] text-inksoft">
          <p>
            Three doors, one counter: speak plain JSON to{" "}
            <code className="font-mono text-[13px] text-ink">/api/chat</code>, connect a{" "}
            <span className="font-semibold text-ink">real MCP client</span> to{" "}
            <code className="font-mono text-[13px] text-ink">/api/mcp</code>, or run ACP core REST with{" "}
            <span className="font-semibold text-ink">signed receipts</span> at{" "}
            <code className="font-mono text-[13px] text-ink">/api/acp</code>. Every check visible,
            every span hash-chained. Test mode only — live keys are refused at construction.
          </p>
        </div>
      </section>

      {/* ------------------------------ the kit board ------------------------------ */}
      <Reveal>
        <section aria-label="the kit board" className="pb-14">
          <KitBoard />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <Stamp kind="cleared" animate={false}>mcp · real · streamable http · 2025-06-18</Stamp>
            <Stamp kind="held" animate={false}>acp core rest · receipts signed ed25519</Stamp>
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ copy the context ------------------------------ */}
      <Reveal>
        <section aria-label="give your agent context" className="pb-14">
          <Patch accent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="label-caps">give your agent its context</div>
                <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-inksoft">
                  One block on your clipboard: what Customs is, the three doors, the golden
                  path, and the rules that will not bend — paste it straight into Claude,
                  Cursor, or your own harness and it knows exactly how to shop here.
                </p>
              </div>
              <InkButton onClick={copyContext} arrow className="shrink-0">
                {copied ? "copied ✓" : "copy agent context"}
              </InkButton>
            </div>
          </Patch>
        </section>
      </Reveal>

      {/* ------------------------------ three doors ------------------------------ */}
      <Reveal>
        <section aria-label="three doors" className="pb-14">
          <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
            Three doors. One gate.
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {DOORS.map((d) => (
              <Patch key={d.id} className="h-full">
                <div className="flex h-full flex-col">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-cleared">{d.title}</span>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-inksoft">{d.badge}</span>
                  </div>
                  <div className="mt-3 font-mono text-[12px] font-semibold text-ink">{d.endpoint}</div>
                  <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-inksoft">{d.blurb}</p>
                  <pre className="mt-3 overflow-x-auto rounded-[3px] bg-ink/[0.04] px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-ink">{d.sample}</pre>
                </div>
              </Patch>
            ))}
          </div>

          {/* the live kit, fetched from the endpoint */}
          {kit?.service?.rail && (
            <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-[4px] border border-line bg-paper2/40 px-4 py-3">
              <span className="label-caps">live kit</span>
              <span className="font-mono text-[10.5px] text-inksoft">
                rail {kit.service.rail.id}{kit.service.rail.simulated ? " (simulated)" : ""} · brain {kit.service.brain} · {kit.service.catalogSize} products
              </span>
              <button
                onClick={() => setShowJson((v) => !v)}
                className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.1em] text-inksoft underline decoration-line2 underline-offset-4 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
              >
                {showJson ? "hide" : "show"} the raw json
              </button>
            </div>
          )}
          {showJson && (
            <pre className="doc mt-3 max-h-[340px] overflow-auto rounded-[4px] p-4 font-mono text-[10.5px] leading-relaxed text-inksoft">
              {kit ? JSON.stringify(kit, null, 2) : "fetching…"}
            </pre>
          )}
        </section>
      </Reveal>

      {/* ------------------------------ the protocol ------------------------------ */}
      <Reveal>
        <section aria-label="the protocol" className="pb-14">
          <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
            Eight messages. One approval that matters.
          </h2>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.8] text-inksoft">
            Escalation is the session&apos;s own act; approval is the principal&apos;s.
            Checkout drafts an Ed25519-signed mandate over canonical JSON and
            holds — <span className="font-semibold text-ink">no approval, no money</span>.
            The gate enforces it at the tool layer, so no transport can route around it.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <Patch>
              <div className="label-caps">the chat protocol</div>
              <div className="mt-3">
                {PROTOCOL.map((p, i) => (
                  <div key={p.message} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line/50 px-1 py-2.5 last:border-b-0">
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-[10px] text-inksoft">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-mono text-[12px] text-ink">{p.message}</span>
                    </span>
                    <span className="text-[11.5px] text-inksoft">{p.effect}</span>
                  </div>
                ))}
              </div>
            </Patch>
            <div className="flex flex-col gap-4">
              <Patch>
                <div className="label-caps">the tools — one schema set, three transports</div>
                <div className="mt-3 space-y-1.5">
                  {TOOL_SCHEMAS.map((t) => (
                    <div key={t.name} className="flex items-baseline justify-between gap-3 rounded-[3px] bg-ink/[0.04] px-2.5 py-1.5">
                      <span className="font-mono text-[11px] text-ink">{t.name}</span>
                      <span className="truncate text-right text-[11px] text-inksoft">{t.description}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="rounded-[3px] border border-line bg-card px-2 py-1 font-mono text-[10px] text-ink">+ attest_tier</span>
                  <span className="rounded-[3px] border border-line bg-card px-2 py-1 font-mono text-[10px] text-ink">+ approve_mandate</span>
                  <span className="text-[10.5px] leading-5 text-inksoft">protocol tools — consent, carried per transport</span>
                </div>
              </Patch>
              <Patch>
                <div className="label-caps">the trust ladder</div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {(["UNVERIFIED", "ATTESTED", "MANDATED"] as TrustTier[]).map((t) => (
                    <TierChip key={t} tier={t} />
                  ))}
                </div>
                <ul className="mt-3 space-y-1 text-[11.5px] leading-relaxed text-inksoft">
                  {(Object.keys(TRUST_TIERS) as TrustTier[]).map((t) => (
                    <li key={t} className="flex items-baseline justify-between gap-3">
                      <span>{TRUST_TIERS[t].label}</span>
                      <span className="font-mono text-[10.5px]">≤ {rupees(TRUST_TIERS[t].maxAmountPaise)}</span>
                    </li>
                  ))}
                </ul>
              </Patch>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ the proof ------------------------------ */}
      <Reveal>
        <section aria-label="the proof" className="pb-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
              Watch an outside agent clear it.
            </h2>
            <span className="text-[12.5px] text-inksoft">the same walk make kit runs from outside</span>
          </div>

          <div className="doc mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <span className="label-caps">the golden path, over pure http</span>
              <InkButton onClick={runWalk} disabled={walking} className="h-8 px-3 text-[12px]">
                {walking ? "walking…" : walkLines ? "run it again" : "run the walkthrough"}
              </InkButton>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid gap-2 sm:grid-cols-5">
                {WALK.map((w, i) => (
                  <div key={w.message} className="rounded-[3px] bg-ink/[0.03] px-2.5 py-2">
                    <div className="font-mono text-[9.5px] text-inksoft">{String(i + 1).padStart(2, "0")}</div>
                    <div className="mt-0.5 font-mono text-[10.5px] text-ink">{w.message}</div>
                    <div className="mt-0.5 text-[10.5px] leading-snug text-inksoft">{w.expect}</div>
                  </div>
                ))}
              </div>
              {walkLines && (
                <div className="rounded-[4px] border border-line bg-paper2/50 px-3.5 py-3">
                  {walkLines.map((l, i) => (
                    <div key={i} className="flex items-baseline gap-2.5 border-b border-line/40 py-1.5 font-mono text-[10.5px] text-ink last:border-b-0 last:pb-0">
                      <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-cleared" aria-hidden />
                      <span className="break-all">{l}</span>
                    </div>
                  ))}
                </div>
              )}
              {!walkLines && (
                <p className="text-[12px] leading-relaxed text-inksoft">
                  The button speaks JSON to <span className="font-mono text-[11px]">/api/chat</span> exactly
                  as an outside client would — search, add, attest, checkout, approve — and prints what
                  comes back. Nothing is mocked; the gate really decides, the rail really captures.
                </p>
              )}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ where to go ------------------------------ */}
      <Reveal>
        <section className="flex flex-wrap items-center gap-3 border-t border-line pt-8" aria-label="continue">
          <InkButton onClick={() => onEnter("agent")} arrow>
            open the playground
          </InkButton>
          <GhostButton onClick={() => onEnter("paper")} variant="ink">
            read the paper
          </GhostButton>
          <GhostButton
            onClick={() => window.open("https://github.com/srivtx/customs/blob/main/AGENT_KIT.md", "_blank", "noopener")}
          >
            AGENT_KIT.md on github
          </GhostButton>
        </section>
      </Reveal>
    </div>
  );
}
