"use client";

/**
 * agents.tsx — the agents view, built from design research (Stripe's
 * pointer spotlight, Linear's glow wells, the infra-page wire ping) and
 * the craft-core research (Landor: "when algorithms flood the world
 * with flawless flatness, the marks of the maker become signal") — so
 * the frame is SEWN: running-stitch seams, corner tacks, woven-label
 * nameplates, a basting underlay on the rail, a care-label strip. All
 * static SVG dash geometry under the house law: hairlines, tokens,
 * transform/opacity, one accent per character. The two agents live in
 * ONE shared frame split by the bus itself — the page is the system,
 * and the summon button rides the real wire.
 */
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DeskHead, GhostButton, InkButton, Reveal, SectionLabel } from "./bits";
import { GhostBody } from "./music-ghost";
import { musicBus } from "@/lib/customs/music/store";
import type { ChatEvent } from "@/lib/customs/agent/loop";
import type { View } from "./shell";

/**
 * Spot — the pointer spotlight: a hover STATE, not a loop. The card
 * writes --sx/--sy on pointermove (style writes, no re-render); the
 * light exists only while attended. Killed under reduced motion.
 */
function Spot({
  children,
  tint,
  className,
}: {
  children: ReactNode;
  tint: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <div
      ref={ref}
      onPointerMove={
        reduced
          ? undefined
          : (e) => {
              const el = ref.current;
              if (!el) return;
              const r = el.getBoundingClientRect();
              el.style.setProperty("--sx", `${e.clientX - r.left}px`);
              el.style.setProperty("--sy", `${e.clientY - r.top}px`);
            }
      }
      className={cn("group relative overflow-hidden", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(280px circle at var(--sx, 50%) var(--sy, 40%), ${tint}, transparent 65%)` }}
      />
      {children}
    </div>
  );
}

/**
 * Stitch — a running-stitch seam: SVG dash geometry (0.5 / 11 with
 * round caps = needle holes), static, themeable through currentColor.
 * Functional ornamentation — it marks construction, never decorates.
 */
function Stitch({ inset = 6, className, rx = 3 }: { inset?: number; className?: string; rx?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute" style={{ inset }}>
      <svg width="100%" height="100%" className="block">
        <rect
          x="0.75"
          y="0.75"
          width="99.5%"
          height="99.5%"
          rx={rx}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="0.5 11"
          strokeLinecap="round"
          className={className}
        />
      </svg>
    </div>
  );
}

/** CornerTack — a cross-stitch X reinforcing the frame's corners */
function CornerTack({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={cn("pointer-events-none absolute size-3", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M2 2l8 8M10 2l-8 8" />
    </svg>
  );
}

/** Nameplate — the woven label: hairline patch, inset stitch, mono name */
function Nameplate({ name, thread }: { name: string; thread: string }) {
  return (
    <span className="relative inline-flex items-center border border-line bg-paper2 px-3.5 py-1.5">
      <Stitch inset={3} className={thread} rx={1} />
      <span className="label-caps relative">{name}</span>
    </span>
  );
}

const DESK_SKILLS = [
  "searches the catalog and builds the cart",
  "checks out through a signed mandate — the gate holds the money",
  "red-teams itself: attack: overspend-tier",
  "floats on every page — click the black head to talk",
];

const COCO_SKILLS = [
  "plays what was asked — \u201cplay africa by toto\u201d",
  "skip · pause · louder · quieter — all at zero tokens",
  "its own chat — click coco, type straight to it",
  "hide ≠ stop — it tucks away, the music hums on",
  "double-click — the video sinks to the background",
];

const HANDOFF: { tag: string; text: string; loud?: boolean }[] = [
  { tag: "you", text: "\u201cplay africa by toto\u201d", loud: true },
  { tag: "brain", text: "caught by the rules brain · 0 tokens · the crate is searched" },
  { tag: "bus", text: "the music event rides the wire — the handoff" },
  { tag: "coco", text: "▶ Toto - Africa (Lyrics) — 7clouds" },
];

function SkillLog({ lines }: { lines: string[] }) {
  return (
    <ul className="mt-5 space-y-2 border-t border-line pt-5">
      {lines.map((s) => (
        <li key={s} className="flex gap-2.5 font-mono text-[11.5px] leading-relaxed text-inksoft">
          <span aria-hidden className="shrink-0 text-ink/50">
            [ok]
          </span>
          {s}
        </li>
      ))}
    </ul>
  );
}

export function AgentsPage({ onEnter }: { onEnter: (v: View) => void }) {
  const [summoning, setSummoning] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  /* the wire's ping: one shot, only when a summon actually lands */
  const [ping, setPing] = useState(false);

  const summon = async () => {
    if (summoning) return;
    setSummoning(true);
    setSaid("searching the crate…");
    try {
      const ctrl = new AbortController();
      const kill = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "play something chill", adapter: "naive" }),
        signal: ctrl.signal,
      });
      clearTimeout(kill);
      const data = (await res.json()) as { ok: boolean; events?: ChatEvent[] };
      const music = data.events?.find(
        (e): e is Extract<ChatEvent, { kind: "music" }> => "kind" in e && e.kind === "music"
      );
      if (music && music.action === "play" && music.tracks.length) {
        musicBus.emit({ action: "play", tracks: music.tracks, query: music.query, mood: music.mood, error: music.note });
        setSaid(`coco is on it — ${music.tracks[0].title}`);
        setPing(true);
        setTimeout(() => setPing(false), 950);
      } else {
        setSaid(music?.note === "no-key" ? "the crate is locked — no YouTube key on this desk." : "nothing surfaced — try again.");
      }
    } catch {
      setSaid("the crate is slow — try again.");
    } finally {
      setSummoning(false);
    }
  };

  return (
    <div className="mx-auto max-w-[900px]">
      <Reveal>
        <SectionLabel>the agents</SectionLabel>
        <h2 className="mt-3 font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.05] tracking-[-0.025em] text-ink">
          two agents, one desk.
        </h2>
        <p className="mt-3 max-w-[56ch] text-[15px] leading-[1.8] text-inksoft">
          moco buys within a signed mandate. coco plays what was asked.
          They live in one sewn frame, split by the bus itself — and the
          summon button below rides the real wire.
        </p>
      </Reveal>

      {/* ONE shared garment — the center rail IS the bus; the seam proves
          the two panels were cut from one cloth */}
      <Reveal delay={80}>
        <div className="relative mt-10 rounded-[4px] border border-line bg-card">
          <Stitch inset={5} className="text-inksoft/70" rx={3} />
          <CornerTack className="left-1.5 top-1.5 text-inksoft" />
          <CornerTack className="right-1.5 top-1.5 text-inksoft" />
          <CornerTack className="bottom-1.5 left-1.5 text-inksoft" />
          <CornerTack className="bottom-1.5 right-1.5 text-inksoft" />

          <div className="relative flex items-center justify-between border-b border-line px-5 py-3">
            <span className="label-caps">one frame · the bus between them</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-inksoft">commands · 0 tokens</span>
          </div>

          <div className="relative grid md:grid-cols-[1fr_auto_1fr]">
            {/* the desk zone */}
            <Spot
              tint="color-mix(in srgb, var(--ink) 5%, transparent)"
              className="border-b border-line p-7 md:border-b-0"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle, var(--line-strong) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
              <div className="relative flex items-center justify-center py-4">
                <div aria-hidden className="absolute size-36 rounded-full bg-ink/[0.05] blur-2xl" />
                <DeskHead size={96} className="relative text-ink" />
              </div>
              <div className="relative mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-inksoft">
                <span aria-hidden className="h-1 w-1 rounded-full bg-cleared/80" />
                on the desk
              </div>
              <div className="relative mt-5 flex justify-center">
                <Nameplate name="moco" thread="text-ink/40" />
              </div>
              <p className="relative mt-3 text-center text-[13px] leading-relaxed text-inksoft">
                the buyer's agent — it shops, you approve.
              </p>
              <div className="relative">
                <SkillLog lines={DESK_SKILLS} />
              </div>
            </Spot>

            {/* the rail — the bus: basting underlay, node, the packet's ring */}
            <div aria-hidden className="hidden items-stretch md:flex">
              <div className="flex w-px flex-col items-center">
                <span className="w-0 flex-1 border-l border-dashed border-ink/25" />
                <span className="relative my-4 flex size-12 shrink-0 items-center justify-center rounded-full border border-line-strong bg-card font-mono text-[9px] uppercase tracking-[0.08em] text-inksoft">
                  bus
                  {ping && <span className="wire-packet absolute inset-0 rounded-full border-2 border-line-strong" />}
                </span>
                <span className="w-0 flex-1 border-l border-dashed border-ink/25" />
              </div>
            </div>

            {/* the coco zone — the ghost's own patch, stitched in band */}
            <Spot
              tint="color-mix(in srgb, var(--band) 8%, transparent)"
              className="border-t border-line p-7 md:border-l md:border-t-0"
            >
              <Stitch inset={4} className="text-band" rx={2} />
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle, var(--line-strong) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
              <div className="relative flex items-center justify-center py-4">
                <div aria-hidden className="absolute size-36 rounded-full bg-band-ink blur-2xl" />
                <GhostBody playing={false} mood="wide" size={96} />
              </div>
              <div className="relative mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-inksoft">
                <span aria-hidden className={cn("h-1 w-1 rounded-full", summoning || ping ? "bg-band" : "bg-inksoft/40")} />
                {summoning ? "summoning" : ping ? "humming" : "quiet"}
              </div>
              <div className="relative mt-5 flex justify-center">
                <Nameplate name="coco" thread="text-ink/40" />
              </div>
              <p className="relative mt-3 text-center text-[13px] leading-relaxed text-inksoft">
                the music ghost — summoned, it hums what was asked.
              </p>
              <div className="relative">
                <SkillLog lines={COCO_SKILLS} />
              </div>
            </Spot>
          </div>

          {/* the care label — composition of the garment */}
          <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-inksoft">
            <span>moco · buyer agent</span>
            <span aria-hidden className="text-ink/30">·····</span>
            <span>coco · music ghost</span>
            <span aria-hidden className="text-ink/30">·····</span>
            <span>shared bus · commands 0 tokens</span>
          </div>
        </div>
      </Reveal>

      {/* the handoff — the wire, as the transcript sees it */}
      <Reveal delay={80}>
        <div className="mt-10 border-t border-line pt-8">
          <SectionLabel>the handoff</SectionLabel>
          <div className="mt-5 rounded-[4px] border border-line bg-card p-6">
            <div className="divide-y divide-line">
              {HANDOFF.map((l) => (
                <div key={l.tag} className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-16 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink/60">
                    [{l.tag}]
                  </span>
                  <span className={cn("font-mono text-[12px] leading-relaxed", l.loud ? "text-ink" : "text-inksoft")}>
                    {l.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <InkButton onClick={summon} disabled={summoning} ariaLabel="summon coco — it plays a chill mix" arrow>
                {summoning ? "searching the crate…" : "summon coco"}
              </InkButton>
              <GhostButton onClick={() => onEnter("agent")} ariaLabel="open the agent playground">
                open the playground
              </GhostButton>
              <p aria-live="polite" className="min-w-0 flex-1 font-mono text-[11px] leading-relaxed text-inksoft">
                {said ?? "the button rides the same wire the desk's chat does — coco answers here."}
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* how it stays cheap */}
      <Reveal delay={80}>
        <div className="mt-10 border-t border-line pt-8">
          <SectionLabel>how it stays cheap</SectionLabel>
          <div className="mt-5 grid gap-px bg-line md:grid-cols-2">
            <div className="bg-card p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-inksoft">rules brains</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-inksoft">
                Every command — search, add, checkout, play, skip, hide —
                is caught by deterministic rules. Zero tokens, replayable
                bit-for-bit.
              </p>
            </div>
            <div className="bg-card p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-inksoft">the model, on a leash</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-inksoft">
                Only casual chat reaches an LLM — the cheap voice, a tiny
                prompt, a hard ceiling, two personas (moco talks desk,
                coco talks ghost). Music never touches it.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      <p className="mt-12 text-[13px] leading-relaxed text-inksoft">
        moco floats on every page — click the black head. coco answers when called.
      </p>
    </div>
  );
}
