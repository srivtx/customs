"use client";

/**
 * playground.tsx — the buyer side: chat with the agent, watch every step,
 * escalate trust, red-team the desk. Two humans can appear on this side of
 * the counter: the buyer's principal (mandate approval) and, over ₹10,000,
 * the merchant desk (Control Room).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChatEventView } from "./chat-events";
import { InkButton, SectionLabel, Stamp, TierChip, GhostButton, DeskHead, ManifestRow, inr, Kbd, LogoMark } from "./bits";
import type { ChatEvent, Suggestion } from "@/lib/customs/agent/loop";
import type { AdapterId } from "@/lib/customs/adapters";
import { ADAPTERS } from "@/lib/customs/adapters";
import { TRUST_TIERS, TrustTier } from "@/lib/customs/gate/types";

const ADAPTER_ORDER: AdapterId[] = ["naive", "mcp", "acp"];
const TIERS: TrustTier[] = ["UNVERIFIED", "ATTESTED", "MANDATED"];

const EMPTY_CHIPS: Suggestion[] = [
  { label: "Show me headphones", value: "search headphones under 5000" },
  { label: "Desk accessories under ₹10,000", value: "search desk under 10000" },
  { label: "Attack the desk", value: "attack: tampered-signature" },
];

const RED_TEAM = [
  { id: "overspend-tier", label: "Overspend tier" },
  { id: "overspend-cap", label: "Overspend cap" },
  { id: "expired-mandate", label: "Expired mandate" },
  { id: "tampered-signature", label: "Tamper signature" },
  { id: "price-drift", label: "Price drift" },
  { id: "item-substitution", label: "Substitute item" },
  { id: "quantity-overrun", label: "Overrun qty" },
  { id: "currency-swap", label: "Swap currency" },
  { id: "float-amount", label: "Float paise" },
  { id: "over-50k", label: "Break ₹50k" },
  { id: "replay-payment", label: "Replay payment" },
  { id: "human-threshold", label: "Sneak ₹10k" },
];

interface ChatResponse {
  ok: boolean;
  sessionId: string;
  buyerId: string;
  tier: TrustTier;
  cart: [string, number][];
  awaitingMandateApproval: boolean;
  events: ChatEvent[];
  suggestions?: Suggestion[];
  brain: string;
  rail: { id: string; label: string; simulated: boolean };
  error?: string;
}

export function Playground() {
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tier, setTier] = useState<TrustTier>("UNVERIFIED");
  const [adapter, setAdapter] = useState<AdapterId>("naive");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [rail, setRail] = useState<ChatResponse["rail"] | null>(null);
  const [brain, setBrain] = useState("rules");
  const [sessionFresh, setSessionFresh] = useState(true);
  const [chips, setChips] = useState<Suggestion[]>([]);
  /* per-event cascade: each event in a turn's batch mounts 90ms after the
     one above it (capped) — the transcript settles like speech, not a dump */
  const delays = useRef(new Map<string, number>());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* "/" focuses the composer — the counter's own power shortcut:
     one keystroke from anywhere on the page to typing at the desk */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;
      setBusy(true);
      setInput("");
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, message, adapter }),
        });
        const data = (await res.json()) as ChatResponse;
        if (data.ok) {
          setSessionId(data.sessionId);
          setTier(data.tier);
          setRail(data.rail);
          setBrain(data.brain);
          setSessionFresh(false);
          data.events.forEach((e, i) => delays.current.set(e.id, Math.min(i * 90, 400)));
          setEvents((prev) => [...prev, ...data.events]);
          setChips(data.suggestions ?? []);
        } else {
          setEvents((prev) => [
            ...prev,
            { id: `err_${Date.now()}`, ts: Date.now(), role: "agent", text: `The desk hit an error: ${data.error ?? "unknown"}. Every error is logged — this one will become a test case.` },
          ]);
        }
      } catch {
        setEvents((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, ts: Date.now(), role: "agent", text: "Network error reaching the desk." },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, sessionId, adapter]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [events, busy]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ------------------------------ chat ------------------------------ */}
      <section className="doc flex min-h-[640px] flex-col overflow-hidden" aria-label="agent chat">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <div className="label-caps">fieldnote supply · agent counter</div>
            <h2 className="font-display text-xl font-medium">Talk to the buying agent</h2>
          </div>
          <div className="flex items-center gap-2">
            {rail && (
              <Stamp kind={rail.simulated ? "sim" : "cleared"} animate={false}>
                {rail.simulated ? "SIM" : "SANDBOX"}
              </Stamp>
            )}
          </div>
        </header>

        {/* adapter picker */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper2/40 px-4 py-2">
          <span className="label-caps mr-1">protocol</span>
          {ADAPTER_ORDER.map((a) => (
            <GhostButton key={a} active={adapter === a} onClick={() => setAdapter(a)} title={ADAPTERS[a].blurb}>
              {ADAPTERS[a].label}
            </GhostButton>
          ))}
          <span className="ml-auto hidden text-[12px] text-inksoft sm:block">
            same gate · same rails · measured overhead
          </span>
        </div>

        {/* transcript */}
        <div ref={scrollRef} className="chat-scroll flex-1 space-y-1 overflow-y-auto px-4 py-4" style={{ maxHeight: "min(62vh, 660px)" }}>
          {events.length === 0 && (
            <div className="py-12 text-center">
              <LogoMark size={40} className="mx-auto mb-4 text-ink/80" />
              <p className="font-display text-lg font-medium text-ink">The counter is open.</p>
              <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-inksoft">
                You are an unverified walk-in with a ₹500 envelope. Ask for something, let the agent
                build a cart, request a signed mandate — or type <Kbd>help</Kbd>. Escalate with{" "}
                <Kbd>attest</Kbd>, then push the desk with the red team.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {EMPTY_CHIPS.map((c) => (
                  <GhostButton key={c.value} onClick={() => send(c.value)}>
                    {c.label}
                  </GhostButton>
                ))}
              </div>
            </div>
          )}
          {events.map((e) => (
            <ChatEventView key={e.id} event={e} onSend={send} delay={delays.current.get(e.id) ?? 0} />
          ))}
          {busy && (
            <div className="flex animate-rise items-center gap-3 px-1 py-2">
              <DeskHead size={24} thinking className="text-ink" />
              <span className="text-[12px] text-inksoft">the desk is working</span>
            </div>
          )}
        </div>

        {/* suggested next step — the counter never leaves you guessing */}
        {chips.length > 0 && !busy && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper2/40 px-4 py-2">
            <span className="label-caps mr-1 text-inksoft">next</span>
            {chips.map((c, i) => (
              <span
                key={c.value}
                className="animate-rise inline-flex"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <GhostButton onClick={() => send(c.value)}>{c.label}</GhostButton>
              </span>
            ))}
          </div>
        )}

        {/* composer */}
        <form
          className="flex items-center gap-2 border-t border-line bg-paper2/40 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={sessionFresh ? "try: search headphones under 5000 — / focuses this" : "message the agent — / focuses this"}
            aria-label="message the agent"
            className="h-10 flex-1 rounded-[4px] border border-line2 bg-card px-3 text-[13px] text-ink placeholder:text-inksoft/60 transition-colors focus:border-ink/30 focus:outline-none"
          />
          <InkButton type="submit" disabled={busy || !input.trim()} ariaLabel="send message">
            Send
          </InkButton>
        </form>
      </section>

      {/* ------------------------------ rail ------------------------------ */}
      <aside className="rail-scroll space-y-5 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1" aria-label="buyer passport and red team">
        {/* passport */}
        <section className="doc px-4 py-4">
          <SectionLabel>buyer passport</SectionLabel>
          <div className="mt-3 flex items-center justify-between">
            <TierChip tier={tier} />
            <span className="font-mono text-[10px] text-inksoft">{sessionId ? sessionId : "no session"}</span>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-inksoft">{TRUST_TIERS[tier].blurb}</p>
          <div className="mt-3">
            <ManifestRow left="per-transaction cap" right={inr(TRUST_TIERS[tier].maxAmountPaise)} />
            <ManifestRow left="distinct items" right={String(TRUST_TIERS[tier].maxItems)} />
            <ManifestRow left="mandate lifetime" right={`${Math.round(TRUST_TIERS[tier].mandateTtlMs / 60000)} min`} />
            <ManifestRow left="human desk over" right={inr(1_000_000)} />
            <ManifestRow left="brain" right={brain} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIERS.map((t) => (
              <GhostButton
                key={t}
                active={tier === t}
                disabled={t === tier || t === "MANDATED"}
                title={t === "MANDATED" ? "mandates are signed by the desk — escalate via attest" : `act as ${t}`}
                onClick={() => {
                  // switching identity starts a fresh session at that tier
                  setTier(t);
                  setSessionId(null);
                  setEvents([]);
                  setChips([]);
                  setSessionFresh(true);
                }}
              >
                {t === "UNVERIFIED" ? "walk in" : t === "ATTESTED" ? "act attested" : "mandated"}
              </GhostButton>
            ))}
          </div>
        </section>

        {/* red team */}
        <section className="doc px-4 py-4">
          <SectionLabel>red team — attack this desk</SectionLabel>
          <p className="mt-2 text-[12.5px] leading-relaxed text-inksoft">
            The same authored corpus <span className="font-mono">make fuzz</span> runs — fired live
            at the running gate. Every attempt lands in the hash-chained ledger with its reason code.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {RED_TEAM.map((a) => (
              <GhostButton key={a.id} variant="danger" onClick={() => send(`attack: ${a.id}`)} className="w-full">
                {a.label}
              </GhostButton>
            ))}
          </div>
        </section>

        {/* how the counter works */}
        <section className="doc px-4 py-4">
          <SectionLabel>the three steps</SectionLabel>
          <ol className="mt-2 space-y-2.5">
            {["Mandate", "Bind", "Settle"].map((t, i) => {
              const d = [
                "The desk signs an envelope: amount cap, items, expiry, tier — Ed25519 over canonical JSON.",
                "The gate re-verifies signature, bounds and live prices at bind time, in plain code. Never an LLM.",
                "Capture on the rail, manifest issued, every span hash-chained for replay.",
              ][i];
              return (
                <li key={t} className="flex gap-3.5">
                  <span className="font-mono text-[11px] font-semibold text-cleared">0{i + 1}</span>
                  <div>
                    <div className="text-[12px] font-medium text-ink">{t}</div>
                    <div className="text-[12px] leading-relaxed text-inksoft">{d}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </aside>
    </div>
  );
}
