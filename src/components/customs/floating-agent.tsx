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
import { DeskHead } from "./bits";
import type { View } from "./shell";
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

type Toast = "idle" | "blue" | "green" | "done";

/**
 * TypeLine — the desk's voice arrives like speech: a smooth left-to-right
 * reveal (~80 chars/s), not a paste. Respects reduced-motion (instant).
 */
function TypeLine({ text, className }: { text: string; className?: string }) {
  const instant =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [n, setN] = useState(instant ? text.length : 0);
  useEffect(() => {
    if (instant) return;
    const iv = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(iv);
          return v;
        }
        return Math.min(v + 2, text.length);
      });
    }, 24);
    return () => clearInterval(iv);
  }, [text, instant]);
  return <span className={className}>{text.slice(0, n)}</span>;
}

export function FloatingAgent({ view }: { view: View }) {
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
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  /* the fresh page: the conversation fades before it clears — a reset
     should read as turning a sheet over, not a wipe */
  const [clearing, setClearing] = useState(false);
  /* the home-page toasts, a two-beat sequence: blue, then green. They
     run once per load, only on home, and only after the page has fully
     loaded — a toast before the stage is set is noise. */
  const [toast, setToast] = useState<Toast>("idle");

  /* the panel minds itself: it closes on outside click, and if a visitor
     walks away mid-thought, it closes itself after 45 quiet seconds */
  const armAutoClose = () => {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => setOpen(false), 45_000);
  };
  useEffect(() => {
    if (!open) {
      if (idleRef.current) clearTimeout(idleRef.current);
      return;
    }
    armAutoClose();
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

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

  /* the toast sequence — armed ONCE on load, immune to phase changes.
     The old version scheduled all three toasts in an effect keyed on
     `toast`, so the blue phase's own cleanup cancelled green's timer
     before it could fire: blue showed, green never did. Now the
     sequence runs to completion unless the component unmounts. */
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) =>
      timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    const arm = () => {
      at(900, () => setToast("blue"));
      at(7200, () => setToast("green"));
      at(13500, () => setToast("done"));
    };
    if (document.readyState === "complete") arm();
    else {
      window.addEventListener("load", arm, { once: true });
      at(4000, () => {
        if (document.readyState !== "complete") arm();
      });
    }
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [open, lines]);

  /* esc closes the panel — the same courtesy the composer's "/" opens it with */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const resetChat = () => {
    if (clearing) return;
    setClearing(true);
    setTimeout(() => {
      setLines([]);
      setSessionId(null);
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {
        /* private mode: nothing was stored anyway */
      }
      setClearing(false);
    }, 260);
  };

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
    <div ref={wrapRef} className="fixed z-50 select-none" style={{ left: pos.x, top: pos.y }}>
      {open && (
        <div
          className="absolute right-0 flex max-h-[470px] w-[330px] flex-col overflow-hidden rounded-[6px] border border-line-strong bg-card"
          style={panelBelow ? { top: "72px" } : { bottom: "84px" }}
          role="dialog"
          aria-label="the desk agent chat"
        >
          {/* the header: the head IS the identity, the status is one dot */}
          <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5">
            <DeskHead size={24} thinking={busy} className="text-ink" />
            <div className="flex-1">
              <div className="label-caps">desk agent</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-inksoft">
                <span aria-hidden className={cn("h-1 w-1 rounded-full", busy ? "bg-held" : "bg-cleared/80")} />
                {busy ? "thinking" : "on the desk"}
              </div>
            </div>
            <button
              onClick={resetChat}
              aria-label="fresh page — clear this conversation"
              title="fresh page"
              className="px-0.5 text-[12px] leading-none text-inksoft transition-colors hover:text-ink"
            >
              ↻
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="close the agent chat"
              className="text-[13px] leading-none text-inksoft transition-colors hover:text-ink"
            >
              ✕
            </button>
          </div>

          {/* the conversation: the visitor's words are the only filled
              surface — the desk's voice sits straight on the ground,
              unhoused, the way x.ai lets answers breathe */}
          <div
            ref={bodyRef}
            role="log"
            aria-live="polite"
            className={cn(
              "flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3 transition-opacity duration-300",
              clearing && "opacity-0"
            )}
            style={{ maxHeight: "330px" }}
          >
            {lines.length === 0 && !clearing && (
              <p className="animate-rise py-4 text-center text-[12px] leading-relaxed text-inksoft">
                The desk is open. Shopping runs on the house brain — ask it
                for something, or just say hi.
              </p>
            )}
            {lines.map((l) =>
              l.who === "user" ? (
                <div key={l.id} className="animate-rise flex justify-end">
                  <div className="max-w-[85%] rounded-[4px] bg-ink px-2.5 py-1.5 text-[12.5px] text-paper">{l.text}</div>
                </div>
              ) : l.who === "agent" ? (
                <p key={l.id} className="animate-rise text-[12.5px] leading-relaxed text-ink">
                  <TypeLine text={l.text} />
                </p>
              ) : (
                <p key={l.id} className="animate-rise border-l border-line pl-2 font-mono text-[10.5px] leading-relaxed text-inksoft">
                  {l.text}
                </p>
              )
            )}
            {busy && <p className="animate-rise text-[11px] text-inksoft">the desk is working…</p>}
          </div>

          {/* the composer: a sunken well, one arrow — nothing else */}
          <form onSubmit={send} className="border-t border-line p-2.5">
            <div className="flex items-center gap-2 rounded-[4px] border border-line2 bg-paper2 px-2.5 py-1.5 transition-colors focus-within:border-ink/30">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => {
                setInput(e.target.value);
                armAutoClose();
              }}
                placeholder="ask the desk…"
                aria-label="message the desk agent"
                className="h-6 flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-inksoft/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="send to the desk agent"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] bg-ink text-paper transition-opacity hover:opacity-90 disabled:opacity-30"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M8 13V3M4 7l4-4 4 4" />
                </svg>
              </button>
            </div>
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
        className="relative z-10 block cursor-grab touch-none active:cursor-grabbing"
      >
        <DeskHead size={56} thinking={busy} className={cn("text-ink transition-transform", open ? "scale-105" : "hover:scale-105")} />
      </button>

      {/* the game toasts — home only, once per load: Razorpay blue first,
          then the green. Both peek from behind the head and tuck away. */}
      {toast === "blue" && (
        <div className="agent-badge pointer-events-none absolute bottom-auto right-[calc(100%+14px)] top-[-8px] z-0" aria-hidden>
          <span className="flex w-[96px] -rotate-2 flex-col items-center rounded-[4px] bg-[#3395FF] px-2 py-1.5 text-center font-sans text-[9.5px] font-semibold leading-tight tracking-[0.02em] text-white">
            <span>Built for</span>
            <span>Razorpay</span>
          </span>
        </div>
      )}
      {toast === "green" && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-auto right-[calc(100%+14px)] top-[-8px] z-0 transition-opacity duration-500",
            view === "home" ? "opacity-100" : "opacity-0"
          )}
          aria-hidden
        >
          <span className="agent-badge flex w-[96px] rotate-2 flex-col items-center rounded-[4px] bg-[#2aa06a] px-2 py-1.5 text-center font-sans text-[9.5px] font-semibold leading-tight tracking-[0.02em] text-white">
            <span>now we can</span>
            <span>finally pay</span>
          </span>
        </div>
      )}
    </div>
  );
}
