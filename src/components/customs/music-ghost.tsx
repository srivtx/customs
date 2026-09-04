"use client";

/**
 * music-ghost.tsx — the second agent. The desk head's own body — same
 * round volume, same two eyes, same idle choreography (the classes are
 * shared with `DeskHead`, so the glance-for-glance movements are
 * identical) — filled with the band's red instead of ink.
 *
 * Summoned over the music bus by the desk agent's chat, it bobs to the
 * beat, closes its eyes when a passage earns it, and obeys — from chat
 * ("play X", "skip", "stop"), from its own control card, or from a click.
 *
 * Face law: eyes only, no mouth. Player law: the IFrame API's methods
 * only exist after onReady — everything goes through the ready promise;
 * the stage's React-owned wrapper persists (full ⇄ mini), so the player
 * is created once and never orphaned.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { musicBus } from "@/lib/customs/music/store";
import type { MusicCommand } from "@/lib/customs/music/store";
import type { Track } from "@/lib/customs/music/youtube";
import { parseMusicIntent } from "@/lib/customs/music/brain";

const POS_KEY = "customs-ghost-pos-v1";

type GhostState = "hidden" | "arriving" | "out" | "leaving";
type Mood = "wide" | "enjoy";

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
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => unknown;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/* the eyes' inner life: while the music plays, every ~7s the passage
   earns a 2.2s closed-eyes enjoy. Wide otherwise — derived from `playing`
   when idle so no effect ever sets state synchronously. */
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
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [deck, setDeck] = useState<"full" | "mini">("full");
  const [progress, setProgress] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [card, setCard] = useState(false);
  const [cocoLine, setCocoLine] = useState<string | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef<Promise<YTPlayer> | null>(null);
  const queueRef = useRef<{ tracks: Track[]; index: number }>({ tracks: [], index: 0 });
  const drag = useRef({ active: false, moved: false, px: 0, py: 0, ox: 0, oy: 0 });
  const stateTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const volumeRef = useRef(70);

  const eyeMood = useEyeMood(playing);

  /* position: docked bottom-right, restored off the render pass so the
     effect never sets state mid-cascade */
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
      setPos({ x: window.innerWidth - 96, y: window.innerHeight - 190 });
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

  /* the whole ghost unmounts when it tucks away — the player dies with
     it, so the ready promise must too (the next summon starts fresh) */
  useEffect(() => () => {
    readyRef.current = null;
    stateTimers.current.forEach(clearTimeout);
  }, []);

  const schedule = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms);
    stateTimers.current.push(t);
  };

  /* the player: created once; its methods exist only after onReady, so
     every caller goes through the ready promise */
  const ensurePlayer = useCallback((): Promise<YTPlayer> => {
    if (readyRef.current) return readyRef.current;
    readyRef.current = loadYtApi().then(
      () =>
        new Promise<YTPlayer>((resolve, reject) => {
          if (!window.YT?.Player || !mountRef.current) {
            reject(new Error("no yt"));
            return;
          }
          new window.YT.Player(mountRef.current, {
            width: 200,
            height: 112,
            playerVars: { rel: 0, modestbranding: 1 },
            events: {
              onReady: (e) => {
                e.target.setVolume(volumeRef.current);
                resolve(e.target);
              },
              onStateChange: (e) => {
                /* 1 = playing, 2 = paused */
                setPlaying(e.data === 1);
                if (e.data === 1) setNeedsTap(false);
              },
            },
          });
        })
    );
    return readyRef.current;
  }, []);

  const perform = useCallback(
    (tracks: Track[]) => {
      if (!tracks.length) return;
      queueRef.current = { tracks, index: 0 };
      setTrack(tracks[0]);
      setDeck("full");
      setCard(true);
      setTucked(false);
      setProgress(0);
      setState("arriving");
      schedule(950, () => setState("out"));
      void ensurePlayer()
        .then((p) => {
          setNeedsTap(false);
          p.loadVideoById(tracks[0].videoId);
        })
        .catch(() => {});
    },
    [ensurePlayer]
  );

  /* a control with nothing playing: the ghost pops out, wanders its
     eyes, tucks away — the relay was received, honestly unanswered */
  const shrug = useCallback(() => {
    setState((s) => (s === "hidden" || s === "leaving" ? "arriving" : s));
    schedule(950, () => setState("out"));
    schedule(1600, () => {
      setState("leaving");
      schedule(900, () => setState("hidden"));
    });
  }, []);

  /* the wire: the desk agent calls, the ghost answers */
  useEffect(() => {
    return musicBus.subscribe((cmd: MusicCommand) => {
      if (cmd.action === "play") {
        if (cmd.error || !cmd.tracks.length) return;
        perform(cmd.tracks);
        return;
      }
      /* hide ≠ stop: tucked away, the music keeps humming */
      if (cmd.action === "hide") {
        setTucked(true);
        return;
      }
      if (cmd.action === "controls") {
        setTucked(false);
        setCard(true);
        return;
      }
      const has = (t: Track | null): t is Track => t !== null;
      if (!has(track)) return shrug();
      void ensurePlayer()
        .then((p) => {
          switch (cmd.action) {
            case "skip": {
              const q = queueRef.current;
              if (q.tracks.length < 2) {
                /* a one-track summon: skip means "something else" — the
                   ghost keeps its place and lets the desk pick again */
                break;
              }
              const next = (q.index + 1) % q.tracks.length;
              queueRef.current = { ...q, index: next };
              setTrack(q.tracks[next]);
              setProgress(0);
              p.loadVideoById(q.tracks[next].videoId);
              break;
            }
            case "pause":
              p.pauseVideo();
              break;
            case "resume":
              p.playVideo();
              break;
            case "louder":
              volumeRef.current = Math.min(100, volumeRef.current + 20);
              p.setVolume(volumeRef.current);
              break;
            case "quieter":
              volumeRef.current = Math.max(10, volumeRef.current - 20);
              p.setVolume(volumeRef.current);
              break;
            case "stop":
              p.stopVideo();
              queueRef.current = { tracks: [], index: 0 };
              setTrack(null);
              setPlaying(false);
              setDeck("full");
              setState("leaving");
              schedule(900, () => setState("hidden"));
              break;
          }
        })
        .catch(() => {});
    });
  }, [perform, shrug, ensurePlayer, track]);

  /* the progress ride — one cheap poll, transform-only fill */
  useEffect(() => {
    if (!playing || !track) return;
    const iv = setInterval(() => {
      void ensurePlayer()
        .then((p) => {
          const dur = track.durationSec || 1;
          setProgress(Math.min(1, p.getCurrentTime() / dur));
        })
        .catch(() => {});
    }, 1000);
    return () => clearInterval(iv);
  }, [playing, track, ensurePlayer]);

  /* drag vs click — the desk head's own law; a click flips the deck */
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
    if (drag.current.active && !drag.current.moved && track) setDeck((d) => (d === "full" ? "mini" : "full"));
    drag.current.active = false;
  };

  /* coco's own ear: type straight to the ghost — control verbs run on
     the local rules brain at zero tokens; anything else gets an honest
     deflection instead of a silent token drain */
  const tellCoco = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const intent = parseMusicIntent(text);
    if (intent && intent.action !== "play") {
      musicBus.emit({ action: intent.action });
      setCocoLine(
        intent.action === "hide"
          ? "tucked — still humming"
          : intent.action === "controls"
            ? "controls up"
            : `${intent.action}, ok`
      );
      return;
    }
    setCocoLine("I hum — ask the desk for a track, or tell me skip / pause / hide");
  };

  if (!pos || state === "hidden") return null;

  return (
    <div
      className={cn(
        "fixed z-50 select-none transition-all duration-300 ease-out",
        tucked && "pointer-events-none translate-y-3 scale-90 opacity-0"
      )}
      style={{ left: pos.x, top: pos.y }}
      data-ghost=""
    >
      {track && (card || needsTap) && (
        <div
          className="animate-rise absolute bottom-[64px] right-0 w-[236px] overflow-hidden rounded-[6px] border border-line-strong bg-card"
          role="region"
          aria-label="coco is playing"
        >
          <button
            onClick={() => setCard(false)}
            aria-label="close the controls — the music keeps playing"
            className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-[4px] border border-line2 bg-card text-[10px] text-inksoft transition-colors hover:border-ink/40"
          >
            ×
          </button>
          {/* the stage — the React-owned wrapper persists through the
              full ⇄ mini flip, so the player is created once and the
              music never dies on a collapse */}
          <div className={cn("overflow-hidden border-b border-line transition-all duration-300 ease-out", deck === "full" ? "max-h-[113px]" : "max-h-0")}>
            <div ref={mountRef} className="block h-[112px] w-[200px]" />
          </div>
          <div className="px-3 pb-2.5 pt-2">
            {deck === "full" && (
              <>
                <p className="truncate text-[12.5px] leading-snug text-ink" title={track.title}>
                  {track.title}
                </p>
                <p className="mt-0.5 font-mono text-[10px] tracking-[0.04em] text-inksoft">{track.channel}</p>
                <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-line2">
                  <div className="h-full w-full origin-left rounded-full bg-band" style={{ transform: `scaleX(${progress})` }} />
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-inksoft">
                  <span>{fmt(progress * (track.durationSec || 0))}</span>
                  <span>{fmt(track.durationSec)}</span>
                </div>
              </>
            )}
            {deck === "mini" && (
              <p className="mb-1.5 truncate text-[11.5px] leading-snug text-ink" title={track.title}>
                {track.title}
              </p>
            )}
            <div className="flex items-center gap-1.5">
              {needsTap ? (
                <button
                  onClick={() => {
                    void ensurePlayer().then((p) => p.playVideo()).catch(() => {});
                  }}
                  className="flex h-7 flex-1 items-center justify-center rounded-[4px] bg-band text-[11.5px] font-medium text-band-contrast"
                  aria-label="play — the browser held the first note back"
                >
                  ▶ play
                </button>
              ) : (
                <button
                  onClick={() => {
                    void ensurePlayer().then((p) => (playing ? p.pauseVideo() : p.playVideo())).catch(() => {});
                  }}
                  className="flex h-7 flex-1 items-center justify-center rounded-[4px] border border-line2 text-[11.5px] text-ink transition-colors hover:border-ink/40"
                  aria-label={playing ? "pause the music" : "resume the music"}
                >
                  {playing ? "❚❚" : "▶"}
                </button>
              )}
              <button
                onClick={() => {
                  musicBus.emit({ action: "hide" });
                }}
                className="flex h-7 w-9 items-center justify-center rounded-[4px] border border-line2 text-[11.5px] text-ink transition-colors hover:border-ink/40"
                aria-label="hide coco — the music keeps playing"
                title="hide — the music keeps humming"
              >
                ▾
              </button>
              <button
                onClick={() => {
                  musicBus.emit({ action: "stop" });
                }}
                className="flex h-7 w-9 items-center justify-center rounded-[4px] border border-line2 text-[11.5px] text-ink transition-colors hover:border-ink/40"
                aria-label="stop the music and dismiss coco"
              >
                ■
              </button>
            </div>
            {deck === "full" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem("tell") as HTMLInputElement | null;
                  if (!input) return;
                  tellCoco(input.value);
                  input.value = "";
                }}
                className="mt-2 flex items-center gap-1.5"
              >
                <input
                  name="tell"
                  placeholder="tell coco…"
                  aria-label="tell coco"
                  className="h-6 min-w-0 flex-1 rounded-[4px] border border-line2 bg-transparent px-1.5 font-mono text-[10.5px] text-ink outline-none placeholder:text-inksoft focus:border-ink/40"
                />
                <button
                  type="submit"
                  className="flex h-6 w-7 items-center justify-center rounded-[4px] border border-line2 text-[10.5px] text-ink transition-colors hover:border-ink/40"
                  aria-label="send to coco"
                >
                  ↵
                </button>
              </form>
            )}
            {cocoLine && deck === "full" && (
              <p className="mt-1 font-mono text-[9.5px] text-inksoft">{cocoLine}</p>
            )}
          </div>
        </div>
      )}

      <button
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        aria-label="coco — the desk's red ghost — drag to move, click to flip the deck"
        title="coco — drag me, click me"
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
 * GhostBody — the desk head's red twin. The same 32×32 viewBox, the same
 * r=13 volume, the same eye classes (`desk-eye-g` / `desk-eye`) that
 * carry the black head's idle choreography — glance for glance, blink
 * for blink. The only additions: the band fill and, while the track
 * plays, the beat bob on the whole head.
 */
export function GhostBody({ playing, mood, size = 56 }: { playing: boolean; mood: Mood; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("ghost-stage", playing && "ghost-playing")}
    >
      <circle cx="16" cy="16" r="13" className="ghost-body-fill" fill="var(--band)" />
      {(
        [
          [11.5, "e1"],
          [20.5, "e2"],
        ] as const
      ).map(([cx, key]) => (
        <g key={key} className={`desk-eye-g ${key}`}>
          {/* the wide eye is the desk head's own — same class, same motion */}
          <g className="ghost-eye-state" opacity={mood === "wide" ? 1 : 0}>
            <circle className="desk-eye" cx={cx} cy="14.5" r="2.1" fill="var(--paper)" />
          </g>
          {/* the enjoy arc cross-fades in when the passage earns it */}
          <g className="ghost-eye-arc" opacity={mood === "enjoy" ? 1 : 0}>
            <path d={`M${cx - 2} 14.9 q2 -2.4 4 0`} fill="none" stroke="var(--paper)" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        </g>
      ))}
    </svg>
  );
}
