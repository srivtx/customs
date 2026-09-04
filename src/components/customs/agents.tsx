"use client";

/**
 * agents.tsx — the agents view, in the landing's own grammar: a hero
 * stage (display type + the two heads large on the felt, the bus wire
 * drawn between them, the real summon button), then py-16 sections —
 * the sewn frame, the handoff log, the cheap pair. The craft is the
 * house's own felt vocabulary (HeroFabric mat, static grain,
 * running-stitch seams, woven-label nameplates, a band dye wash on the
 * ghost's cloth) held to the discipline: hover changes one quiet
 * thing; the delight budget is the live heads + the one-shot ping.
 */
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { DeskHead, GhostButton, InkButton, Reveal, SectionLabel } from "./bits";
import { GhostBody } from "./music-ghost";
import { HeroFabric } from "./hero-fabric";
import { musicBus } from "@/lib/customs/music/store";
import type { ChatEvent } from "@/lib/customs/agent/loop";
import type { View } from "./shell";

/** FeltGrain — the desk's material: static desaturated noise at 5% */
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

/** Stitch — a running-stitch seam: SVG dash geometry, static */
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
    <ul className="mt-5 space-y-2">
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
    <div>
      {/* ------------------------------ hero stage ------------------------------ */}
      <section aria-label="the agents" className="pb-16 pt-6 sm:pt-10">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-6">
          <div>
            <p className="label-caps">the agents · one desk · every command 0 tokens</p>
            <h1 className="mt-6 max-w-[16ch] font-display text-[clamp(40px,6vw,72px)] font-semibold leading-[0.98] tracking-[-0.035em] text-ink">
              moco buys.
              <br />
              <span className="text-inksoft">coco hums.</span>
            </h1>
            <p className="mt-7 max-w-[52ch] text-[17px] leading-relaxed text-inksoft">
              Two agents share one desk and one wire. moco shops inside a
              signed mandate; coco plays what was asked and talks back.
              Summon it right here — the button rides the real bus.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <InkButton onClick={summon} disabled={summoning} ariaLabel="summon coco — it plays a chill mix" arrow className="h-11 px-5 text-[14px]">
                {summoning ? "Searching the crate…" : "Summon coco"}
              </InkButton>
              <GhostButton onClick={() => onEnter("agent")} ariaLabel="open the agent playground" variant="ink" className="h-11 px-5">
                Open the playground
              </GhostButton>
            </div>
            <p aria-live="polite" className="mt-4 min-h-[20px] font-mono text-[11.5px] leading-relaxed text-inksoft">
              {said ?? "the wire is quiet — press summon and watch it run"}
            </p>
          </div>

          {/* the stage: both heads on the felt, the bus wire between them */}
          <div className="relative mx-auto w-[min(80vw,340px)] lg:w-full">
            <HeroFabric className="absolute inset-0 h-full w-full" />
            <div className="relative aspect-square">
              {/* the wire — one dashed seam, corner to corner */}
              <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line
                  x1="20"
                  y1="27"
                  x2="80"
                  y2="73"
                  stroke="var(--line-strong)"
                  strokeWidth="1.5"
                  strokeDasharray="0.15 3.2"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="absolute left-[4%] top-[6%]">
                <DeskHead size={120} className="text-ink" />
              </div>
              <div className="absolute bottom-[4%] right-[4%]">
                <GhostBody size={120} mood="wide" playing={false} />
              </div>
              {/* the bus — the wire's node, and the ping's home */}
              <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-card font-mono text-[9px] uppercase tracking-[0.08em] text-inksoft">
                bus
                {ping && <span className="wire-packet absolute inset-0 rounded-full border-2 border-line-strong" />}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ what they can do ------------------------------ */}
      <Reveal>
        <section aria-label="what they can do" className="border-t border-line py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
              What they can do.
            </h2>
            <span className="text-[12.5px] text-inksoft">every command on the house brain · 0 tokens</span>
          </div>

          <div className="relative mt-8 rounded-[4px] border border-line bg-card transition-colors duration-150 hover:border-line-strong">
            <Stitch inset={5} className="text-inksoft/70" rx={3} />
            <CornerTack className="left-1.5 top-1.5 text-inksoft" />
            <CornerTack className="right-1.5 top-1.5 text-inksoft" />
            <CornerTack className="bottom-1.5 left-1.5 text-inksoft" />
            <CornerTack className="bottom-1.5 right-1.5 text-inksoft" />

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
                <div className="relative">
                  <SkillLog lines={DESK_SKILLS} />
                </div>
              </div>

              {/* the seam — the bus */}
              <div aria-hidden className="hidden items-stretch md:flex">
                <div className="flex w-px flex-col items-center bg-line">
                  <span className="w-px flex-1" />
                  <span className="relative my-4 flex size-12 shrink-0 items-center justify-center rounded-full border border-line-strong bg-card font-mono text-[9px] uppercase tracking-[0.08em] text-inksoft">
                    bus
                  </span>
                  <span className="w-px flex-1" />
                </div>
              </div>

              {/* coco's patch — band dye, band thread, the sheen inside */}
              <div className="relative border-t border-line p-7 transition-colors duration-150 hover:bg-card-hover md:border-l md:border-t-0 md:hover:border-band/50">
                <FeltGrain />
                <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-band-ink blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-16 left-6 size-36 rounded-full bg-band-ink/70 blur-3xl" />
                <Stitch inset={4} className="text-band" rx={2} />
                <div className="relative flex items-center justify-center py-4">
                  <GhostBody size={96} mood="wide" playing={false} />
                </div>
                <div className="relative mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-inksoft">
                  <span aria-hidden className="h-1 w-1 rounded-full bg-inksoft/40" />
                  quiet
                </div>
                <div className="relative mt-5 flex justify-center">
                  <Nameplate name="coco" thread="text-ink/40" />
                </div>
                <div className="relative">
                  <SkillLog lines={COCO_SKILLS} />
                </div>
              </div>
            </div>

            <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-inksoft">
              <span>moco · buyer agent</span>
              <span aria-hidden className="text-ink/30">·····</span>
              <span>coco · music ghost</span>
              <span aria-hidden className="text-ink/30">·····</span>
              <span>shared bus · commands 0 tokens</span>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ the handoff ------------------------------ */}
      <Reveal>
        <section aria-label="the handoff" className="border-t border-line py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
              The handoff.
            </h2>
            <span className="text-[12.5px] text-inksoft">one wire, four beats — as the transcript sees it</span>
          </div>
          <div className="card-lift mt-8 rounded-[4px] border border-line bg-card p-6">
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
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ how it stays cheap ------------------------------ */}
      <Reveal>
        <section aria-label="how it stays cheap" className="border-t border-line py-16">
          <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
            How it stays cheap.
          </h2>
          <div className="mt-8 grid gap-px bg-line md:grid-cols-2">
            <Reveal delay={0} className="bg-paper">
              <div className="card-lift h-full rounded-[4px] p-5">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">Rules brains</span>
                  <span className="font-mono text-[11px] text-inksoft">01</span>
                </div>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-inksoft">
                  Every command — search, add, checkout, play, skip, hide —
                  is caught by deterministic rules. Zero tokens, replayable
                  bit-for-bit.
                </p>
                <div className="mt-4 rounded-[4px] bg-ink/[0.05] px-2.5 py-1.5 font-mono text-[11.5px] text-ink">
                  parseMusicIntent("play africa by toto")
                </div>
              </div>
            </Reveal>
            <Reveal delay={80} className="bg-paper">
              <div className="card-lift h-full rounded-[4px] p-5">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">The model, on a leash</span>
                  <span className="font-mono text-[11px] text-inksoft">02</span>
                </div>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-inksoft">
                  Only casual chat reaches an LLM — the cheap voice, a tiny
                  prompt, a hard ceiling, two personas (moco talks desk,
                  coco talks ghost). Music never touches it.
                </p>
                <div className="mt-4 rounded-[4px] bg-ink/[0.05] px-2.5 py-1.5 font-mono text-[11.5px] text-ink">
                  brainMode() === "rules" // always, for commands
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </Reveal>

      <p className="pb-16 text-[13px] leading-relaxed text-inksoft">
        moco floats on every page — click the black head. coco answers when called.
      </p>
    </div>
  );
}
