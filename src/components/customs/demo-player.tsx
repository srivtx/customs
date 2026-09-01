"use client";

/**
 * demo-player.tsx — the golden path, played live by the page itself.
 *
 * Not a recording: every beat below is rendered by the same design system
 * as the product, so it is crisp at any resolution, weighs nothing, and
 * never fuzzes. The sequence is the real story — intent, search, tier
 * refusal, attestation, mandate, approval, the ten-check gate, capture,
 * and the ledger line landing. It loops; hovering holds it still.
 *
 * The transcript is a window, not a scroll region: the panel shows the
 * latest beats, older ones dissolving into the top fade. Nothing inside
 * this panel can scroll, so the page's own wheel and touch scrolling
 * pass straight through it — no sticking, no scrollbar to style.
 *
 * The smoothness: the window is bottom-pinned, so every arriving beat
 * (every unrolled gate check, every wrapped typed line) would move
 * everything above it by a whole card height in one frame — a
 * teleport the eye reads as “sudden”. Instead the stack is held at
 * its previous visual position for one frame (a transform) and then
 * glides to the new layout — the FLIP technique — so the whole
 * transcript flows like a real chat. Beats themselves arrive on a
 * longer, softer curve, the gate’s rows stagger in one by one, and
 * the loop fades its last line out before it clears the desk.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  { t: "product", name: "Bud Pro Earbuds", price: "₹4,999", note: "anc · wireless case · multipoint", image: "/products/bud-pro-earbuds.jpg" },
  { t: "user", text: "add to my cart", hold: 700 },
  { t: "cart", name: "Bud Pro Earbuds", qty: 1, price: "₹4,999", image: "/products/bud-pro-earbuds.jpg" },
  { t: "refuse", code: "AMOUNT_OVER_TIER", note: "₹4,999 is over the ₹500 walk-in envelope" },
  { t: "say", text: "That's over your current limit." },
  { t: "user", text: "attest", hold: 500 },
  { t: "tier", tier: "ATTESTED", note: "verified — up to ₹5,000 per transaction" },
  { t: "say", text: "Requesting a spending mandate from the desk…" },
  { t: "mandate", cap: "₹4,999", sig: "ed25519:z3Fq…9cA" },
  { t: "say", text: "Approve the envelope and I bind within its bounds." },
  { t: "user", text: "approve", hold: 600 },
  { t: "gate", checks: GATE_CHECKS, hold: 260 },
  { t: "capture", order: "ord_7f3k29", amount: "₹4,999" },
  { t: "ledger", order: "ord_7f3k29", amount: "₹4,999", status: "captured" },
];

/* beat durations (ms) — the pacing of the loop */
const BEAT_MS = 620;
const TYPE_MS = 34;
const GATE_STEP_MS = 300;
const LOOP_HOLD_MS = 3400;

/* how many beats the window keeps — older ones dissolve into the fade */
const WINDOW_BEATS = 7;

/* ------------------------------ the player ------------------------------ */

interface Played {
  id: number; // stable identity — updates target THIS entry, never "last"
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
  /* the loop's farewell: the last line fades before the desk clears,
     so the restart reads as a breath, not a cut */
  const [fading, setFading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pausedRef = useRef(false);
  /* the stack's layout position at the end of the last commit — the
     “first” of FLIP: where the transcript visually sat before the
     newest beat moved it */
  const stackTopRef = useRef<number | null>(null);
  /* the generation: every (re)start mints a new one, and every pending
     callback checks it before firing — so an old chain can never leak a
     beat or half-type a word into a fresh run (the StrictMode
     double-invoke, the tab-switch throttle, and the scroll-out clear
     all used to leave two chains racing in the same transcript) */
  const genRef = useRef(0);
  /* stable per-entry identity: the typing and gate-tick updaters target
     their own entry by id — the old code wrote into "the last entry",
     so when a beat advanced mid-type, the remaining characters leaked
     into the NEXT beat and the line stayed truncated (the "sometimes
     it shows the full text" glitch) */
  const seqRef = useRef(0);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  /** a timer that holds while the visitor hovers — every beat waits
      politely, and dies quietly if its generation was retired */
  const later = (fn: () => void, ms: number) => {
    const myGen = genRef.current;
    const tick = () => {
      if (myGen !== genRef.current) return;
      if (pausedRef.current) {
        timers.current.push(setTimeout(tick, 200));
        return;
      }
      fn();
    };
    timers.current.push(setTimeout(tick, ms));
  };

  const start = () => {
    genRef.current += 1; // retire every pending callback at once
    clearTimers();
    setPlayed([]);
    setDone(false);
    setFading(false);
    if (reduce) {
      setPlayed(SCRIPT.map((beat) => ({ id: (seqRef.current += 1), beat, typed: "text" in beat ? beat.text : "", gateN: 99 })));
      setDone(true);
      return;
    }

    let i = 0;
    const runBeat = (beat: Beat & { hold?: number }) => {
      const id = (seqRef.current += 1);
      const entry: Played = { id, beat, typed: "", gateN: 0 };
      setPlayed((p) => [...p, entry]);

      /* how long this beat owns the stage: long enough for its own
         animation to FINISH — typing completes, every gate row ticks —
         plus a reading beat. Fixed durations were the glitch: a long
         line was still typing when the beat advanced. */
      const ownMs =
        beat.t === "user"
          ? 240 + beat.text.length * TYPE_MS + 420
          : beat.t === "gate"
            ? 320 + beat.checks.length * GATE_STEP_MS + 520
            : Math.max(BEAT_MS, beat.hold ?? 0);

      // typing effect for user beats — targeted by id
      if (beat.t === "user") {
        let c = 0;
        const typeNext = () => {
          c += 1;
          setPlayed((p) => p.map((e) => (e.id === id ? { ...e, typed: beat.text.slice(0, c) } : e)));
          if (c < beat.text.length) later(typeNext, TYPE_MS);
        };
        later(typeNext, 240);
      }
      // gate checks tick in one by one — targeted by id
      if (beat.t === "gate") {
        let n = 0;
        const tick = () => {
          n += 1;
          setPlayed((p) => p.map((e) => (e.id === id ? { ...e, gateN: n } : e)));
          if (n < beat.checks.length) later(tick, GATE_STEP_MS);
        };
        later(tick, 320);
      }

      later(() => {
        i += 1;
        if (i < SCRIPT.length) runBeat(SCRIPT[i]);
        else {
          setDone(true);
          /* fade the last line out just before the loop clears the
             desk — a soft cut, and it obeys the hover-hold because it
             rides the same polite timer chain */
          later(() => setFading(true), Math.max(0, LOOP_HOLD_MS - 460));
          later(start, LOOP_HOLD_MS);
        }
      }, ownMs);
    };

    runBeat(SCRIPT[0]);
  };

  // pause-on-hover: flip the ref the timers watch
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  /* run only while on screen. The observer only sets state (pure —
     the old updater called start() inside setVisible, which React
     StrictMode double-invokes: two racing chains, the half-typed-word
     glitch). The effect below owns start/stop. */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* entering view starts the sequence; leaving retires it and stops
     the timers — one owner, one chain, ever */
  useEffect(() => {
    if (visible) start();
    else {
      genRef.current += 1;
      clearTimers();
    }
  }, [visible]);

  /* the product photos ride inside beats that arrive mid-animation —
     preload them so a card never pops half-formed when its image
     lands late. The panel weighs nothing; the photos are the only
     bytes it needs, and it needs them immediately. */
  useEffect(() => {
    SCRIPT.forEach((beat) => {
      if ("image" in beat) {
        const img = new Image();
        img.decoding = "async";
        img.src = beat.image;
      }
    });
  }, []);

  /* THE GLIDE — FLIP for a bottom-pinned window. Runs after every
     transcript commit, before paint. The stack's layout position is
     derived, not written: rect.top minus whatever translate an
     in-flight glide is holding right now. If the layout moved up
     (a beat landed, a gate row unrolled, a typed line wrapped), the
     stack is held at its last painted position for this frame — the
     in-flight remainder plus the shift — and then glides to rest.
     Commits that barely move the layout (typing ticks) touch
     NOTHING, so a running glide is never cancelled mid-flight — the
     eye sees one continuous flow, never a teleport, never a snap.
     Shrinks (the restart clear) are skipped on purpose: an empty
     desk is a new scene, not a motion. */
  useLayoutEffect(() => {
    const el = stackRef.current;
    if (!el || reduce) return;
    const rect = el.getBoundingClientRect();
    const m = getComputedStyle(el).transform;
    let ty = 0;
    if (m && m !== "none") {
      const parts = m.slice(m.indexOf("(") + 1, m.length - 1).split(",").map(parseFloat);
      ty = parts[5] || 0; // matrix(a, b, c, d, tx, ty) — the Y translate is the last
    }
    const nowTop = rect.top - ty; // the pure layout top, post-update
    const prevTop = stackTopRef.current;
    stackTopRef.current = nowTop;
    const delta = prevTop == null ? 0 : prevTop - nowTop; // positive: grew upward
    if (delta <= 0.5 || delta > 320) return;
    // hold the last painted visual position, then glide home —
    // transform only, cleared on arrival so nothing lingers as a
    // containing block (D12-1)
    el.style.transition = "none";
    el.style.transform = `translateY(${(ty + delta).toFixed(2)}px)`;
    void el.getBoundingClientRect();
    el.style.transition = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "translateY(0)";
    const clear = () => {
      el.style.transition = "";
      el.style.transform = "";
    };
    el.addEventListener("transitionend", clear, { once: true });
    el.addEventListener("transitioncancel", clear, { once: true });
  }, [played, reduce]);

  const restart = () => {
    start();
  };

  const window_ = played.slice(-WINDOW_BEATS);

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

      {/* the window — the newest beats, bottom-anchored; the oldest
          dissolve into the top fade. It cannot scroll, so the visitor's
          wheel and touch go straight to the page, where they belong.
          The stack is the FLIP target: it glides, its beats do not. */}
      <div className="demo-window flex h-[400px] flex-col justify-end overflow-hidden px-4 py-4 sm:h-[420px] sm:px-5" aria-live="off">
        <div
          ref={stackRef}
          className={cn(
            "flex flex-col gap-2.5 transition-opacity duration-[420ms]",
            fading && !reduce && "opacity-0"
          )}
        >
          {/* the boot line — the desk is open before the first word is typed */}
          <div className="flex items-center gap-2 px-1 font-mono text-[10.5px] text-inksoft">
            <span className="h-1.5 w-1.5 rounded-full bg-cleared/70" aria-hidden />
            desk open · 21 catalog items · rail: sandbox (labeled)
          </div>
          {window_.map((p, i) => (
            <BeatView key={played.length - window_.length + i} p={p} last={i === window_.length - 1} />
          ))}
        </div>
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
  /* beat-in, not animate-rise: a demo beat is a small event on a
     stage, not a UI row — it takes a longer, softer curve so each
     arrival reads as one motion with the stack's glide beneath it */
  const cls = "beat-in";
  switch (b.t) {
    case "user":
      return (
        <div className={cn(cls, "flex justify-end")}>
          {/* the buyer's intent — a sent message: solid ink, the send
              button's own colors (black on white by day, white on black
              by night). What you sent reads as what you sent. */}
          <div className="max-w-[78%] rounded-[4px] bg-ink px-3.5 py-2 text-[13px] text-paper">
            <span className={last && p.typed.length < b.text.length ? "type-caret-paper" : undefined}>{p.typed}</span>
          </div>
        </div>
      );
    case "tool":
      return (
        /* the tool line hugs its content — a chip, not a bar, so it never
            stretches out of proportion to what it says */
        <div className={cn(cls, "flex w-fit max-w-full items-center gap-2.5 rounded-[4px] border border-ink/15 bg-card px-2.5 py-1.5")}>
          {/* the tag — the agent's own green, the one live accent */}
          <span className="shrink-0 rounded-[3px] border border-cleared/40 bg-cleared/10 px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-cleared">{b.tag}</span>
          <ToolText text={b.text} />
        </div>
      );
    case "say":
      return (
        /* the desk's voice — the incoming message, a white card */
        <div className={cn(cls, "w-fit max-w-[88%] rounded-[4px] border border-line bg-card px-3.5 py-2 text-[13px] leading-relaxed text-inksoft")}>{b.text}</div>
      );
    case "product":
      return (
        <div className={cn(cls, "card-lift flex w-fit max-w-full items-center gap-3 rounded-[4px] border border-line bg-card p-3")}>
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
        <div className={cn(cls, "flex w-fit max-w-full items-center gap-3 rounded-[4px] border border-line bg-card px-3.5 py-2")}>
          <img
            src={b.image}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            className="h-7 w-7 shrink-0 rounded-[3px] border border-line object-cover"
          />
          <div className="flex min-w-0 items-baseline gap-4 text-[12.5px]">
            <span className="truncate text-inksoft">
              {b.name} × {b.qty}
            </span>
            <span className="tnum font-mono font-semibold text-ink">{b.price}</span>
          </div>
        </div>
      );
    case "refuse":
      return (
        <div className={cn(cls, "flex w-fit max-w-full items-center justify-between gap-4 rounded-[4px] border border-refused/30 bg-refused-ink px-3.5 py-2")}>
          <span className="text-[12.5px] text-inksoft">{b.note}</span>
          <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-refused">{b.code}</span>
        </div>
      );
    case "tier":
      return (
        <div className={cn(cls, "flex w-fit max-w-full items-center gap-3 rounded-[4px] border border-ink/15 bg-card px-3.5 py-2")}>
          <span className="stamp border-ink/25 text-ink bg-ink/[0.05]">{b.tier}</span>
          <span className="text-[12.5px] text-inksoft">{b.note}</span>
        </div>
      );
    case "mandate":
      return (
        <div className={cn(cls, "w-fit max-w-full rounded-[4px] border border-ink/15 bg-card")}>
          <div className="flex items-center justify-between gap-6 border-b border-line px-3.5 py-2">
            <span className="label-caps">spending mandate</span>
            <span className="tnum font-mono text-[13px] font-semibold text-ink">{b.cap} envelope</span>
          </div>
          <div className="flex items-baseline justify-between gap-6 px-3.5 py-2 text-[12.5px]">
            <span className="text-inksoft">signature</span>
            <span className="font-mono text-ink">{b.sig}</span>
          </div>
        </div>
      );
    case "gate":
      return (
        <div className={cn(cls, "w-fit max-w-full rounded-[4px] border border-ink/15 bg-card")}>
          <div className="border-b border-line px-3.5 py-2 label-caps">
            gate · bind-time checks
          </div>
          <ul className="px-3.5 py-2">
            {b.checks.slice(0, Math.max(1, p.gateN)).map((c, j) => (
              <li key={j} className="demo-gate-row flex items-baseline gap-2.5 border-b border-line/60 py-1.5 last:border-b-0 text-[12.5px]">
                <span className={cn("shrink-0 font-mono font-semibold", j < p.gateN ? "text-cleared" : "text-inksoft")}>✓</span>
                <span className="text-inksoft">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "capture":
      return (
        <div className={cn(cls, "flex w-fit max-w-full items-center justify-between gap-6 rounded-[4px] border border-cleared/30 bg-cleared-ink px-3.5 py-2.5")}>
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
    outcome is what your eye lands on. */
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
