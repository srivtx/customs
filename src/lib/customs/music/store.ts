/**
 * store.ts — the ghost's wire. A tiny client-side bus: chat surfaces push
 * `music` ChatEvents in, the ghost subscribes and performs. No React
 * context, no provider — one module instance per browser, the same way
 * the desk's position persists. The desk agent calls the ghost over
 * this pipe; that handoff IS the agent-calls-agent moment.
 */
import type { MusicAction } from "./brain";
import type { Track } from "./youtube";

export type MusicCommand =
  | { action: "play"; tracks: Track[]; query: string | null; mood: string | null; error: string | null }
  | { action: Exclude<MusicAction, "play"> };

type Listener = (command: MusicCommand) => void;

const listeners = new Set<Listener>();

export const musicBus = {
  emit(command: MusicCommand): void {
    for (const fn of listeners) fn(command);
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/* dev-only handle: the local screenshot harness summons the ghost the
   same way chat does, without shipping a test hook in production */
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __musicBus?: typeof musicBus }).__musicBus = musicBus;
}
