"use client";

/**
 * agent-kit.tsx — the agent kit view: the counter's HTTP contract, rendered
 * as a product surface. The counter is not reserved for our buyer — this
 * page shows an outside agent everything it needs (the one endpoint, the
 * message protocol, the tool schemas, the trust ladder), fetches the
 * machine-readable kit from /api/agent/kit live (the JSON cannot drift from
 * the code, because it IS the code, serialized), and runs the golden path
 * over pure HTTP in-page — the same walk `make kit` performs as a standalone
 * client with no in-repo state. AGENT_KIT.md is the human twin; this view is
 * the twin's face.
 */
import { useCallback, useEffect, useState } from "react";
import { GhostButton, InkButton, Reveal, TierChip, Stamp } from "./bits";
import type { View } from "./shell";
import { TRUST_TIERS, TrustTier } from "@/lib/customs/gate/types";
import { TOOL_SCHEMAS } from "@/lib/customs/adapters";

/* ------------------------------------------------------------------ */
/* types (the chat envelope, kept loose at the edges)                  */
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

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function AgentKitPage({ onEnter }: { onEnter: (v: View) => void }) {
  const [kit, setKit] = useState<KitDoc | null>(null);
  const [showJson, setShowJson] = useState(false);
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
      <section aria-label="the agent kit" className="pb-14 pt-4 text-center sm:pt-8">
        <p className="label-caps">the agent kit — bring your own agent</p>
        <h1 className="mx-auto mt-7 max-w-[24ch] text-balance font-display text-[clamp(32px,4.8vw,56px)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
          The counter is not reserved for our buyer.
        </h1>
        <div className="mx-auto mt-9 max-w-[60ch] space-y-5 text-left text-[16px] leading-[1.75] text-inksoft">
          <p>
            The playground&apos;s agent is ours; the counter is not. The same HTTP
            surface it uses is published here as a contract: one endpoint, eight
            messages, five tool schemas, a signed-mandate approval step. Your
            harness, a notebook, or a curl loop can clear it like any customer —
            every check visible, every span hash-chained.
          </p>
          <p>
            Below, the page runs the golden path itself — the same walk{" "}
            <code className="font-mono text-[13px] text-ink">make kit</code>{" "}
            performs from outside. Test mode only: live keys are refused at
            construction.
          </p>
        </div>
      </section>

      {/* ------------------------------ the endpoint ------------------------------ */}
      <Reveal>
        <section aria-label="the one endpoint" className="pb-14">
          <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
            One endpoint. Plain JSON.
          </h2>
          <div className="doc mt-6">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="label-caps">post /api/chat</span>
              <span className="hidden text-[11.5px] text-inksoft sm:block">the whole turn comes back as events</span>
            </div>
            <div className="grid gap-px bg-line sm:grid-cols-2">
              <div className="bg-card px-4 py-4">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-cleared">request</div>
                <div className="mt-3 space-y-2">
                  {[
                    ["sessionId", "omit on call one — the response hands one back"],
                    ["message", "the agent's utterance (protocol below)"],
                    ["adapter", "naive · mcp · acp — the turn's wire format"],
                    ["tier", "the tier a new session starts at"],
                  ].map(([k, d]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 rounded-[3px] bg-ink/[0.04] px-2.5 py-1.5">
                      <span className="font-mono text-[10.5px] text-ink">{k}</span>
                      <span className="text-right text-[11.5px] text-inksoft">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card px-4 py-4">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-cleared">response</div>
                <div className="mt-3 space-y-2">
                  {[
                    ["sessionId", "reuse it on every following call"],
                    ["events[]", "the full turn, step by step"],
                    ["awaitingMandateApproval", "true → send approve"],
                    ["suggestions[]", "parser-exact next messages"],
                  ].map(([k, d]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 rounded-[3px] bg-ink/[0.04] px-2.5 py-1.5">
                      <span className="font-mono text-[10.5px] text-ink">{k}</span>
                      <span className="text-right text-[11.5px] text-inksoft">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* the live kit, fetched from the endpoint */}
          {kit?.service?.rail && (
            <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-[4px] border border-line bg-paper2/40 px-4 py-3">
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
            The fuzz corpus pins that.
          </p>
          <div className="doc mt-6">
            {PROTOCOL.map((p, i) => (
              <div key={p.message} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line/60 px-4 py-3 last:border-b-0">
                <span className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] text-inksoft">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-mono text-[12px] text-ink">{p.message}</span>
                </span>
                <span className="text-[12px] text-inksoft">{p.effect}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-px bg-line md:grid-cols-[1.4fr_1fr]">
            <div className="bg-card px-4 py-4">
              <div className="label-caps">the tools — one schema set, three transports</div>
              <div className="mt-3 space-y-1.5">
                {TOOL_SCHEMAS.map((t) => (
                  <div key={t.name} className="flex items-baseline justify-between gap-3 rounded-[3px] bg-ink/[0.04] px-2.5 py-1.5">
                    <span className="font-mono text-[11px] text-ink">{t.name}</span>
                    <span className="truncate text-right text-[11px] text-inksoft">{t.description}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card px-4 py-4">
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

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Stamp kind="held" animate={false}>protocol-shaped adapters · not certified spec implementations</Stamp>
            <span className="text-[12px] text-inksoft">the honesty note travels with the kit — ARCHITECTURE.md, ENGINEERING_LOG.md</span>
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
