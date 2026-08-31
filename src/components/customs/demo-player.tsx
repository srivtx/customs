"use client";

/**
 * demo-player.tsx — the golden path, played live by the page itself.
 *
 * Not a recording: every beat below is rendered by the same design system
 * as the product, so it is crisp at any resolution, weighs nothing, and
 * never fuzzes. The sequence is the real story — intent, search, tier
 * refusal, attestation, mandate, approval, the ten-check gate, capture,
 * and the ledger line landing. It loops; hovering holds it still.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";
import { Stamp } from "./bits";

/* ------------------------------ the script ------------------------------ */

type Beat =
  | { t: "user"; text: string; hold?: number }
  | { t: "tool"; tag: string; text: string }
  | { t: "say"; text: string }
  | { t: "product"; name: string; price: string; note: string; image: string }
  | { t: "cart"; name: string; qty: number; price: string; image: string }
  | { t: "refuse"; code: string; note: string }
  | { t: "tier"; tier: string; note: string }
  | { t: "mandate"; cap: string; sig: string }
  | { t: "gate"; checks: string[] }
  | { t: "capture"; order: string; amount: string }
  | { t: "ledger"; order: string; amount: string; status: string };

const GATE_CHECKS = [
  "signature verifies (ed25519, canonical)",
  "mandate unexpired · 29m left",
  "items in allowlist · quantities ok",
  "unit prices re-checked at bind",
  "total within tier · within cap",
  "≥ ₹10,000? no — under the desk line",
  "payment not a replay",
];

const SCRIPT: (Beat & { hold?: number })[] = [
  { t: "user", text: "get me the bud-pro earbuds", hold: 900 },
  { t: "tool", tag: "AGENT", text: "catalog.search(\"bud-pro\") → 1 match" },
  { t: "product", name: "Bud-Pro Earbuds", price: "₹3,499", note: "24h battery · anc · usb-c", image: "/products/bud-pro-earbuds.jpg" },
  { t: "user", text: "add 2 to my cart", hold: 700 },
  { t: "cart", name: "Bud-Pro Earbuds", qty: 2, price: "₹6,998", image: "/products/bud-pro-earbuds.jpg" },
  { t: "refuse", code: "AMOUNT_OVER_TIER", note: "₹6,998 exceeds the ₹500 unverified envelope" },
  { t: "say", text: "The desk refuses politely. Escalate trust — say \"attest\" and the envelope rises to ₹5,000." },
  { t: "user", text: "attest", hold: 500 },
  { t: "tier", tier: "ATTESTED", note: "envelope raised to ₹5,000 per transaction" },
  { t: "say", text: "Escalated. Requesting a spending mandate from the desk…" },
  { t: "mandate", cap: "₹6,998", sig: "ed25519:z3Fq…9cA" },
  { t: "say", text: "The principal must approve this envelope before anything binds." },
  { t: "user", text: "approve", hold: 600 },
  { t: "gate", checks: GATE_CHECKS, hold: 260 },
  { t: "capture", order: "ord_7f3k29", amount: "₹6,998" },
  { t: "ledger", order: "ord_7f3k29", amount: "₹6,998", status: "captured" },
];

/* beat durations (ms) — the pacing of the loop */
const BEAT_MS = 620;
const TYPE_MS = 34;
const GATE_STEP_MS = 300;
const LOOP_HOLD_MS = 3400;

/* ------------------------------ the player ------------------------------ */

interface Played {
  beat: Beat & { hold?: number };
  typed: string; // typed-so-far for user beats
  gateN: number; // checks ticked so far for gate beats
}

export function DemoPlayer() {
  const reduce = useReducedMotion();
  const [played, setPlayed] = useState<Played[]>([]);
  const [done, setDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pausedRef = useRef(false);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  /** a timer that holds while the visitor hovers — every beat waits politely */
  const later = (fn: () => void, ms: number) => {
    const tick = () => {
      if (pausedRef.current) {
        timers.current.push(setTimeout(tick, 200));
        return;
      }
      fn();
    };
    timers.current.push(setTimeout(tick, ms));
  };

  const start = () => {
    clearTimers();
    setPlayed([]);
    setDone(false);
    if (reduce) {
      setPlayed(SCRIPT.map((beat) => ({ beat, typed: "text" in beat ? beat.text : "", gateN: 99 })));
      setDone(true);
      return;
    }

    let i = 0;
    const runBeat = (beat: Beat & { hold?: number }) => {
      const entry: Played = { beat, typed: "", gateN: 0 };
      setPlayed((p) => [...p, entry]);

      // typing effect for user beats
      if (beat.t === "user") {
        let c = 0;
        const typeNext = () => {
          c += 1;
          setPlayed((p) => {
            const copy = [...p];
            copy[copy.length - 1] = { ...copy[copy.length - 1], typed: beat.text.slice(0, c) };
            return copy;
          });
          if (c < beat.text.length) later(typeNext, TYPE_MS);
        };
        later(typeNext, 240);
      }
      // gate checks tick in one by one
      if (beat.t === "gate") {
        let n = 0;
        const tick = () => {
          n += 1;
          setPlayed((p) => {
            const copy = [...p];
            copy[copy.length - 1] = { ...copy[copy.length - 1], gateN: n };
            return copy;
          });
          if (n < beat.checks.length) later(tick, GATE_STEP_MS);
        };
        later(tick, 320);
      }

      later(() => {
        i += 1;
        if (i < SCRIPT.length) runBeat(SCRIPT[i]);
        else {
          setDone(true);
          later(start, LOOP_HOLD_MS);
        }
      }, Math.max(BEAT_MS, beat.hold ?? 0));
    };

    runBeat(SCRIPT[0]);
  };

  // pause-on-hover: flip the ref the timers watch
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  /* run only when on screen; restart when re-entering view */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const on = entries.some((e) => e.isIntersecting);
        setVisible((was) => {
          if (on && !was) start();
          if (!on) clearTimers();
          return on;
        });
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimers();
    };
  }, []);  

  /* keep the transcript pinned to the newest beat */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [played, reduce]);

  const restart = () => {
    clearTimers();
    start();
  };

  return (
    <div
      ref={boxRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="doc overflow-hidden"
      role="region"
      aria-label="the golden path, played live — agent search, tier refusal, mandate, gate checks, capture, ledger"
    >
      {/* panel header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="label-caps">
          one agent · one mandate · one receipt — rendered live, not recorded
        </span>
        <div className="flex items-center gap-2.5">
          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", done ? "bg-cleared" : "bg-held animate-pulse")} />
          <button
            onClick={restart}
            className="rounded-[4px] border border-line2 px-2 py-0.5 text-[11.5px] font-medium text-inksoft transition-colors hover:border-ink/30 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="replay the golden path"
          >
            ↻ replay
          </button>
        </div>
      </div>

      {/* the transcript — every beat is one of two shapes: a quiet
          hairline block (what is said) or a hairline card (what the
          desk produces). No bubbles, no second border style. */}
      <div
        ref={scrollRef}
        className="chat-scroll h-[460px] space-y-2.5 overflow-y-auto px-4 py-4 sm:px-5"
        aria-live="off"
      >
        {played.map((p, i) => (
          <BeatView key={i} p={p} last={i === played.length - 1} />
        ))}
      </div>

      {/* the loop bar — the whole sequence, one hairline of progress.
          Set in the house sans, like any caption — the mono voice is
          for machine strings, and this is prose. */}
      <div className="border-t border-line px-4 py-2.5">
        <div className="flex items-center justify-between text-[12px] text-inksoft">
          <span className="truncate">intent → search → refusal → attest → mandate → approve → gate → capture → ledger</span>
          <span className="shrink-0 pl-4">{paused && visible ? "held — move away to resume" : done ? "looping" : "playing"}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ beat renderers ------------------------------ */

function BeatView({ p, last }: { p: Played; last: boolean }) {
  const b = p.beat;
  const cls = "animate-rise";
  switch (b.t) {
    case "user":
      return (
        <div className={cn(cls, "flex justify-end")}>
          {/* the buyer's intent — a logged input, right-aligned. Same
              hairline, same 4px, same lift as everything else on the desk. */}
          <div className="max-w-[78%] rounded-[4px] border border-line bg-ink/[0.04] px-3.5 py-2 text-[13px] text-ink">
            <span className={last && p.typed.length < b.text.length ? "type-caret" : undefined}>{p.typed}</span>
          </div>
        </div>
      );
    case "tool":
      return (
        <div className={cn(cls, "flex items-center gap-2.5 rounded-[4px] border border-ink/20 bg-ink/[0.03] px-3 py-1.5")}>
          {/* the tag is a chip in plain ink — black on white, exactly the
              button style; the verdict colors are reserved for verdicts */}
          <span className="shrink-0 rounded-[3px] border border-ink/25 bg-ink/[0.05] px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-ink">{b.tag}</span>
          <ToolText text={b.text} />
        </div>
      );
    case "say":
      return (
        <div className={cn(cls, "max-w-[88%] px-1 py-0.5 text-[13px] leading-relaxed text-inksoft")}>{b.text}</div>
      );
    case "product":
      return (
        <div className={cn(cls, "flex max-w-[420px] items-center gap-3 rounded-[4px] border border-line bg-card p-3")}>
          {/* the real product photo — the same asset the playground serves */}
          <img
            src={b.image}
            alt={b.name}
            width={112}
            height={112}
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-[4px] border border-line object-cover"
          />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-ink">{b.name}</div>
            <div className="text-[11.5px] text-inksoft">{b.note}</div>
          </div>
          <div className="tnum ml-auto shrink-0 font-mono text-[13px] font-semibold text-ink">{b.price}</div>
        </div>
      );
    case "cart":
      return (
        <div className={cn(cls, "flex max-w-[420px] items-center gap-3 rounded-[4px] border border-line bg-card px-3.5 py-2")}>
          <img
            src={b.image}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            className="h-7 w-7 shrink-0 rounded-[3px] border border-line object-cover"
          />
          <div className="flex min-w-0 flex-1 items-baseline justify-between text-[12.5px]">
            <span className="truncate text-inksoft">
              {b.name} × {b.qty}
            </span>
            <span className="tnum font-mono font-semibold text-ink">{b.price}</span>
          </div>
        </div>
      );
    case "refuse":
      return (
        <div className={cn(cls, "flex max-w-[420px] items-center justify-between rounded-[4px] border border-refused/30 bg-refused-ink px-3.5 py-2")}>
          <span className="text-[12.5px] text-inksoft">{b.note}</span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-refused">{b.code}</span>
        </div>
      );
    case "tier":
      return (
        <div className={cn(cls, "flex max-w-[420px] items-center gap-3 rounded-[4px] border border-ink/20 bg-ink/[0.03] px-3.5 py-2")}>
          <span className="stamp border-ink/25 text-ink bg-ink/[0.05]">{b.tier}</span>
          <span className="text-[12.5px] text-inksoft">{b.note}</span>
        </div>
      );
    case "mandate":
      return (
        <div className={cn(cls, "max-w-[440px] rounded-[4px] border border-ink/20 bg-card")}>
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
            <span className="label-caps">spending mandate</span>
            <span className="tnum font-mono text-[13px] font-semibold text-ink">{b.cap} envelope</span>
          </div>
          <div className="flex items-baseline justify-between px-3.5 py-2 text-[12.5px]">
            <span className="text-inksoft">signature</span>
            <span className="font-mono text-ink">{b.sig}</span>
          </div>
        </div>
      );
    case "gate":
      return (
        <div className={cn(cls, "max-w-[480px] rounded-[4px] border border-ink/20 bg-card")}>
          <div className="border-b border-line px-3.5 py-2 label-caps">
            gate · bind-time checks
          </div>
          <ul className="px-3.5 py-2">
            {b.checks.slice(0, Math.max(1, p.gateN)).map((c, j) => (
              <li key={j} className="flex items-baseline gap-2.5 border-b border-line/60 py-1.5 last:border-b-0 text-[12.5px]">
                <span className={cn("shrink-0 font-mono font-semibold", j < p.gateN ? "text-cleared" : "text-inksoft")}>✓</span>
                <span className="text-inksoft">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "capture":
      return (
        <div className={cn(cls, "flex max-w-[440px] items-center justify-between rounded-[4px] border border-cleared/30 bg-cleared-ink px-3.5 py-2.5")}>
          <Stamp kind="cleared" animate={false}>captured · test</Stamp>
          <span className="tnum font-mono text-[15px] font-semibold text-ink">{b.amount}</span>
        </div>
      );
    case "ledger":
      return (
        <div className={cn(cls, "row-fresh flex items-center justify-between border-y border-line bg-paper2/50 px-3.5 py-2 text-[12.5px]")}>
          <span className="font-mono text-[11px] text-inksoft">{new Date(Date.now() - 1000).toLocaleTimeString("en-IN", { hour12: false })} · {b.order}</span>
          <span className="flex items-center gap-3">
            <span className="tnum font-mono text-ink">{b.amount}</span>
            <span className="font-mono font-semibold uppercase tracking-[0.1em] text-cleared">{b.status}</span>
          </span>
        </div>
      );
    default:
      return null;
  }
}

/** the tool line's text — a machine call in the ledger's own mono: the
    call in soft ink, the arrow and its result reach full ink, so the
    outcome is what your eye lands on. Black and white, like a receipt. */
function ToolText({ text }: { text: string }) {
  const at = text.indexOf("\u2192");
  if (at === -1) return <span className="truncate font-mono text-[11px] text-inksoft">{text}</span>;
  return (
    <span className="truncate font-mono text-[11px]">
      <span className="text-inksoft">{text.slice(0, at)}</span>
      <span className="text-ink">{text.slice(at, at + 1)}</span>
      <span className="text-ink">{text.slice(at + 1)}</span>
    </span>
  );
}
