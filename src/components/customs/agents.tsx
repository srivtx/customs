"use client";

/**
 * agents.tsx — the agents view, rebuilt on the craft school (Rauno
 * Freiberg's Web Interface Guidelines, Emil Kowalski's duration rules,
 * Linear's calmer interface): decoration deleted — no spotlight, no
 * glows, no texture, no stitch borders. What stays: one hairline frame
 * split by the bus, the two LIVE heads (the page's whole delight
 * budget, shared with the one-shot wire ping that fires only when a
 * summon actually lands), mono labels carrying the rhythm, and hover
 * that changes exactly one quiet thing — the hairline.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DeskHead, GhostButton, InkButton, Reveal, SectionLabel } from "./bits";
import { GhostBody } from "./music-ghost";
import { musicBus } from "@/lib/customs/music/store";
import type { ChatEvent } from "@/lib/customs/agent/loop";
import type { View } from "./shell";

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
  /* the wire's ping: one shot, only when a summon actually lands —
     motion that confirms causality, the page's single flourish */
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
          One frame, split by the bus — and the summon button rides the
          real wire.
        </p>
      </Reveal>

      {/* ONE frame — the rail is the bus itself */}
      <Reveal delay={80}>
        <div className="mt-10 rounded-[4px] border border-line bg-card transition-colors duration-150 hover:border-line-strong">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="label-caps">one frame · the bus between them</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-inksoft">commands · 0 tokens</span>
          </div>

          <div className="grid md:grid-cols-[1fr_auto_1fr]">
            {/* the desk zone — hover changes exactly one quiet thing */}
            <div className="border-b border-line p-7 transition-colors duration-150 hover:bg-card-hover md:border-b-0">
              <div className="flex items-center justify-center py-4">
                <DeskHead size={96} className="text-ink" />
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-inksoft">
                <span aria-hidden className="h-1 w-1 rounded-full bg-cleared/80" />
                on the desk
              </div>
              <div className="label-caps mt-6 text-center">moco</div>
              <p className="mt-1 text-center text-[13px] leading-relaxed text-inksoft">
                the buyer's agent — it shops, you approve.
              </p>
              <SkillLog lines={DESK_SKILLS} />
            </div>

            {/* the rail — the bus, with the packet's one-shot ring */}
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

            {/* the coco zone — the accent side; its hairline eases toward band */}
            <div className="border-t border-line p-7 transition-colors duration-150 hover:bg-card-hover md:border-l md:border-t-0 md:hover:border-band/50">
              <div className="flex items-center justify-center py-4">
                <GhostBody playing={false} mood="wide" size={96} />
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-inksoft">
                <span aria-hidden className={cn("h-1 w-1 rounded-full", summoning || ping ? "bg-band" : "bg-inksoft/40")} />
                {summoning ? "summoning" : ping ? "humming" : "quiet"}
              </div>
              <div className="label-caps mt-6 text-center">coco</div>
              <p className="mt-1 text-center text-[13px] leading-relaxed text-inksoft">
                the music ghost — summoned, it hums what was asked.
              </p>
              <SkillLog lines={COCO_SKILLS} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-inksoft">
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
