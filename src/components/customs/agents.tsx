"use client";

/**
 * agents.tsx — the agents view: one felt desk, two characters, one bus.
 * The craft is the house's own felt vocabulary (static feTurbulence
 * grain, running-stitch seams, woven-label nameplates, a dye wash on
 * the ghost's patch) under the craft school's discipline (Rauno
 * Freiberg, Emil Kowalski, Linear): hover changes one quiet thing, the
 * delight budget is the live heads + the one-shot wire ping, and every
 * stitch marks construction instead of decorating.
 */
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { DeskHead, GhostButton, InkButton, Reveal, SectionLabel } from "./bits";
import { GhostBody } from "./music-ghost";
import { musicBus } from "@/lib/customs/music/store";
import type { ChatEvent } from "@/lib/customs/agent/loop";
import type { View } from "./shell";

/**
 * FeltGrain — the desk's material: a static seeded noise film (the
 * hfx-grain recipe — fractal noise, desaturated, overlay at 5%). It
 * rasterizes once and never animates.
 */
function FeltGrain() {
  const id = `ag-grain-${useId().replace(/:/g, "")}`;
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} opacity="0.05" style={{ mixBlendMode: "overlay" }} />
    </svg>
  );
}

/**
 * Stitch — a running-stitch seam: SVG dash geometry (0.5 / 11 with
 * round caps = needle holes), static, themeable through currentColor.
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
          They live on one felt desk, split by the bus — and the summon
          button below rides the real wire.
        </p>
      </Reveal>

      {/* ONE garment — felt panels sewn at the seam; the rail is the bus */}
      <Reveal delay={80}>
        <div className="relative mt-10 rounded-[4px] border border-line bg-card transition-colors duration-150 hover:border-line-strong">
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
            {/* moco's patch — ink felt, gray thread */}
            <div className="border-b border-line p-7 transition-colors duration-150 hover:bg-card-hover md:border-b-0">
              <FeltGrain />
              <div className="relative flex items-center justify-center py-4">
                <DeskHead size={96} className="text-ink" />
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
            </div>

            {/* the seam — the bus, with the packet's one-shot ring */}
            <div aria-hidden className="hidden items-stretch md:flex">
              <div className="flex w-px flex-col items-center bg-line">
                <span className="w-px flex-1" />
                <span className="relative my-4 flex size-12 shrink-0 items-center justify-center rounded-full border border-line-strong bg-card font-mono text-[9px] uppercase tracking-[0.08em] text-inksoft">
                  bus
                  {ping && <span className="wire-packet absolute inset-0 rounded-full border-2 border-line-strong" />}
                </span>
                <span className="w-px flex-1" />
              </div>
            </div>

            {/* coco's patch — the ghost's own cloth: band dye, band thread,
                and the sheen drifting inside the head itself */}
            <div className="relative border-t border-line p-7 transition-colors duration-150 hover:bg-card-hover md:border-l md:border-t-0 md:hover:border-band/50">
              <FeltGrain />
              <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-band-ink blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-16 left-6 size-36 rounded-full bg-band-ink/70 blur-3xl" />
              <Stitch inset={4} className="text-band" rx={2} />
              <div className="relative flex items-center justify-center py-4">
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
            </div>
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
          <div className="card-lift mt-5 rounded-[4px] border border-line bg-card p-6">
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
            <div className="card-lift bg-card p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-inksoft">rules brains</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-inksoft">
                Every command — search, add, checkout, play, skip, hide —
                is caught by deterministic rules. Zero tokens, replayable
                bit-for-bit.
              </p>
            </div>
            <div className="card-lift bg-card p-5">
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
