"use client";

/**
 * chat-events.tsx — renders one ChatEvent from the agent loop.
 * The transparency IS the product: intent, tool calls with wire envelopes,
 * the gate's checklist, the rail, the manifest — all visible inline.
 */
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { inr, Stamp, TierChip, GhostButton, monoId, ManifestRow } from "./bits";
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
        <code key={key++} className="rounded-sm border border-line bg-paper2 px-1 font-mono text-[0.85em]">
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
        {!isUser && (
          <span
            aria-hidden
            className="stamp mt-0.5 h-7 w-7 shrink-0 rotate-[-6deg] items-center justify-center border-[2px] border-ink text-[8px] text-ink"
          >
            C
          </span>
        )}
        <div
          className={cn(
            "max-w-[82%] rounded-sm border px-3.5 py-2.5 text-[13.5px] leading-relaxed",
            isUser
              ? "border-ink bg-ink text-paper"
              : "doc border-line text-ink"
          )}
        >
          {isUser ? event.text : rich(event.text)}
          <div className={cn("mt-1 font-mono text-[9px] tracking-wide", isUser ? "text-paper/60" : "text-inksoft/70")}>
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
                className="doc group overflow-hidden border-line text-left transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--line-strong)] focus-visible:outline-2 focus-visible:outline-ink"
              >
                {/* product photo — plain img: local files, fixed sizes, no remote optimizer */}
                <img
                  src={p.image}
                  alt={p.name}
                  width={640}
                  height={480}
                  loading="lazy"
                  className="aspect-[4/3] w-full border-b border-line object-cover grayscale-[0.15] transition-all group-hover:grayscale-0"
                />
                <div className="px-3 py-2">
                  <div className="truncate font-mono text-[11px] font-semibold text-ink">{p.name}</div>
                  <div className="flex items-baseline justify-between">
                    <span className="tnum text-[13px] font-semibold text-ink">{inr(p.pricePaise)}</span>
                    <span className="label-caps opacity-0 transition-opacity group-hover:opacity-100">add to cart</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {event.note && <div className="mt-1.5 font-mono text-[10px] text-inksoft">{event.note}</div>}
        </div>
      );
    case "cart":
      return (
        <div className="animate-rise doc my-2 border-line px-3.5 py-2">
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
        <div className="animate-rise my-2 flex items-center justify-between gap-3 rounded-sm border border-line2 bg-paper2/70 px-3.5 py-2.5">
          <div className="flex items-center gap-3">
            {event.status === "captured" && (
              <Stamp kind={event.simulated ? "sim" : "cleared"}>
                {event.simulated ? "SIMULATED CAPTURE" : "CAPTURED · TEST MODE"}
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
        <div className="animate-rise doc my-3 border-line2">
          <div className="flex items-start justify-between border-b border-line px-4 py-3">
            <div>
              <div className="label-caps">fieldnote supply · manifest of entry</div>
              <div className="font-display text-lg font-medium text-ink">Receipt</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[11px] text-inksoft">{event.manifestNo}</div>
              <div className="font-mono text-[10px] text-inksoft">{monoId(event.orderId, 20)}</div>
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
          <div className="flex items-center justify-between border-t border-dashed border-line2 px-4 py-3">
            <span className="font-mono text-[9px] leading-tight text-inksoft">
              cleared by customs · hash-chained in ledger
              <br />
              replay span-by-span from the control room
            </span>
            <Stamp kind="cleared" rotate={-4}>CLEARED</Stamp>
          </div>
        </div>
      );
    case "attack":
      return (
        <div className="animate-rise my-2 rounded-sm border-2 border-dashed border-refused/50 bg-refused-ink/30 px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-refused">
              RED TEAM · {event.label}
            </span>
            <Stamp kind={event.verdict === "BLOCKED" ? "cleared" : "refused"}>{event.verdict}</Stamp>
          </div>
          {event.code && (
            <div className="mt-1 font-mono text-[10px] text-inksoft">
              reason code: <span className="font-semibold text-refused">{event.code}</span>
            </div>
          )}
          <ul className="mt-2 grid gap-1">
            {event.checks.map((c: { label: string; pass: boolean | null; detail: string }, i: number) => (
              <li key={i} className="flex items-baseline gap-2 font-mono text-[10px] text-inksoft">
                <span className={cn("w-3 shrink-0", c.pass === true && "text-cleared", c.pass === false && "text-refused")}>
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
        <div className="animate-rise my-2 flex items-center gap-3 rounded-sm border border-cleared/50 bg-cleared-ink/30 px-3.5 py-2.5">
          <TierChip tier={event.tier} />
          <span className="text-[12px] text-ink">{event.note}</span>
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
        className="flex w-full items-center gap-2.5 rounded-sm border border-line bg-paper2/50 px-3 py-1.5 text-left transition-colors hover:border-line2 focus-visible:outline-2 focus-visible:outline-ink"
        aria-expanded={open}
      >
        <span className={cn("font-mono text-[9px] font-bold tracking-[0.1em]", event.adapter === "naive" && "text-inksoft", event.adapter === "mcp" && "text-held", event.adapter === "acp" && "text-cleared")}>
          {event.adapter.toUpperCase()}
        </span>
        <span className="font-mono text-[11px] text-ink">{event.tool}</span>
        <span className="truncate font-mono text-[10px] text-inksoft">{event.summary}</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="tnum font-mono text-[10px] text-inksoft">{event.ms}ms</span>
          <span className={cn("text-[9px] text-inksoft transition-transform", open && "rotate-90")}>▸</span>
        </span>
      </button>
      {open && (
        <pre className="chat-scroll mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-sm border border-line bg-card px-3 py-2 font-mono text-[10px] leading-relaxed text-inksoft">
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
    <div className="animate-rise doc my-3 border-line2">
      <div className="flex items-start justify-between border-b border-line px-4 py-3">
        <div>
          <div className="label-caps">merchant desk · spending mandate</div>
          <div className="font-display text-lg font-medium">{inr(m.amountCapPaise)} envelope</div>
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
        <div className="flex items-center justify-between border-t border-dashed border-line2 px-4 py-3">
          <span className="font-mono text-[10px] text-inksoft">buyer principal must approve the envelope</span>
          <GhostButton
            onClick={() => onSend("approve")}
            className="h-9 border-ink bg-ink text-paper hover:text-paper"
          >
            Approve &amp; bind
          </GhostButton>
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
    <div className={cn("animate-rise doc my-2", kind === "refused" && "border-refused/40", kind === "held" && "border-held/40")}>
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
          <li key={i} className="flex items-baseline gap-2 border-b border-line/60 py-1.5 last:border-b-0">
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
            <span className="shrink-0 font-mono text-[11px] font-medium text-ink">{c.label}</span>
            <span className="min-w-0 truncate font-mono text-[10px] text-inksoft">{c.detail}</span>
          </li>
        ))}
      </ul>
      {d.kind !== "REFUSE" && d.totalPaise > 0 && (
        <div className="flex items-baseline justify-between border-t border-dashed border-line2 px-3.5 py-2">
          <span className="label-caps">server-computed total</span>
          <span className="tnum text-[15px] font-semibold text-ink">{inr(d.totalPaise)}</span>
        </div>
      )}
    </div>
  );
}
