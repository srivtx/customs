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
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { musicBus } from "@/lib/customs/music/store";
import type { MusicCommand } from "@/lib/customs/music/store";
import type { Track } from "@/lib/customs/music/youtube";
import type { ChatEvent } from "@/lib/customs/agent/loop";
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
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
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
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
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
  ytLoading = new Promise<void>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
    /* a slow crate must never wedge the ghost: one honest timeout, then
       the next summon retries fresh instead of riding a dead promise
       forever (the old bug — ytLoading never reset on failure) */
    setTimeout(() => reject(new Error("yt api slow")), 12_000);
  }).catch((err) => {
    ytLoading = null;
    throw err;
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
  const [warming, setWarming] = useState(false);
  const [loop, setLoop] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [card, setCard] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState<ChatLine[]>([]);
  /* the fresh page: the conversation fades before it clears — a reset
     should read as turning a sheet over, not a wipe */
  const [chatClearing, setChatClearing] = useState(false);
  const [fetching, setFetching] = useState(false);

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
  /* one crate search at a time — the ref is law, the state is the dot */
  const fetchingRef = useRef(false);
  /* single vs double click: the ear waits one short beat for the
     browser to say "double"; the loop toggle's ref rides its state */
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatAuto = useRef(false);
  const loopRef = useRef(false);

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
            /* restored positions are clamped to today's viewport — a
               saved spot can never park coco off-screen */
            setPos({
              x: Math.min(Math.max(8, p.x), window.innerWidth - 64),
              y: Math.min(Math.max(8, p.y), window.innerHeight - 68),
            });
            return;
          }
        }
      } catch {
        /* private mode: dock default */
      }
      /* the fresh dock: mid-lower sky — the head stays visible and the
         panels have room below */
      setPos({ x: window.innerWidth - 96, y: Math.max(8, window.innerHeight * 0.42) });
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

  /* coco's voice: one line, minted synchronously — the desk panel's
     duplicate-key law, inherited whole */
  const cocoSay = useCallback((text: string) => {
    const line: ChatLine = { id: chatIdRef.current++, who: "coco", text };
    setChat((p) => [...p, line]);
  }, []);

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
            width: 236,
            height: 133,
            playerVars: { rel: 0, modestbranding: 1 },
            events: {
              onReady: (e) => {
                e.target.setVolume(volumeRef.current);
                resolve(e.target);
              },
              onStateChange: (e) => {
                /* 1 = playing, 2 = paused, 3 = buffering, 0 = ended */
                setPlaying(e.data === 1);
                setWarming(e.data === 3);
                if (e.data === 1) setNeedsTap(false);
                /* the loop-back: when the needle hits the end and the
                   loop is armed, the same track plays again */
                if (e.data === 0 && loopRef.current) {
                  e.target.seekTo(0, true);
                  e.target.playVideo();
                }
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
      setWarming(true);
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
        .catch(() => {
          setWarming(false);
          cocoSay("the crate is slow right now — try again in a moment.");
        });
    },
    [ensurePlayer, cocoSay]
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
              setWarming(true);
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
              setWarming(false);
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

  /* the ghost's state, published for moco: "what is coco playing" is
     answered from this snapshot — zero tokens, zero server */
  useEffect(() => {
    musicBus.report(track ? { title: track.title, channel: track.channel, playing } : null);
  }, [track, playing]);

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
        /* the head never leaves the viewport: 56px head + 12px breath */
        y: Math.min(Math.max(8, drag.current.oy + dy), window.innerHeight - 68),
      });
    }
  };
  const onUp = () => {
    /* the ear opens on a single click — after one short beat, so the
       browser can tell it from a double-click (the video's gesture,
       which always cancels this) */
    if (drag.current.active && !drag.current.moved) {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        chatAuto.current = true;
        setChatOpen(true);
      }, 250);
    }
    drag.current.active = false;
  };

  /* the video gesture is the browser's own double-click. The pending
     single-click never fires; a chat it already opened (slow doubles)
     is closed — a double-click is the video's gesture, never the ear's */
  const onDouble = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    if (chatAuto.current) {
      chatAuto.current = false;
      setChatOpen(false);
    }
    if (!track) return;
    if (needsTap) {
      cocoSay("tap play first — then I can take it to the background.");
      return;
    }
    if (card) {
      setCard(false);
      cocoSay("video in the background — the music hums on.");
    } else {
      setCard(true);
      cocoSay("the screen is back.");
    }
  };

  const toggleLoop = () => {
    const next = !loopRef.current;
    loopRef.current = next;
    setLoop(next);
  };

  /* coco's own ear: control verbs run on the local rules brain at zero
     tokens; a play wish rides the desk's chat pipeline over the wire —
     the server-side rules brain catches it at zero tokens (the LLM
     never wakes) and the crate answers here, in coco's voice */
  const tellCoco = async (raw: string) => {
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
      if (fetchingRef.current) {
        cocoSay("one beat — the crate is already spinning.");
        return;
      }
      fetchingRef.current = true;
      setFetching(true);
      cocoSay("searching the crate…");
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: `play ${intent.query ?? "chill lofi beats mix"}`, adapter: "naive" }),
        });
        const data = (await res.json()) as { ok: boolean; events?: ChatEvent[] };
        const music = data.events?.find(
          (e): e is Extract<ChatEvent, { kind: "music" }> => "kind" in e && e.kind === "music"
        );
        if (music && music.action === "play" && music.tracks.length) {
          musicBus.emit({ action: "play", tracks: music.tracks, query: music.query, mood: music.mood, error: music.note });
          cocoSay(`▶ ${music.tracks[0].title} — ${music.tracks[0].channel}.`);
        } else if (music?.note === "no-key") {
          cocoSay("the record crate is locked — no YouTube key on this desk.");
        } else {
          cocoSay("nothing surfaced for that — try another name.");
        }
      } catch {
        cocoSay("the crate didn't answer — try again.");
      } finally {
        fetchingRef.current = false;
        setFetching(false);
      }
      return;
    }
    if (/\b(?:search|add|buy|cart|checkout|order|price|refund)\b/i.test(text)) {
      cocoSay("that's moco's desk — tell the black head.");
      return;
    }
    /* general chatter: coco's own voice via the cheap model — the same
       metered leash, a persona, never the money path */
    if (fetchingRef.current) {
      cocoSay("one beat — I'm thinking.");
      return;
    }
    fetchingRef.current = true;
    setFetching(true);
    try {
      const ctrl = new AbortController();
      const kill = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, adapter: "naive", persona: "coco" }),
        signal: ctrl.signal,
      });
      clearTimeout(kill);
      const data = (await res.json()) as { ok: boolean; events?: ChatEvent[] };
      const spoken =
        data.events?.filter(
          (e): e is Extract<ChatEvent, { role: "agent" | "user" }> =>
            "role" in e && e.role === "agent" && e.text.length > 0
        ) ?? [];
      const reply = spoken.length ? spoken[spoken.length - 1].text : "hmm — that one's beyond me.";
      cocoSay(reply);
    } catch {
      cocoSay("the desk is slow — ask me again.");
    } finally {
      fetchingRef.current = false;
      setFetching(false);
    }
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

  /* moco's own law, inherited: the panels drop downward while more sky
     lies below the head than above it, and rise when coco stands low —
     the head itself is always the anchor, so the drag clamp alone
     decides where coco can ever stand */
  const low = pos.y * 2 > window.innerHeight;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "fixed z-50 w-14 select-none transition-all duration-300 ease-out",
        tucked && "pointer-events-none translate-y-3 scale-90 opacity-0"
      )}
      style={{ left: pos.x, top: pos.y }}
      data-ghost=""
    >
      {/* the panels live in one absolute column anchored to the head —
          below it while there is sky, above it when coco stands low */}
      {(track || chatOpen) && (
        <div
          className={cn(
            "absolute right-0 z-0 flex items-end gap-2",
            low ? "bottom-[calc(100%+8px)] flex-col-reverse" : "top-[calc(100%+8px)] flex-col"
          )}
        >
      {track && (
        <div
          className={cn(
            "w-[236px] max-h-[340px] overflow-hidden rounded-[6px] border border-line-strong bg-card transition-all duration-300 ease-out",
            !(card || needsTap) && "pointer-events-none invisible max-h-0 border-transparent opacity-0"
          )}
          role="region"
          aria-label="coco is playing"
        >
          {/* the stage — the card stays mounted while a track lives, so
              the player (and the music) survive the background sink; the
              iframe dies only when the track does */}
          <div className="overflow-hidden border-b border-line">
            <div ref={mountRef} className="block h-[133px] w-full" />
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
            {warming && (
              <p className="mt-1.5 font-mono text-[9.5px] leading-relaxed text-inksoft">
                warming up the needle<span className="type-caret" aria-hidden>▍</span>
              </p>
            )}
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
                onClick={toggleLoop}
                aria-pressed={loop}
                aria-label={loop ? "loop is on — the track plays again and again" : "loop the track"}
                title="loop — play it again and again"
                className={cn(
                  "flex h-7 w-9 items-center justify-center rounded-[4px] border text-[11.5px] transition-colors",
                  loop ? "border-ink/50 bg-ink/[0.06] text-ink" : "border-line2 text-ink hover:border-ink/40"
                )}
              >
                ⟲
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
          header with the face and one dot, same quiet close, same well. */}
      {chatOpen && (
        <div
          className="animate-rise flex max-h-[400px] w-[280px] flex-col overflow-hidden rounded-[6px] border border-line-strong bg-card"
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
              void tellCoco(el.value);
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
                disabled={fetching}
                aria-label="send to coco"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] bg-ink text-paper transition-opacity hover:opacity-90 disabled:opacity-30"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M8 13V3M4 7l4-4 4 4" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
        </div>
      )}

      <button
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onDoubleClick={onDouble}
        aria-label="coco — the desk's red ghost — drag to move, click to chat, double-click to sink the video"
        title="coco — drag me, click to chat, double-click to sink the video"
        className={cn(
          "relative z-10 block shrink-0 cursor-grab touch-none active:cursor-grabbing",
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
  /* the sheen: the bot's aurora pattern scaled to the head — a static
     rect clipped to the circle, the paint drifting via SMIL. Nothing
     can escape the silhouette; reduced motion pauses the paint. */
  const uid = useId().replace(/:/g, "");
  const gradId = `coco-grad-${uid}`;
  const clipId = `coco-clip-${uid}`;
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => (mq.matches ? el.pauseAnimations() : el.unpauseAnimations());
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("ghost-stage", playing && "ghost-playing")}
    >
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="-6" y1="8" x2="38" y2="24">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.42" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="0.58" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            values="-20 0; 20 0; -20 0"
            keyTimes="0; 0.5; 1"
            dur="9s"
            calcMode="spline"
            keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
            repeatCount="indefinite"
          />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx="16" cy="16" r="13" />
        </clipPath>
      </defs>
      <circle cx="16" cy="16" r="13" className="ghost-body-fill" fill="var(--band)" />
      <rect x="0" y="3" width="32" height="26" clipPath={`url(#${clipId})`} fill={`url(#${gradId})`} opacity="0.5" />
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
