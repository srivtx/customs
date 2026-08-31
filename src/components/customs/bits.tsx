"use client";

/**
 * bits.tsx — the Customs design primitives.
 * Stamps, manifest lines, mono money, count-up numbers. Small, sharp, reused
 * everywhere so the product reads as one document.
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
 * on paper or ink alike; one shape from favicon to footer.
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

/* ---------------- verdict stamp — the signature element ---------------- */

export type StampKind = "cleared" | "refused" | "held" | "ink" | "sim";

const STAMP_STYLES: Record<StampKind, string> = {
  cleared: "border-cleared text-cleared bg-cleared-ink/40",
  refused: "border-refused text-refused bg-refused-ink/40",
  held: "border-held text-held bg-held-ink/40",
  ink: "border-ink text-ink bg-paper2/60",
  sim: "border-inksoft text-inksoft bg-paper2/60",
};

export function Stamp({
  kind,
  children,
  rotate = -2.5,
  className,
  animate = true,
}: {
  kind: StampKind;
  children: ReactNode;
  rotate?: number;
  className?: string;
  animate?: boolean;
}) {
  const reduce = useReducedMotion();
  if (animate && !reduce) {
    return (
      <motion.span
        initial={{ scale: 1.6, opacity: 0, rotate: rotate * 2 }}
        animate={{ scale: 1, opacity: 1, rotate }}
        transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}
        className={cn("stamp", STAMP_STYLES[kind], className)}
        style={{ rotate }}
      >
        {children}
      </motion.span>
    );
  }
  return (
    <span className={cn("stamp", STAMP_STYLES[kind], className)} style={{ rotate: `${rotate}deg` }}>
      {children}
    </span>
  );
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
    UNVERIFIED: "border-line2 text-inksoft bg-paper2",
    ATTESTED: "border-held/60 text-held bg-held-ink/30",
    MANDATED: "border-cleared/60 text-cleared bg-cleared-ink/30",
  };
  return (
    <span
      className={cn(
        "stamp border-[2px] tracking-[0.14em]",
        style[tier] ?? style.UNVERIFIED
      )}
    >
      {tier}
    </span>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
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
        "flex items-baseline justify-between gap-4 border-b border-line/70 py-2 last:border-b-0",
        mono && "font-mono text-[13px]",
        className
      )}
    >
      <span className="min-w-0 truncate text-inksoft">{left}</span>
      <span className="tnum shrink-0 font-medium text-ink">{right}</span>
    </div>
  );
}

/* ---------------- buttons — the house style ---------------- */

export type InkVariant = "ink" | "cleared" | "refused";

const INK_VARIANTS: Record<InkVariant, string> = {
  ink: "border-ink bg-ink text-paper hover:shadow-[3px_3px_0_0_var(--line-strong)]",
  cleared: "border-cleared bg-cleared text-cleared-ink hover:shadow-[3px_3px_0_0_var(--line-strong)]",
  refused: "border-refused bg-refused text-refused-ink hover:shadow-[3px_3px_0_0_var(--line-strong)]",
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
        "btn-ink group relative inline-flex h-10 items-center justify-center gap-2 border px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]",
        "hover:-translate-y-px active:translate-y-[0.5px] active:shadow-none",
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
          className="inline-block transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
        >
          →
        </span>
      )}
    </button>
  );
}

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
        "btn-ghost inline-flex h-8 items-center justify-center gap-1.5 border bg-transparent px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]",
        "hover:-translate-y-px active:translate-y-[0.5px]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "disabled:pointer-events-none disabled:opacity-40",
        variant === "default" && "border-line2 text-inksoft hover:border-ink hover:text-ink",
        variant === "danger" && "border-refused/50 text-refused hover:border-refused",
        variant === "ink" && "border-ink/60 text-ink hover:border-ink hover:-translate-y-px",
        active && "border-ink bg-ink text-paper hover:text-paper",
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
    <kbd className="rounded-sm border border-line2 bg-paper2 px-1.5 py-0.5 font-mono text-[10px] text-inksoft">
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
    ink: "bg-ink",
    cleared: "bg-cleared",
    held: "bg-held",
    refused: "bg-refused",
  };
  return (
    <div className="grid grid-cols-[110px_1fr_86px] items-center gap-3 py-1">
      <span className="truncate font-mono text-[11px] text-inksoft">{label}</span>
      <span className="h-2.5 border border-line bg-paper2/60">
        <span className={cn("block h-full", fill[kind])} style={{ width: `${pct}%` }} />
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
      className={cn("transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", className)}
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
    <span className={cn("inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-inksoft", className)}>
      <span className="pulse-dot" aria-hidden />
      {label}
    </span>
  );
}

/* ---------------- the manifest ticker ---------------- */

/**
 * One long paper strip sliding left — recent ledger lines on the landing
 * page. Duplicated once for the seamless loop; pauses on hover; collapses
 * to a static line under reduced motion.
 */
export function Ticker({ items, duration = 46 }: { items: string[]; duration?: number }) {
  if (items.length === 0) return null;
  const row = (key: string, hidden: boolean) => (
    <span key={key} aria-hidden={hidden} className="inline-flex items-center">
      {items.map((it, i) => (
        <span key={i} className="mx-5 inline-flex items-center gap-2 font-mono text-[10.5px] text-inksoft">
          <span className="h-2 w-2 rotate-45 border border-line-strong" aria-hidden />
          {it}
        </span>
      ))}
    </span>
  );
  return (
    <div className="ticker overflow-hidden border-y border-line bg-paper2/50 py-2" role="marquee" aria-label="recent ledger lines">
      <div className="ticker-track" style={{ ["--ticker-dur" as string]: `${duration}s` }}>
        {row("a", false)}
        {row("b", true)}
      </div>
    </div>
  );
}
