"use client";

/**
 * floating-agent.tsx — the everywhere-agent. The desk head, draggable to
 * any corner, present on every view; click opens a mini chat where real
 * shopping runs through the same engine as the counter.
 *
 * Quota discipline is the design: every shopping command is caught by the
 * regex brain (zero tokens); only casual questions can reach the LLM, on
 * the cheap model, with a tiny prompt and a hard token ceiling. No key —
 * no chat, and the desk says so calmly.
 *
 * Drag is pointer-based with a 4px travel threshold, so a drag never
 * becomes a click; the position persists per browser.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DeskHead, InkButton } from "./bits";
import type { ChatEvent } from "@/lib/customs/agent/loop";

const POS_KEY = "customs-agent-pos";
const SESSION_KEY = "customs-agent-session";

interface Line {
  id: number;
  who: "user" | "agent" | "note";
  text: string;
}

/* events → one-line summaries: the mini panel reads like a receipt, not
   a second control room */
function summarize(events: ChatEvent[], startId: number): Line[] {
  const out: Line[] = [];
  let id = startId;
  for (const e of events) {
    if ("role" in e) {
      if (e.role === "agent" && e.text) out.push({ id: id++, who: "agent", text: e.text });
      continue;
    }
    if (e.kind === "products" && e.products.length) {
      out.push({ id: id++, who: "note", text: e.products.map((p) => `${p.name} ₹${(p.pricePaise / 100).toLocaleString("en-IN")}`).join(" · ") });
    } else if (e.kind === "cart") {
      out.push({ id: id++, who: "note", text: `cart · ${e.lines.map((l) => `${l.name} ×${l.quantity}`).join(", ")} — ₹${(e.totalPaise / 100).toLocaleString("en-IN")}` });
    } else if (e.kind === "tier") {
      out.push({ id: id++, who: "note", text: `${e.tier.toLowerCase()} — ${e.note}` });
    } else if (e.kind === "mandate") {
      out.push({ id: id++, who: "note", text: `mandate · ${e.mandate.amountCapPaise / 100} envelope · approve to bind` });
    } else if (e.kind === "payment") {
      out.push({ id: id++, who: "note", text: `payment ${e.status} · ₹${(e.totalPaise / 100).toLocaleString("en-IN")}` });
    } else if (e.kind === "receipt") {
      out.push({ id: id++, who: "note", text: `receipt ${e.manifestNo} · ₹${(e.totalPaise / 100).toLocaleString("en-IN")}` });
    }
  }
  return out;
}

export function FloatingAgent() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [panelBelow, setPanelBelow] = useState(false);
  const headRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(1);
  const drag = useRef({ active: false, moved: false, px: 0, py: 0, ox: 0, oy: 0 });

  /* position: restored, or docked bottom-right on first visit */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { x: number; y: number };
        if (typeof p.x === "number" && typeof p.y === "number") {
          setPos({
            x: Math.min(Math.max(8, p.x), window.innerWidth - 64),
            y: Math.min(Math.max(8, p.y), window.innerHeight - 120),
          });
          return;
        }
      }
    } catch {
      /* private mode: dock default, no persistence */
    }
    setPos({ x: window.innerWidth - 88, y: window.innerHeight - 150 });
  }, []);

  useEffect(() => {
    if (pos) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(pos));
      } catch {
        /* no persistence in private mode */
      }
      setPanelBelow(pos.y < 400);
    }
  }, [pos]);

  useEffect(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (s) setSessionId(s);
    } catch {
      /* fresh session */
    }
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [open, lines]);

  /* drag vs click: a drag moves the head, a still press toggles the panel */
  const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    drag.current = { active: true, moved: false, px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active || !pos) return;
    const dx = e.clientX - drag.current.px;
    const dy = e.clientY - drag.current.py;
    if (!drag.current.moved && Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    if (drag.current.moved) {
      setPos({
        x: Math.min(Math.max(8, drag.current.ox + dx), window.innerWidth - 64),
        y: Math.min(Math.max(8, drag.current.oy + dy), window.innerHeight - 120),
      });
    }
  };
  const onUp = () => {
    if (drag.current.active && !drag.current.moved) setOpen((v) => !v);
    drag.current.active = false;
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setBusy(true);
    setInput("");
    setLines((p) => [...p, { id: idRef.current++, who: "user", text: message }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, message, adapter: "naive" }),
      });
      const data = (await res.json()) as { ok: boolean; sessionId: string; events: ChatEvent[]; error?: string };
      if (data.ok) {
        setSessionId(data.sessionId);
        try {
          localStorage.setItem(SESSION_KEY, data.sessionId);
        } catch {
          /* session won't survive a refresh in private mode */
        }
        setLines((p) => [...p, ...summarize(data.events, idRef.current)]);
        idRef.current += summarize(data.events, idRef.current).length;
      } else {
        setLines((p) => [...p, { id: idRef.current++, who: "agent", text: "The desk hit a snag — try again." }]);
      }
    } catch {
      setLines((p) => [...p, { id: idRef.current++, who: "agent", text: "Network error reaching the desk." }]);
    } finally {
      setBusy(false);
    }
  };

  if (!pos) return null;

  return (
    <div className="fixed z-50 select-none" style={{ left: pos.x, top: pos.y }}>
      {open && (
        <div
          className="absolute right-0 flex max-h-[430px] w-[300px] flex-col overflow-hidden rounded-[6px] border border-line bg-card"
          style={panelBelow ? { top: "72px" } : { bottom: "84px" }}
          role="dialog"
          aria-label="the desk agent chat"
        >
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="label-caps">the desk agent</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="close the agent chat"
              className="text-[12px] text-inksoft transition-colors hover:text-ink"
            >
              ✕
            </button>
          </div>
          <div ref={bodyRef} role="log" aria-live="polite" className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2.5" style={{ maxHeight: "300px" }}>
            {lines.length === 0 && (
              <p className="py-3 text-center text-[12px] leading-relaxed text-inksoft">
                The desk is open. Shopping runs on the house brain — ask it
                for something, or just say hi.
              </p>
            )}
            {lines.map((l) =>
              l.who === "user" ? (
                <div key={l.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-[4px] bg-ink px-2.5 py-1.5 text-[12px] text-paper">{l.text}</div>
                </div>
              ) : l.who === "agent" ? (
                <div key={l.id} className="max-w-[92%] rounded-[4px] border border-line bg-paper2/60 px-2.5 py-1.5 text-[12px] leading-relaxed text-ink">
                  {l.text}
                </div>
              ) : (
                <div key={l.id} className="font-mono text-[10.5px] leading-relaxed text-inksoft">{l.text}</div>
              )
            )}
            {busy && (
              <div className="flex items-center gap-2 px-1 py-1">
                <DeskHead size={20} thinking className="text-ink" />
                <span className="text-[11px] text-inksoft">the desk is working</span>
              </div>
            )}
          </div>
          <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ask the desk…"
              aria-label="message the desk agent"
              className="h-8 flex-1 rounded-[4px] border border-line2 bg-paper2 px-2.5 text-[12px] text-ink placeholder:text-inksoft/60 focus:border-ink/30 focus:outline-none"
            />
            <InkButton type="submit" disabled={busy || !input.trim()} ariaLabel="send to the desk agent" className="h-8 px-2.5 text-[11px]">
              Send
            </InkButton>
          </form>
        </div>
      )}

      <button
        ref={headRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        aria-label="the desk agent — drag to move, click to chat"
        title="the desk agent — drag me, click to chat"
        className="block cursor-grab touch-none active:cursor-grabbing"
      >
        <DeskHead size={56} thinking={busy} className={cn("text-ink drop-shadow-none transition-transform", open ? "scale-105" : "hover:scale-105")} />
      </button>

      <div className="agent-pill pointer-events-none mt-1 flex justify-center" aria-hidden>
        <span className="rounded-[3px] border border-line bg-card px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-inksoft/80">
          powered by razorpay
        </span>
      </div>
    </div>
  );
}
