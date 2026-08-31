"use client";

/**
 * bits.tsx — the Customs design primitives, v2.
 * One device (the hairline), one accent (sage), verdicts as upright
 * chips, a white primary button. Small, sharp, reused everywhere so
 * the product reads as one system.
 */
import { ReactNode, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function inr(paise: number, opts?: { decimals?: boolean }): string {
  const v = paise / 100;
  return `₹${v.toLocaleString("en-IN", {
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  })}`;
}

export function monoId(id: string, max = 14): string {
  return id.length > max ? id.slice(0, max) + "…" : id;
}

/* ---------------- the gate diamond — the Customs mark ---------------- */

/**
 * A solid diamond with a negative-space mandate slot cut through it:
 * value passes only through the authorization. CurrentColor so it sits
 * on any ground; one shape from favicon to footer.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M48 9 L87 48 L48 87 L9 48 Z M41 36 A7 7 0 0 1 55 36 L55 60 A7 7 0 0 1 41 60 Z"
      />
    </svg>
  );
}

/* ---------------- verdict chip — the signature element ---------------- */

export type StampKind = "cleared" | "refused" | "held" | "ink" | "sim";

const STAMP_STYLES: Record<StampKind, string> = {
  cleared: "border-cleared/50 text-cleared bg-cleared/15",
  refused: "border-refused/50 text-refused bg-refused/15",
  held: "border-held/50 text-held bg-held/15",
  ink: "border-ink/25 text-ink bg-ink/[0.05]",
  sim: "border-ink/25 text-ink bg-ink/[0.04]",
};

export function Stamp({
  kind,
  children,
  className,
  animate = true,
}: {
  kind: StampKind;
  children: ReactNode;
  className?: string;
  animate?: boolean;
}) {
  const reduce = useReducedMotion();
  if (animate && !reduce) {
    return (
      <motion.span
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
        className={cn("stamp", STAMP_STYLES[kind], className)}
      >
        {children}
      </motion.span>
    );
  }
  return <span className={cn("stamp", STAMP_STYLES[kind], className)}>{children}</span>;
}

/* ---------------- chips & labels ---------------- */

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, StampKind> = {
    CAPTURED: "cleared",
    ALLOW: "cleared",
    PROPOSED: "ink",
    BOUND: "ink",
    AWAITING_APPROVAL: "held",
    HOLD_FOR_APPROVAL: "held",
    REFUSED: "refused",
    FAILED: "refused",
    BLOCKED: "cleared",
    PASSED: "refused",
    SIMULATED: "sim",
  };
  return <Stamp kind={map[status] ?? "ink"}>{status.replace(/_/g, " ")}</Stamp>;
}

export function TierChip({ tier }: { tier: string }) {
  const style: Record<string, string> = {
    UNVERIFIED: "border-ink/25 text-ink/80 bg-ink/[0.04]",
    ATTESTED: "border-held/50 text-held bg-held/15",
    MANDATED: "border-cleared/50 text-cleared bg-cleared/15",
  };
  return <span className={cn("stamp", style[tier] ?? style.UNVERIFIED)}>{tier}</span>;
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <span className="label-caps whitespace-nowrap">{children}</span>
      <span className="hairline flex-1" />
    </div>
  );
}

/* ---------------- count-up number (the meter's tick) ---------------- */

export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  // null = idle: no animation running, render the target value directly
  const [display, setDisplay] = useState<number | null>(null);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === fromRef.current) return;
    if (reduce) {
      fromRef.current = value;
      const raf = requestAnimationFrame(() => setDisplay(null));
      return () => cancelAnimationFrame(raf);
    }
    const from = fromRef.current;
    const to = value;
    const t0 = performance.now();
    const dur = 620;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        fromRef.current = to;
        setDisplay(null);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, reduce]);

  return <span className={cn("tnum", className)}>{format(display ?? value)}</span>;
}

/* ---------------- manifest row (ledger line) ---------------- */

export function ManifestRow({
  left,
  right,
  mono,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0",
        mono && "font-mono text-[12.5px]",
        className
      )}
    >
      <span className="min-w-0 truncate text-inksoft">{left}</span>
      <span className="tnum shrink-0 font-medium text-ink">{right}</span>
    </div>
  );
}

/* ---------------- buttons — the house style ---------------- */

/**
 * The primary button: white on black, 4px radius, lifts 1px on hover,
 * presses into the desk on click. The finance-grade CTA — nothing
 * decorated, everything deliberate.
 */
export type InkVariant = "ink" | "cleared" | "refused";

const INK_VARIANTS: Record<InkVariant, string> = {
  ink: "border-transparent bg-ink text-paper hover:bg-ink/90",
  cleared: "border-cleared/60 bg-cleared text-cleared-contrast hover:brightness-110",
  refused: "border-refused/60 bg-refused text-refused-contrast hover:brightness-110",
};

export function InkButton({
  children,
  onClick,
  disabled,
  type = "button",
  className,
  title,
  variant = "ink",
  arrow = false,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
  variant?: InkVariant;
  arrow?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "btn-ink group relative inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border px-4 text-[13px] font-medium tracking-[-0.01em]",
        "hover:-translate-y-px active:translate-y-[0.5px]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "disabled:pointer-events-none disabled:opacity-40",
        INK_VARIANTS[variant],
        className
      )}
    >
      {children}
      {arrow && (
        <span
          aria-hidden
          className="inline-block transition-transform duration-150 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-0.5"
        >
          →
        </span>
      )}
    </button>
  );
}

/** The ghost: one hairline, brightens on approach, fills when active. */
export function GhostButton({
  children,
  onClick,
  disabled,
  className,
  title,
  active,
  variant = "default",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  active?: boolean;
  variant?: "default" | "danger" | "ink";
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "btn-ghost inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border bg-transparent px-3 font-mono text-[11px] font-medium tracking-[-0.01em]",
        "hover:-translate-y-px active:translate-y-[0.5px]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "disabled:pointer-events-none disabled:opacity-40",
        variant === "default" && "border-line2 text-inksoft hover:border-ink/30 hover:text-ink hover:bg-ink/[0.04]",
        variant === "danger" && "border-refused/30 text-refused hover:border-refused/60 hover:bg-refused-ink",
        variant === "ink" && "border-line2 text-ink hover:border-ink/30 hover:bg-ink/[0.04]",
        active && "border-ink/25 bg-ink/[0.06] text-ink",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- misc ---------------- */

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[3px] border border-line2 bg-ink/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-ink">
      {children}
    </kbd>
  );
}

export function Typing() {
  return (
    <span className="animate-typing inline-flex items-center gap-1 text-inksoft" aria-label="agent is working">
      <span className="h-1.5 w-1.5 rounded-full bg-inksoft" />
      <span className="h-1.5 w-1.5 rounded-full bg-inksoft" />
      <span className="h-1.5 w-1.5 rounded-full bg-inksoft" />
    </span>
  );
}

/** tiny bar row for adapter split / wire bytes comparison */
export function MeterBar({
  value,
  max,
  kind = "ink",
  label,
  right,
}: {
  value: number;
  max: number;
  kind?: "ink" | "cleared" | "held" | "refused";
  label: ReactNode;
  right: ReactNode;
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  const fill: Record<string, string> = {
    ink: "bg-ink/80",
    cleared: "bg-cleared",
    held: "bg-held",
    refused: "bg-refused",
  };
  return (
    <div className="grid grid-cols-[110px_1fr_86px] items-center gap-3 py-1">
      <span className="truncate font-mono text-[11px] text-inksoft">{label}</span>
      <span className="h-[6px] rounded-full bg-ink/[0.06]">
        <span className={cn("block h-full rounded-full", fill[kind])} style={{ width: `${pct}%` }} />
      </span>
      <span className="tnum text-right font-mono text-[11px] text-ink">{right}</span>
    </div>
  );
}

/* ---------------- reveal on scroll (restrained) ---------------- */

/**
 * Fades content up ~10px once, when it first scrolls into view. Intersection-
 * observer driven, no layout cost when idle, inert under reduced motion.
 * The whole page reads as one document settling onto the desk.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reduce) return; // reduced motion: never hide content
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "-8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  const visible = shown || !!reduce;
  return (
    <div
      ref={ref}
      className={cn("transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]", className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(10px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- the live desk light ---------------- */

export function LiveDot({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-inksoft", className)}>
      <span className="pulse-dot" aria-hidden />
      {label}
    </span>
  );
}

/* ---------------- the manifest ticker ---------------- */

/**
 * One long strip sliding left — recent ledger lines on the landing page.
 * Duplicated once for the seamless loop; pauses on hover; collapses to a
 * static line under reduced motion.
 */
export function Ticker({ items, duration = 46 }: { items: string[]; duration?: number }) {
  if (items.length === 0) return null;
  const row = (key: string, hidden: boolean) => (
    <span key={key} aria-hidden={hidden} className="inline-flex items-center">
      {items.map((it, i) => (
        <span key={i} className="mx-6 inline-flex items-center gap-2.5 font-mono text-[11px] text-inksoft">
          <span className="h-1 w-1 rounded-full bg-cleared/60" aria-hidden />
          {it}
        </span>
      ))}
    </span>
  );
  return (
    <div className="ticker overflow-hidden border-y border-line py-2.5" role="marquee" aria-label="recent ledger lines">
      <div className="ticker-track" style={{ ["--ticker-dur" as string]: `${duration}s` }}>
        {row("a", false)}
        {row("b", true)}
      </div>
    </div>
  );
}
