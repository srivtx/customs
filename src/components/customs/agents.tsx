"use client";

/**
 * agents.tsx — the agents view, built from design research (Stripe's
 * pointer spotlight, Linear's glow wells, the infra-page wire ping,
 * x.ai's surface steps) under the house law: hairlines, tokens,
 * transform/opacity, one accent per character. The two agents live in
 * ONE shared frame split by the bus rail — the page is the system, and
 * the summon button rides the real wire.
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
          The desk agent buys within a signed mandate. Coco plays what was
          asked. They live in one frame, split by the bus itself — and the
          summon button below rides the real wire.
        </p>
      </Reveal>

      {/* ONE shared frame — the center rail IS the bus */}
      <Reveal delay={80}>
        <div className="mt-10 rounded-[4px] border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="label-caps">one frame · the bus between them</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-inksoft">commands · 0 tokens</span>
          </div>

          <div className="grid md:grid-cols-[1fr_auto_1fr]">
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
              <div className="label-caps relative mt-5 text-center">desk agent</div>
              <p className="relative mt-1 text-center text-[13px] leading-relaxed text-inksoft">
                the buyer's agent — it shops, you approve.
              </p>
              <div className="relative">
                <SkillLog lines={DESK_SKILLS} />
              </div>
            </Spot>

            {/* the rail — the bus, with the packet's ring */}
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

            {/* the coco zone — the one band-lit surface on the page */}
            <Spot
              tint="color-mix(in srgb, var(--band) 8%, transparent)"
              className="border-t border-line p-7 md:border-l md:border-t-0"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle, var(--line-strong) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
              <div className="relative flex items-center justify-center py-4">
                <div aria-hidden className="absolute size-36 rounded-full bg-band-ink blur-2xl" />
                <GhostBody playing={false} mood="wide" size={96} />
              </div>
              <div className="relative mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-inksoft">
                <span aria-hidden className={cn("h-1 w-1 rounded-full", summoning || ping ? "bg-band" : "bg-inksoft/40")} />
                {summoning ? "summoning" : ping ? "humming" : "quiet"}
              </div>
              <div className="label-caps relative mt-5 text-center">coco</div>
              <p className="relative mt-1 text-center text-[13px] leading-relaxed text-inksoft">
                the music ghost — summoned, it hums what was asked.
              </p>
              <div className="relative">
                <SkillLog lines={COCO_SKILLS} />
              </div>
            </Spot>
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
                prompt, a hard ceiling. Music never touches it.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      <p className="mt-12 text-[13px] leading-relaxed text-inksoft">
        The desk floats on every page — click it. Coco answers when called.
      </p>
    </div>
  );
}
