"use client";

/**
 * agents.tsx — the agents view: the two characters, live, and the
 * handoff between them. The page demonstrates by doing — the summon
 * button rides the same wire the desk's chat does (the server-side
 * rules brain catches it at zero tokens) and coco answers on the real
 * bus, right here. Both heads are the real components, mid-choreography.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DeskHead, GhostButton, InkButton, SectionLabel } from "./bits";
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

const HANDOFF: { who: string; text: string; machine?: boolean }[] = [
  { who: "you", text: "\u201cplay africa by toto\u201d" },
  { who: "desk", text: "the rules brain catches it · 0 tokens · the crate is searched", machine: true },
  { who: "desk → coco", text: "the music event rides the bus — the handoff", machine: true },
  { who: "coco", text: "▶ Toto - Africa (Lyrics) — 7clouds", machine: true },
];

export function AgentsPage({ onEnter }: { onEnter: (v: View) => void }) {
  const [summoning, setSummoning] = useState(false);
  const [said, setSaid] = useState<string | null>(null);

  /* the demonstration: the same wire the desk's chat rides — the
     server-side rules brain catches the wish at zero tokens, the tracks
     come back, and coco performs on the real bus */
  const summon = async () => {
    if (summoning) return;
    setSummoning(true);
    setSaid("searching the crate…");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "play something chill", adapter: "naive" }),
      });
      const data = (await res.json()) as { ok: boolean; events?: ChatEvent[] };
      const music = data.events?.find(
        (e): e is Extract<ChatEvent, { kind: "music" }> => "kind" in e && e.kind === "music"
      );
      if (music && music.action === "play" && music.tracks.length) {
        musicBus.emit({ action: "play", tracks: music.tracks, query: music.query, mood: music.mood, error: music.note });
        setSaid(`coco is on it — ${music.tracks[0].title}`);
      } else {
        setSaid(music?.note === "no-key" ? "the crate is locked — no YouTube key on this desk." : "nothing surfaced — try again.");
      }
    } catch {
      setSaid("the crate didn't answer — try again.");
    } finally {
      setSummoning(false);
    }
  };

  return (
    <div className="mx-auto max-w-[900px]">
      <SectionLabel>the agents</SectionLabel>
      <h2 className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink">
        two agents, one desk.
      </h2>
      <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-inksoft">
        The desk agent buys within a signed mandate. Coco plays what was
        asked. One calls the other over a wire you can watch.
      </p>

      {/* the two characters — the real heads, mid-choreography */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-[4px] border border-line bg-card p-7">
          <div className="flex items-center justify-center py-2">
            <DeskHead size={96} className="text-ink" />
          </div>
          <div className="label-caps mt-5 text-center">desk agent</div>
          <p className="mt-1 text-center text-[13px] leading-relaxed text-inksoft">
            the buyer's agent — it shops, you approve.
          </p>
          <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
            {DESK_SKILLS.map((s) => (
              <li key={s} className="flex gap-2.5 text-[13px] leading-relaxed text-inksoft">
                <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-line-strong" />
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.1em] text-inksoft">commands · 0 tokens</p>
        </div>
        <div className="rounded-[4px] border border-line bg-card p-7">
          <div className="flex items-center justify-center py-2">
            <GhostBody playing={false} mood="wide" size={96} />
          </div>
          <div className="label-caps mt-5 text-center">coco</div>
          <p className="mt-1 text-center text-[13px] leading-relaxed text-inksoft">
            the music ghost — summoned, it hums what was asked.
          </p>
          <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
            {COCO_SKILLS.map((s) => (
              <li key={s} className="flex gap-2.5 text-[13px] leading-relaxed text-inksoft">
                <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-band" />
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.1em] text-inksoft">commands · 0 tokens</p>
        </div>
      </div>

      {/* the handoff — the wire, as the transcript sees it */}
      <div className="mt-10 border-t border-line pt-8">
        <SectionLabel>the handoff</SectionLabel>
        <div className="mt-5 rounded-[4px] border border-line bg-card p-6">
          <div className="space-y-3">
            {HANDOFF.map((l) => (
              <div key={l.who} className="flex items-baseline gap-3">
                <span className="w-24 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.08em] text-inksoft">
                  {l.who}
                </span>
                <span className={cn("font-mono text-[12px] leading-relaxed", l.machine ? "text-inksoft" : "text-ink")}>
                  {l.text}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
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

      {/* how it stays cheap */}
      <div className="mt-10 border-t border-line pt-8">
        <SectionLabel>how it stays cheap</SectionLabel>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[4px] border border-line p-5">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-inksoft">rules brains</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-inksoft">
              Every command — search, add, checkout, play, skip, hide — is
              caught by deterministic rules. Zero tokens, replayable
              bit-for-bit.
            </p>
          </div>
          <div className="rounded-[4px] border border-line p-5">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-inksoft">the model, on a leash</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-inksoft">
              Only casual chat reaches an LLM — the cheap voice, a tiny
              prompt, a hard ceiling. Music never touches it.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-12 text-[13px] leading-relaxed text-inksoft">
        The desk floats on every page — click it. Coco answers when called.
      </p>
    </div>
  );
}
