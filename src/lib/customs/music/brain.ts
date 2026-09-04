/**
 * brain.ts — the music brain. Deterministic, zero-dependency, zero tokens:
 * every ghost command is caught here by rules, the same discipline the
 * buyer agent's rules brain follows (ENGINEERING_LOG D2). A mood word
 * maps to a fixed search string so "play something chill" is replayable
 * bit-for-bit — the LLM never enters this path.
 *
 * Anchoring law (the pause-proof-keyboard test): control verbs match as
 * whole commands only — a "pause" inside a shopping sentence stays
 * shopping. Play leads the sentence (after a polite lead-in) or the text
 * is a bare invocation; anything else belongs to the buyer brain.
 */

export type MusicAction =
  | "play"
  | "skip"
  | "pause"
  | "resume"
  | "stop"
  | "louder"
  | "quieter";

export interface MusicIntent {
  action: MusicAction;
  /** the resolved search query — null means "a mood picked one" or a control */
  query: string | null;
  /** which mood word fired, when it did */
  mood: string | null;
}

/** mood word → fixed YouTube search string (deterministic, curated once) */
export const MOODS: Record<string, string> = {
  chill: "chill lofi beats mix",
  coding: "coding focus lofi mix",
  focus: "deep focus ambient music",
  party: "party pop hits mix",
  sad: "sad acoustic songs playlist",
  happy: "feel good happy hits",
  sleep: "sleep ambient music",
  workout: "workout energy mix",
};

/* control verbs — anchored to the whole command, tails allowed. A bare
   word inside a sentence ("add the pause-proof keyboard") never fires. */
const STOP_RE =
  /^(?:stop|enough|silence|that's enough|thats enough|make it stop|shut it (?:down|off)|kill (?:the )?(?:music|song|sound|ghost))(?:\s+(?:the\s+)?(?:music|song|it|please|now))?[.!]*$/i;
const SKIP_RE = /^(?:skip(?:\s+this)?|next(?:\s+(?:song|one|track|please))?(?:\s+please)?|another one)[.!]*$/i;
const PAUSE_RE = /^(?:pause|hold on|hold up|freeze|hold the music)(?:\s+(?:the\s+)?(?:music|song|it|please))?[.!]*$/i;
const RESUME_RE = /^(?:resume|unpause|carry on|go on|keep going|back on)(?:\s+please)?[.!]*$/i;
const LOUDER_RE = /^(?:louder|volume up|turn it up|crank it(?: up)?|too quiet)(?:\s+please)?[.!]*$/i;
const QUIETER_RE = /^(?:quieter|softer|volume down|turn it down|too loud|shh)(?:\s+please)?[.!]*$/i;

/* play leads the sentence — polite lead-ins allowed, nothing else */
const PLAY_RE =
  /^(?:(?:hey|hi|ok|okay)\s+(?:desk|ghost|customs)[,.]?\s*)?(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?(?:play|put on|sing|perform|dj(?:\s+for\s+me)?)\b\s*(.*)$|^start (?:the )?music\b\s*(.*)$|^some music please[.!]*$/i;

/* bare invocations: a mood word alone, or music with nothing else */
const BARE_MOOD = new RegExp(`^(?:${Object.keys(MOODS).join("|")})[.!]*$`, "i");
const BARE_MUSIC = /^(?:music|a song|song|any song|something|anything|the ghost)[.!]*$/i;

/* filler inside a play request: strip it, and if a mood word is all that
   remains, the mood map picks the query ("play some coding music" → coding) */
const FILLER = /\b(?:something|some|any|for|a|the|me|us|music|song|songs|tune|tunes|please)\b/gi;

/* device tails and politeness ride along but are not the wish */
const TRAIL_RE = /\s+(?:on (?:the )?(?:speakers?|youtube|page|here|loop|repeat)|from youtube|please|now|for me)\.?$/i;

const moodOf = (q: string): string | null =>
  Object.keys(MOODS).find((m) => new RegExp(`\\b${m}\\b`, "i").test(q)) ?? null;

export function parseMusicIntent(raw: string): MusicIntent | null {
  const text = raw.trim();
  if (!text) return null;

  if (STOP_RE.test(text)) return { action: "stop", query: null, mood: null };
  if (SKIP_RE.test(text)) return { action: "skip", query: null, mood: null };
  if (PAUSE_RE.test(text)) return { action: "pause", query: null, mood: null };
  if (RESUME_RE.test(text)) return { action: "resume", query: null, mood: null };
  if (LOUDER_RE.test(text)) return { action: "louder", query: null, mood: null };
  if (QUIETER_RE.test(text)) return { action: "quieter", query: null, mood: null };

  if (BARE_MOOD.test(text)) {
    const mood = moodOf(text);
    return { action: "play", query: mood ? MOODS[mood] : MOODS.chill, mood };
  }
  if (BARE_MUSIC.test(text)) return { action: "play", query: MOODS.chill, mood: "chill" };

  const m = text.match(PLAY_RE);
  if (!m) return null;

  // whichever alternative matched carries the remainder in its last group
  let rest = (m.slice(1).findLast((g) => g !== undefined) ?? "").trim();
  rest = rest.replace(TRAIL_RE, "").trim();
  rest = rest.replace(/[.!]+$/, "").trim();
  if (!rest) return { action: "play", query: MOODS.chill, mood: "chill" };

  const stripped = rest.replace(FILLER, " ").replace(/\s+/g, " ").trim();
  const mood = moodOf(stripped);
  if (mood && stripped.toLowerCase() === mood)
    return { action: "play", query: MOODS[mood], mood };

  return { action: "play", query: rest, mood: null };
}
