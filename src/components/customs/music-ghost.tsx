"use client";

/**
 * music-ghost.tsx — coco, the second agent. The desk head's own body —
 * same round volume, same two eyes, same idle choreography (the classes
 * are shared with `DeskHead`, glance for glance) — filled with the
 * band's red instead of ink.
 *
 * Summoned over the music bus by the desk agent's chat, it bobs to the
 * beat, closes its eyes when a passage earns it, and obeys — from the
 * desk's chat, from its own control card (three buttons, one hairline
 * bubble), or from its own chat window: click coco and a panel opens,
 * the desk agent's chat in miniature. Its ear is the local rules brain
 * — control verbs run at zero tokens; a play wish is honestly deflected
 * to the desk, never drained through an LLM.
 *
 * Face law: eyes only, no mouth. Player law: the IFrame API's methods
 * only exist after onReady — everything goes through the ready promise;
 * the stage's React-owned wrapper persists, so the player is created
 * once and never orphaned. Hide ≠ stop: tucking coco away keeps the
 * music humming.
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

interface ChatLine {
  id: number;
  who: "user" | "coco" | "note";
  text: string;
}

/**
 * TypeLine — coco's voice arrives like speech, the desk agent's own
 * reveal: a smooth left-to-right sweep (~80 chars/s), instant under
 * reduced motion.
 */
function TypeLine({ text, className }: { text: string; className?: string }) {
  const instant =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [n, setN] = useState(instant ? text.length : 0);
  useEffect(() => {
    if (instant) return;
    const iv = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(iv);
          return v;
        }
        return Math.min(v + 2, text.length);
      });
    }, 24);
    return () => clearInterval(iv);
  }, [text, instant]);
  return <span className={className}>{text.slice(0, n)}</span>;
}

export function MusicGhost() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<GhostState>("hidden");
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [card, setCard] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState<ChatLine[]>([]);
  /* the fresh page: the conversation fades before it clears — a reset
     should read as turning a sheet over, not a wipe */
  const [chatClearing, setChatClearing] = useState(false);
  /* the chat opens downward when coco lives in the upper sky (the desk
     panel's own law), upward when it sits near the floor */
  const [chatBelow, setChatBelow] = useState(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef<Promise<YTPlayer> | null>(null);
  const queueRef = useRef<{ tracks: Track[]; index: number }>({ tracks: [], index: 0 });
  const drag = useRef({ active: false, moved: false, px: 0, py: 0, ox: 0, oy: 0 });
  const stateTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const volumeRef = useRef(70);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  /* chat ids mint synchronously in the handler, never inside an updater
     — the desk panel's duplicate-key lesson, inherited whole */
  const chatIdRef = useRef(1);
  /* single vs double click: the first click waits a beat for a sibling */
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setChatBelow(pos.y < window.innerHeight * 0.45);
    }
  }, [pos]);

  /* the chat minds itself: it opens to its own ear, scrolls to the last
     word, closes on esc — and on a click that lands outside coco */
  useEffect(() => {
    if (chatOpen) chatInputRef.current?.focus();
    const el = chatBodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatOpen, chat]);

  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChatOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setChatOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [chatOpen]);

  /* the whole ghost unmounts when it tucks away — the player dies with
     it, so the ready promise must too (the next summon starts fresh) */
  useEffect(() => () => {
    readyRef.current = null;
    stateTimers.current.forEach(clearTimeout);
    if (clickTimer.current) clearTimeout(clickTimer.current);
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
      setCard(true);
      setTucked(false);
      setProgress(0);
      /* the handoff receipt rides coco's own chat, even while closed */
      const note: ChatLine = { id: chatIdRef.current++, who: "note", text: `now playing · ${tracks[0].title}` };
      setChat((p) => [...p, note]);
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
              /* the card unmounts with the track — the iframe dies, so
                 the ready promise must too (the next summon starts fresh) */
              readyRef.current = null;
              setTrack(null);
              setPlaying(false);
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

  /* drag vs click — the desk head's own law; a click opens coco's ear */
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
      if (clickTimer.current) {
        /* the second click of a double: the video toggles — it sinks to
           the background with the music humming on, and comes back the
           same way. A video the browser still holds back can't sink;
           it hasn't begun. */
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        if (track) {
          if (needsTap) {
            cocoSay("tap play first — then I can take it to the background.");
          } else if (card) {
            setCard(false);
            cocoSay("video in the background — the music hums on.");
          } else {
            setCard(true);
            cocoSay("the screen is back.");
          }
        }
      } else {
        clickTimer.current = setTimeout(() => {
          clickTimer.current = null;
          setChatOpen((v) => !v);
        }, 260);
      }
    }
    drag.current.active = false;
  };

  /* coco's own ear: control verbs run on the local rules brain at zero
     tokens; a play wish is deflected to the desk — the record crate is
     the desk's tool, and no token is spent pretending otherwise */
  const cocoSay = (text: string) => {
    const line: ChatLine = { id: chatIdRef.current++, who: "coco", text };
    setChat((p) => [...p, line]);
  };
  const tellCoco = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const userLine: ChatLine = { id: chatIdRef.current++, who: "user", text };
    setChat((p) => [...p, userLine]);
    if (/^(?:hi|hello|hey|yo|sup)\b[,.! ]*(?:coco)?[.!]*$/i.test(text)) {
      cocoSay("hey. tell me skip, pause, hide — or say give me controls.");
      return;
    }
    const intent = parseMusicIntent(text);
    if (intent && intent.action !== "play") {
      musicBus.emit({ action: intent.action });
      cocoSay(
        intent.action === "hide"
          ? "tucked — still humming."
          : intent.action === "controls"
            ? "controls up."
            : `${intent.action}, ok.`
      );
      return;
    }
    if (intent?.action === "play") {
      cocoSay(
        intent.query
          ? `the desk holds the record crate — ask it to play ${intent.query}.`
          : "the desk holds the record crate — ask it for a track."
      );
      return;
    }
    cocoSay("I hum — tell me skip, pause, louder, hide, or give me controls.");
  };

  /* the fresh page — the desk panel's ↻, inherited whole. The music is
     untouched: a reset clears the conversation, never the hum. */
  const resetChat = () => {
    if (chatClearing) return;
    setChatClearing(true);
    setTimeout(() => {
      setChat([]);
      setChatClearing(false);
    }, 260);
  };

  if (!pos || state === "hidden") return null;

  const cardShown = track !== null && (card || needsTap);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "fixed z-50 select-none transition-all duration-300 ease-out",
        tucked && "pointer-events-none translate-y-3 scale-90 opacity-0"
      )}
      style={{ left: pos.x, top: pos.y }}
      data-ghost=""
    >
      {track && (
        <div
          className={cn(
            "animate-rise absolute bottom-[64px] right-0 w-[236px] overflow-hidden rounded-[6px] border border-line-strong bg-card transition-all duration-300 ease-out",
            !(card || needsTap) && "pointer-events-none translate-y-2 scale-95 opacity-0"
          )}
          role="region"
          aria-label="coco is playing"
        >
          {/* the stage — the card stays mounted while a track lives, so
              the player (and the music) survive the background sink; the
              iframe dies only when the track does */}
          <div className="overflow-hidden border-b border-line">
            <div ref={mountRef} className="block h-[112px] w-[200px]" />
          </div>
          <div className="px-3 pb-2.5 pt-2">
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
            {/* three buttons, one hairline bubble — the contract's law */}
            <div className="mt-2.5 flex items-center gap-1.5">
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
                  musicBus.emit({ action: "skip" });
                }}
                className="flex h-7 w-9 items-center justify-center rounded-[4px] border border-line2 text-[11.5px] text-ink transition-colors hover:border-ink/40"
                aria-label="skip to the next track in the queue"
              >
                ⇥
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
          </div>
        </div>
      )}

      {/* coco's chat — the desk agent's panel in miniature: same hairline
          header with the face and one dot, same quiet close, same well.
          It drops downward from coco when there is sky below, otherwise
          rises — clearing the card when the card is up. */}
      {chatOpen && (
        <div
          className={cn(
            "animate-rise absolute right-0 flex max-h-[400px] w-[280px] flex-col overflow-hidden rounded-[6px] border border-line-strong bg-card",
            chatBelow ? "top-full mt-2" : cardShown ? "bottom-[316px]" : "bottom-[64px]"
          )}
          role="dialog"
          aria-label="coco chat"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5">
            <GhostBody playing={playing} mood="wide" size={24} />
            <div className="flex-1">
              <div className="label-caps">coco</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-inksoft">
                <span aria-hidden className={cn("h-1 w-1 rounded-full", playing ? "bg-band" : "bg-inksoft/40")} />
                {playing ? "humming" : "quiet"}
              </div>
            </div>
            <button
              onClick={() => musicBus.emit({ action: "hide" })}
              aria-label="hide coco — the music keeps playing"
              title="hide — the music keeps humming"
              className="text-[11px] leading-none text-inksoft transition-colors hover:text-ink"
            >
              hide
            </button>
            <button
              onClick={resetChat}
              aria-label="fresh page — clear this conversation"
              title="fresh page"
              className="px-0.5 text-[12px] leading-none text-inksoft transition-colors hover:text-ink"
            >
              ↻
            </button>
            <button
              onClick={() => setChatOpen(false)}
              aria-label="close coco's chat"
              className="text-[13px] leading-none text-inksoft transition-colors hover:text-ink"
            >
              ✕
            </button>
          </div>
          <div
            ref={chatBodyRef}
            role="log"
            aria-live="polite"
            className={cn(
              "min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3 transition-opacity duration-300",
              chatClearing && "opacity-0"
            )}
          >
            {chat.length === 0 && !chatClearing && (
              <p className="animate-rise py-4 text-center text-[12px] leading-relaxed text-inksoft">
                coco hums what the desk brings — tell it skip, pause, hide, or ask for controls.
              </p>
            )}
            {chat.map((l) =>
              l.who === "user" ? (
                <div key={l.id} className="animate-rise flex justify-end">
                  <div className="max-w-[85%] rounded-[4px] bg-ink px-2.5 py-1.5 text-[12.5px] text-paper">{l.text}</div>
                </div>
              ) : l.who === "coco" ? (
                <p key={l.id} className="animate-rise text-[12.5px] leading-relaxed text-ink">
                  <TypeLine text={l.text} />
                </p>
              ) : (
                <p key={l.id} className="animate-rise border-l border-band pl-2 font-mono text-[10.5px] leading-relaxed text-inksoft">
                  {l.text}
                </p>
              )
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const el = e.currentTarget.elements.namedItem("tell") as HTMLInputElement | null;
              if (!el) return;
              tellCoco(el.value);
              el.value = "";
            }}
            className="border-t border-line p-2.5"
          >
            <div className="flex items-center gap-2 rounded-[4px] border border-line2 bg-paper2 px-2.5 py-1.5 transition-colors focus-within:border-ink/30">
              <input
                name="tell"
                ref={chatInputRef}
                placeholder="tell coco…"
                aria-label="message coco"
                autoComplete="off"
                className="h-6 flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-inksoft/60 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="send to coco"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] bg-ink text-paper transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M8 13V3M4 7l4-4 4 4" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        aria-label="coco — the desk's red ghost — drag to move, click to chat, double-click for background"
        title="coco — drag me, click to chat, double-click for background"
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
