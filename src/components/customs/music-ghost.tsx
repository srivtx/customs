"use client";

/**
 * music-ghost.tsx — the second agent. The desk head you know, in the
 * band's red, with a wisp tail: summoned over the music bus by the desk
 * agent's chat, it materializes, bobs to the beat, closes its eyes when
 * a passage earns it, and obeys — from chat ("play X", "skip", "stop"),
 * from its own control bubble, or from being poked.
 *
 * Face law: eyes only, no mouth (the character's geometry is fixed —
 * expressiveness comes from motion, not parts). Containment law: the
 * wisp is part of the silhouette and sways by transform, never by paint.
 * Commands cost zero tokens — the rules brain owns this whole path (D7).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { musicBus } from "@/lib/customs/music/store";
import type { MusicCommand } from "@/lib/customs/music/store";
import type { Track } from "@/lib/customs/music/youtube";

const POS_KEY = "customs-ghost-pos-v1";

type GhostState = "hidden" | "arriving" | "out" | "leaving";
type Mood = "wide" | "enjoy" | "squint";

/** the slice of the IFrame API the ghost actually speaks */
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  loadVideoById: (id: string) => void;
  setVolume: (v: number) => void;
  getCurrentTime: () => number;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          width: number;
          height: number;
          playerVars?: Record<string, unknown>;
          events?: { onStateChange?: (e: { data: number }) => void };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/* the eyes' inner life: while the music plays they ride the beat wide,
   and every ~7s the passage earns a 2.2s closed-eyes enjoy. Idle eyes
   stay wide — the mood is derived from `playing`, never set in an effect. */
function useEyeMood(playing: boolean): Mood {
  const [mood, setMood] = useState<Mood>("wide");
  useEffect(() => {
    if (!playing) return;
    let alive = true;
    let rest: ReturnType<typeof setTimeout> | null = null;
    const cycle = () => {
      if (!alive) return;
      setMood("enjoy");
      rest = setTimeout(() => {
        if (!alive) return;
        setMood("wide");
        rest = setTimeout(cycle, 5200);
      }, 2200);
    };
    const first = setTimeout(cycle, 4200);
    return () => {
      alive = false;
      clearTimeout(first);
      if (rest) clearTimeout(rest);
    };
  }, [playing]);
  return playing ? mood : "wide";
}

/* the YouTube IFrame API, loaded once per page */
let ytLoading: Promise<void> | null = null;
function loadYtApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytLoading) return ytLoading;
  ytLoading = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytLoading;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function MusicGhost() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<GhostState>("hidden");
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [progress, setProgress] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  const [volume, setVolume] = useState(70);

  const playerRef = useRef<YTPlayer | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<{ tracks: Track[]; index: number }>({ tracks: [], index: 0 });
  const drag = useRef({ active: false, moved: false, px: 0, py: 0, ox: 0, oy: 0 });
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arriveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeRef = useRef(70);

  const eyeMood = useEyeMood(playing);
  const track = queue[index] ?? null;

  /* position: docked bottom-right, above the footer rails, first visit —
     restored off the render pass so the effect never sets state mid-cascade */
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(POS_KEY);
        if (raw) {
          const p = JSON.parse(raw) as { x: number; y: number };
          if (typeof p.x === "number" && typeof p.y === "number") {
            setPos(p);
            return;
          }
        }
      } catch {
        /* private mode: dock default */
      }
      setPos({ x: window.innerWidth - 96, y: window.innerHeight - 220 });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (pos) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(pos));
      } catch {
        /* private mode */
      }
    }
  }, [pos]);

  const ensurePlayer = useCallback(async () => {
    if (playerRef.current) return playerRef.current;
    await loadYtApi();
    if (!window.YT?.Player || !mountRef.current) return null;
    const p = new window.YT.Player(mountRef.current, {
      width: 200,
      height: 112,
      playerVars: { rel: 0, modestbranding: 1 },
      events: {
        onStateChange: (e: { data: number }) => {
          /* 1 = playing, 2 = paused */
          setPlaying(e.data === 1);
          if (e.data === 1) setNeedsTap(false);
        },
      },
    });
    p.setVolume(volumeRef.current);
    playerRef.current = p;
    return p;
  }, []);

  const perform = useCallback(
    async (tracks: Track[], from: number) => {
      if (!tracks.length) return;
      setQueue(tracks);
      setIndex(from);
      queueRef.current = { tracks, index: from };
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      setState("arriving");
      if (arriveTimer.current) clearTimeout(arriveTimer.current);
      arriveTimer.current = setTimeout(() => setState("out"), 950);
      setBubble(true);
      setProgress(0);
      const p = await ensurePlayer();
      if (!p) return;
      setNeedsTap(false);
      p.loadVideoById(tracks[from].videoId);
    },
    [ensurePlayer]
  );

  /* a control with nothing playing: the ghost pops out, wanders its
     eyes, tucks away — the relay was received, honestly unanswered */
  const shrug = useCallback(() => {
    setState((s) => (s === "hidden" || s === "leaving" ? "arriving" : s));
    if (arriveTimer.current) clearTimeout(arriveTimer.current);
    arriveTimer.current = setTimeout(() => setState("out"), 950);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      if (queueRef.current.tracks.length) return;
      setState("leaving");
      setTimeout(() => setState("hidden"), 900);
    }, 1600);
  }, []);

  /* the wire: the desk agent calls, the ghost answers */
  useEffect(() => {
    return musicBus.subscribe((cmd: MusicCommand) => {
      if (cmd.action === "play") {
        if (cmd.error || !cmd.tracks.length) return;
        void perform(cmd.tracks, 0);
        return;
      }
      const p = playerRef.current;
      const active = queueRef.current.tracks.length > 0;
      switch (cmd.action) {
        case "skip": {
          if (!active) return shrug();
          const next = (queueRef.current.index + 1) % queueRef.current.tracks.length;
          queueRef.current.index = next;
          setIndex(next);
          setProgress(0);
          p?.loadVideoById(queueRef.current.tracks[next].videoId);
          break;
        }
        case "pause":
          if (!active) return shrug();
          p?.pauseVideo();
          break;
        case "resume":
          if (!active) return shrug();
          p?.playVideo();
          break;
        case "louder":
          setVolume((v) => {
            const nv = Math.min(100, v + 20);
            volumeRef.current = nv;
            p?.setVolume(nv);
            return nv;
          });
          break;
        case "quieter":
          setVolume((v) => {
            const nv = Math.max(10, v - 20);
            volumeRef.current = nv;
            p?.setVolume(nv);
            return nv;
          });
          break;
        case "stop":
          if (!active) return shrug();
          p?.stopVideo();
          setQueue([]);
          queueRef.current = { tracks: [], index: 0 };
          setBubble(false);
          setPlaying(false);
          setState("leaving");
          if (leaveTimer.current) clearTimeout(leaveTimer.current);
          leaveTimer.current = setTimeout(() => setState("hidden"), 900);
          break;
      }
    });
  }, [perform, shrug]);

  /* the progress ride — one cheap poll, transform-only fill */
  useEffect(() => {
    if (!playing || !track) return;
    const iv = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const dur = track.durationSec || 1;
      setProgress(Math.min(1, p.getCurrentTime() / dur));
    }, 1000);
    return () => clearInterval(iv);
  }, [playing, track]);

  /* drag vs click — the desk head's own law */
  const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    drag.current = { active: true, moved: false, px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active || !pos) return;
    const dx = e.clientX - drag.current.px;
    const dy = e.clientY - drag.current.py;
    if (!drag.current.moved && Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    if (drag.current.moved) {
      setPos({
        x: Math.min(Math.max(8, drag.current.ox + dx), window.innerWidth - 72),
        y: Math.min(Math.max(8, drag.current.oy + dy), window.innerHeight - 170),
      });
    }
  };
  const onUp = () => {
    if (drag.current.active && !drag.current.moved) {
      if (track) setBubble((v) => !v);
      else shrug();
    }
    drag.current.active = false;
  };

  if (!pos || state === "hidden") return null;

  return (
    <div className="fixed z-50 select-none" style={{ left: pos.x, top: pos.y }} data-ghost="">
      {bubble && track && (
        <div className="animate-rise absolute bottom-[96px] right-0 w-[236px] overflow-hidden rounded-[6px] border border-line-strong bg-card" role="region" aria-label="now playing">
          {/* the stage — the player lives at visible size; the music and
              the artwork are the same object, nothing is faked */}
          <div className="border-b border-line">
            <div ref={mountRef} className="block h-[112px] w-[200px]" />
          </div>
          <div className="px-3 pb-2.5 pt-2">
            <p className="truncate text-[12.5px] leading-snug text-ink" title={track.title}>
              {track.title}
            </p>
            <p className="mt-0.5 font-mono text-[10px] tracking-[0.04em] text-inksoft">{track.channel}</p>
            {/* the ride: hairline track, band fill, transform only */}
            <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-line2">
              <div className="h-full w-full origin-left rounded-full bg-band" style={{ transform: `scaleX(${progress})` }} />
            </div>
            <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-inksoft">
              <span>{fmt(progress * (track.durationSec || 0))}</span>
              <span>{fmt(track.durationSec)}</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {needsTap ? (
                <button
                  onClick={() => playerRef.current?.playVideo()}
                  className="flex h-7 flex-1 items-center justify-center rounded-[4px] bg-band text-[11.5px] font-medium text-band-contrast"
                  aria-label="play — the browser held the first note back"
                >
                  ▶ play
                </button>
              ) : (
                <button
                  onClick={() => (playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo())}
                  className="flex h-7 flex-1 items-center justify-center rounded-[4px] border border-line2 text-[11.5px] text-ink transition-colors hover:border-ink/40"
                  aria-label={playing ? "pause the music" : "resume the music"}
                >
                  {playing ? "❚❚" : "▶"}
                </button>
              )}
              <button
                onClick={() => {
                  const next = (index + 1) % Math.max(queue.length, 1);
                  setIndex(next);
                  setProgress(0);
                  playerRef.current?.loadVideoById(queue[next].videoId);
                }}
                className="flex h-7 w-9 items-center justify-center rounded-[4px] border border-line2 text-[11.5px] text-ink transition-colors hover:border-ink/40"
                aria-label="next track"
              >
                ▶▶
              </button>
              <button
                onClick={() => musicBus.emit({ action: "stop" })}
                className="flex h-7 w-9 items-center justify-center rounded-[4px] border border-line2 text-[11.5px] text-ink transition-colors hover:border-ink/40"
                aria-label="dismiss the ghost"
              >
                ■
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        aria-label="the music ghost — drag to move, click for controls"
        title="the music ghost — drag me, click me"
        className={cn(
          "relative z-10 block cursor-grab touch-none active:cursor-grabbing",
          state === "arriving" && "ghost-arrive",
          state === "leaving" && "ghost-sink"
        )}
      >
        <GhostBody playing={playing && state === "out"} mood={eyeMood} />
      </button>
    </div>
  );
}

/**
 * GhostBody — the character. One band-red volume, a wisp skirt clipped
 * to its own path, two eyes and nothing else. The bob rides the beat
 * clock; the wisp sways slower than the bob, like fabric trailing.
 */
export function GhostBody({ playing, mood, size = 64 }: { playing: boolean; mood: Mood; size?: number }) {
  return (
    <svg width={size} height={(size * 44) / 32} viewBox="0 0 32 44" aria-hidden="true" className={cn("ghost-stage", playing && "ghost-playing")}>
      <defs>
        <clipPath id="ghost-silhouette">
          <path d="M3 16 a13 13 0 0 1 26 0 v16 q-4.5 3 -8.5 0 q-4.5 -3 -9 0 q-4.5 3 -8.5 0 Z" />
        </clipPath>
      </defs>
      <g className="ghost-bob">
        {/* the volume: head circle flowing into the wisp skirt — one path */}
        <path
          className="ghost-body-fill"
          d="M3 16 a13 13 0 0 1 26 0 v16 q-4.5 3 -8.5 0 q-4.5 -3 -9 0 q-4.5 3 -8.5 0 Z"
          fill="var(--band)"
        />
        {/* the wisp's inner drift stays inside the silhouette */}
        <g clipPath="url(#ghost-silhouette)">
          <path className="ghost-wisp" d="M6 22 q10 6 20 0 v14 H6 Z" fill="rgba(255,255,255,0.07)" />
        </g>
        {/* the eyes — open pairs, happy arcs and squints cross-fade by opacity */}
        {(
          [
            [11.5, "e1"],
            [20.5, "e2"],
          ] as const
        ).map(([cx, key]) => (
          <g key={key} className={`ghost-eye-g ${key}`}>
            <g className="ghost-eye-open" opacity={mood === "wide" ? 1 : 0}>
              <circle cx={cx} cy="14.5" r="2.1" fill="var(--paper)" />
            </g>
            <g className="ghost-eye-arc" opacity={mood === "enjoy" ? 1 : 0}>
              <path d={`M${cx - 2} 14.9 q2 -2.4 4 0`} fill="none" stroke="var(--paper)" strokeWidth="1.3" strokeLinecap="round" />
            </g>
            <g className="ghost-eye-squint" opacity={mood === "squint" ? 1 : 0}>
              <rect x={cx - 1.9} y="14" width="3.8" height="1" rx="0.5" fill="var(--paper)" />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}
