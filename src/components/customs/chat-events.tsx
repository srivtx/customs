"use client";

/**
 * chat-events.tsx — renders one ChatEvent from the agent loop.
 * The transparency IS the product: intent, tool calls with wire envelopes,
 * the gate's checklist, the rail, the manifest — all visible inline.
 */
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { inr, Stamp, TierChip, InkButton, LogoMark, monoId, ManifestRow } from "./bits";
import type { ChatEvent as ChatEventT } from "@/lib/customs/agent/loop";
import type { Product } from "@/lib/customs/store/catalog";

/** render **bold** and `code` without a markdown dependency */
function rich(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let key = 0;
  const re = /\*\*(.+?)\*\*|`(.+?)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={key++} className="font-semibold text-ink">{m[1]}</strong>);
    else if (m[2])
      parts.push(
        <code key={key++} className="rounded-[3px] bg-ink/[0.05] px-1 py-px font-mono text-[0.85em] text-ink">
          {m[2]}
        </code>
      );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function tsOf(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour12: false });
}

export function ChatEventView({
  event,
  onSend,
}: {
  event: ChatEventT;
  onSend: (text: string) => void;
}) {
  if ("role" in event) {
    const isUser = event.role === "user";
    return (
      <div className={cn("animate-rise flex gap-3 py-2", isUser ? "justify-end" : "justify-start")}>
        {!isUser && <LogoMark size={18} className="mt-1 shrink-0 text-ink/70" />}
        <div
          className={cn(
            "max-w-[82%] rounded-[4px] border px-3.5 py-2.5 text-[13.5px] leading-relaxed",
            /* the same transcript system the demo player renders — the
               buyer's intent is a sent message (solid ink, the send
               button's own colors), the desk's voice is an incoming
               white card. One system across the demo and the real thing. */
            isUser
              ? "border-transparent bg-ink text-paper"
              : "border-line bg-card text-ink"
          )}
        >
          {isUser ? event.text : rich(event.text)}
          <div className={cn("mt-1 font-mono text-[9px] tracking-wide", isUser ? "text-paper/55" : "text-inksoft/70")}>
            {tsOf(event.ts)}
          </div>
        </div>
      </div>
    );
  }

  switch (event.kind) {
    case "step":
      return <StepChip event={event} />;
    case "products":
      return (
        <div className="animate-rise py-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {event.products.map((p: Product) => (
              <button
                key={p.id}
                onClick={() => onSend(`add ${p.id}`)}
                className="card-lift group overflow-hidden rounded-[4px] border border-line bg-card text-left focus-visible:outline-2 focus-visible:outline-ink"
              >
                {/* product photo — square, full color, center-cropped: the
                    same frame every commerce shelf uses. Plain img: local
                    files, fixed sizes, no remote optimizer. */}
                <img
                  src={p.image}
                  alt={p.name}
                  width={640}
                  height={640}
                  loading="lazy"
                  className="aspect-square w-full border-b border-line object-cover"
                />
                <div className="px-3 py-2">
                  <div className="truncate text-[12px] font-medium text-ink">{p.name}</div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="tnum font-mono text-[13px] font-semibold text-ink">{inr(p.pricePaise)}</span>
                    <span className="shrink-0 text-[11px] font-medium text-cleared opacity-0 transition-opacity group-hover:opacity-100">add to cart →</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {event.note && <div className="mt-1.5 text-[12px] text-inksoft">{event.note}</div>}
        </div>
      );
    case "cart":
      return (
        <div className="animate-rise my-2 rounded-[4px] border border-line bg-card px-3.5 py-2">
          {event.lines.map((l: { productId: string; name: string; quantity: number; unitPricePaise: number }) => (
            <ManifestRow
              key={l.productId}
              left={`${l.name} × ${l.quantity}`}
              right={inr(l.unitPricePaise * l.quantity)}
            />
          ))}
          <ManifestRow left="cart total" right={inr(event.totalPaise)} className="border-t border-line2 font-semibold" />
        </div>
      );
    case "mandate":
      return <MandateCard event={event} onSend={onSend} />;
    case "gate":
      return <GateCard event={event} />;
    case "payment":
      return (
        <div className="animate-rise my-2 flex items-center justify-between gap-3 rounded-[4px] border border-line bg-paper2/60 px-3.5 py-2.5">
          <div className="flex items-center gap-3">
            {event.status === "captured" && (
              <Stamp kind={event.simulated ? "sim" : "cleared"}>
                {event.simulated ? "SIMULATED CAPTURE" : "CAPTURED · SANDBOX"}
              </Stamp>
            )}
            {event.status === "held" && <Stamp kind="held">HELD AT DESK</Stamp>}
            {event.status === "refused" && <Stamp kind="refused">NOT CHARGED</Stamp>}
            <span className="font-mono text-[11px] text-inksoft">{monoId(event.orderId, 18)}</span>
          </div>
          {event.totalPaise > 0 && <span className="tnum text-[15px] font-semibold text-ink">{inr(event.totalPaise)}</span>}
        </div>
      );
    case "receipt":
      return (
        <div className="animate-rise my-3 rounded-[4px] border border-line bg-card">
          <div className="flex items-start justify-between border-b border-line px-4 py-3">
            <div>
              <div className="label-caps">fieldnote supply · manifest of entry</div>
              <div className="mt-1 font-display text-lg font-medium text-ink">Receipt</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[11px] text-inksoft">{event.manifestNo}</div>
              <div className="mt-0.5 font-mono text-[10px] text-inksoft">{monoId(event.orderId, 20)}</div>
            </div>
          </div>
          <div className="px-4 py-2">
            {event.lines.map((l: { name: string; quantity: number; unitPricePaise: number }, i: number) => (
              <ManifestRow key={i} left={`${l.name} × ${l.quantity}`} right={inr(l.unitPricePaise * l.quantity)} />
            ))}
            <ManifestRow left="total cleared" right={inr(event.totalPaise)} className="border-t border-line2 font-semibold" />
            <ManifestRow
              left="rail"
              right={event.simulated ? "simulation (labeled)" : "razorpay test mode"}
              mono
            />
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <span className="text-[11.5px] leading-relaxed text-inksoft">
              cleared by customs · hash-chained in ledger
              <br />
              replay span-by-span from the control room
            </span>
            <Stamp kind="cleared">CLEARED</Stamp>
          </div>
        </div>
      );
    case "attack":
      return (
        <div className="animate-rise my-2 rounded-[4px] border border-refused/30 bg-refused-ink px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-refused">
              RED TEAM · {event.label}
            </span>
            <Stamp kind={event.verdict === "BLOCKED" ? "cleared" : "refused"}>{event.verdict}</Stamp>
          </div>
          {event.code && (
            <div className="mt-1 font-mono text-[10.5px] text-inksoft">
              reason code: <span className="font-semibold text-refused">{event.code}</span>
            </div>
          )}
          <ul className="mt-2 grid gap-1">
            {event.checks.map((c: { label: string; pass: boolean | null; detail: string }, i: number) => (
              <li key={i} className="flex items-baseline gap-2 text-[12px] text-inksoft">
                <span className={cn("w-3 shrink-0 text-center font-mono font-semibold", c.pass === true && "text-cleared", c.pass === false && "text-refused")}>
                  {c.pass === true ? "✓" : c.pass === false ? "✕" : "·"}
                </span>
                <span className="truncate">{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "tier":
      return (
        <div className="animate-rise my-2 flex items-center gap-3 rounded-[4px] border border-cleared/30 bg-cleared-ink px-3.5 py-2.5">
          <TierChip tier={event.tier} />
          <span className="font-mono text-[11px] text-ink">{event.note}</span>
        </div>
      );
    default:
      return null;
  }
}

function StepChip({ event }: { event: Extract<ChatEventT, { kind: "step" }> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="animate-rise py-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-fit max-w-full items-center gap-2.5 rounded-[4px] border border-ink/15 bg-card px-2.5 py-1.5 text-left transition-colors hover:border-line2 focus-visible:outline-2 focus-visible:outline-ink"
        aria-expanded={open}
      >
        {/* the adapter rides as a chip — the agent's own green, the same
            token the demo player renders */}
        <span className="shrink-0 rounded-[3px] border border-cleared/40 bg-cleared/10 px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-cleared">
          {event.adapter}
        </span>
        <span className="font-mono text-[11.5px] text-ink">{event.tool}</span>
        <span className="hidden truncate text-[11.5px] text-inksoft sm:inline">{event.summary}</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="tnum font-mono text-[10px] text-inksoft">{event.ms}ms</span>
          <span className={cn("text-[9px] text-inksoft transition-transform", open && "rotate-90")}>▸</span>
        </span>
      </button>
      {open && (
        <pre className="chat-scroll mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-[4px] border border-line bg-card px-3 py-2 font-mono text-[10px] leading-relaxed text-inksoft">
          {event.detail || "(no wire — direct in-process call)"}
        </pre>
      )}
    </div>
  );
}

function MandateCard({
  event,
  onSend,
}: {
  event: Extract<ChatEventT, { kind: "mandate" }>;
  onSend: (t: string) => void;
}) {
  const m = event.mandate;
  const [left, setLeft] = useState(Math.max(0, Math.round((m.expiresAtMs - Date.now()) / 1000)));
  return (
    <div className="animate-rise my-3 rounded-[4px] border border-line bg-card">
      <div className="flex items-start justify-between border-b border-line px-4 py-3">
        <div>
          <div className="label-caps">merchant desk · spending mandate</div>
          <div className="mt-1 font-display text-lg font-medium text-ink">{inr(m.amountCapPaise)} envelope</div>
        </div>
        <TierChip tier={m.tier} />
      </div>
      <div className="px-4 py-2">
        {m.items.map((l: { productId: string; name: string; quantity: number; unitPricePaise: number }) => (
          <ManifestRow key={l.productId} left={`${l.name} × ${l.quantity}`} right={inr(l.unitPricePaise * l.quantity)} />
        ))}
        <ManifestRow
          left={`expires in ${Math.floor(left / 60)}m ${left % 60}s`}
          right={m.humanApproved ? "human: approved" : "human: not required"}
          mono
        />
        <ManifestRow left="signature (ed25519)" right={m.signature} mono />
        <ManifestRow left="desk fingerprint" right={m.fingerprint} mono />
      </div>
      {event.pendingApproval && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <span className="text-[12.5px] text-inksoft">buyer principal must approve the envelope</span>
          <InkButton
            onClick={() => onSend("approve")}
            title="Approve the mandate envelope and bind"
            ariaLabel="approve the mandate envelope and bind"
            className="h-9"
          >
            Approve &amp; bind
          </InkButton>
        </div>
      )}
      <Timer expiresAtMs={m.expiresAtMs} onTick={setLeft} />
    </div>
  );
}

function Timer({ expiresAtMs, onTick }: { expiresAtMs: number; onTick: (s: number) => void }) {
  useEffect(() => {
    onTick(Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000)));
    const i = setInterval(() => onTick(Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000))), 1000);
    return () => clearInterval(i);
  }, [expiresAtMs, onTick]);
  return null;
}

function GateCard({ event }: { event: Extract<ChatEventT, { kind: "gate" }> }) {
  const d = event.decision;
  const kind = d.kind === "ALLOW" ? "cleared" : d.kind === "REFUSE" ? "refused" : "held";
  return (
    <div className={cn("animate-rise my-2 rounded-[4px] border bg-card", kind === "refused" ? "border-refused/40" : kind === "held" ? "border-held/40" : "border-line")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="label-caps">gate decision</span>
          <span className="font-mono text-[11px] text-inksoft">{monoId(event.orderId, 16)}</span>
        </div>
        <Stamp kind={kind}>
          {d.kind === "ALLOW" ? "CLEARED" : d.kind === "REFUSE" ? "REFUSED" : "HOLD"}
          {d.code ? ` · ${d.code}` : ""}
        </Stamp>
      </div>
      <ul className="px-3.5 py-2">
        {d.checks.map((c, i) => (
          <li key={i} className="flex items-baseline gap-2.5 border-b border-line/60 py-1.5 last:border-b-0">
            <span
              className={cn(
                "w-4 shrink-0 text-center font-mono text-[11px] font-bold",
                c.pass === true && "text-cleared",
                c.pass === false && "text-refused",
                c.pass === null && "text-inksoft"
              )}
            >
              {c.pass === true ? "✓" : c.pass === false ? "✕" : "·"}
            </span>
            <span className="shrink-0 text-[12px] font-medium text-ink">{c.label}</span>
            <span className="min-w-0 truncate text-[11.5px] text-inksoft">{c.detail}</span>
          </li>
        ))}
      </ul>
      {d.kind !== "REFUSE" && d.totalPaise > 0 && (
        <div className="flex items-baseline justify-between border-t border-line px-3.5 py-2">
          <span className="label-caps">server-computed total</span>
          <span className="tnum font-mono text-[15px] font-semibold text-ink">{inr(d.totalPaise)}</span>
        </div>
      )}
    </div>
  );
}
