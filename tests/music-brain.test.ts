import { describe, expect, test } from "bun:test";
import { parseIntent } from "../src/lib/customs/agent/nlu";
import { parseMusicIntent, MOODS } from "../src/lib/customs/music/brain";

// D7 regression: the ghost's commands ride their own rules brain and must
// never reach the LLM path (zero tokens). Control verbs match as whole
// commands — a "pause" inside a shopping sentence stays shopping — and
// mood words resolve to fixed, curated search strings so the demo is
// replayable bit-for-bit.

describe("music brain: control verbs", () => {
  test.each([
    ["stop", "stop"],
    ["stop the music", "stop"],
    ["make it stop", "stop"],
    ["skip", "skip"],
    ["next song", "skip"],
    ["pause", "pause"],
    ["pause the music", "pause"],
    ["resume", "resume"],
    ["louder", "louder"],
    ["volume up", "louder"],
    ["quieter", "quieter"],
    ["turn it down", "quieter"],
  ])("maps %q to %q", (phrase, action) => {
    expect(parseMusicIntent(phrase)).toMatchObject({ action });
    expect(parseIntent(phrase)).toMatchObject({ kind: "music", action });
  });
});

describe("music brain: play + query extraction", () => {
  test("a named song keeps the listener's exact wish", () => {
    expect(parseMusicIntent("play africa by toto")).toMatchObject({
      action: "play",
      query: "africa by toto",
      mood: null,
    });
  });

  test("politeness and device tails are stripped", () => {
    const got = parseMusicIntent("put on Africa by Toto please");
    expect(got?.query?.toLowerCase()).toBe("africa by toto");
    expect(parseMusicIntent("play lofi beats on youtube")).toMatchObject({
      query: "lofi beats",
    });
  });

  test.each([
    ["play something chill", "chill"],
    ["play some coding music", "coding"],
    ["sing something for a workout", "workout"],
    ["chill", "chill"],
  ])("%q rides the mood map → %q", (phrase, mood) => {
    expect(parseMusicIntent(phrase)).toMatchObject({ action: "play", mood, query: MOODS[mood] });
  });

  test("bare invocations default to the chill mood", () => {
    expect(parseMusicIntent("music")).toMatchObject({ action: "play", mood: "chill" });
  });

  test("non-music text returns null", () => {
    expect(parseMusicIntent("what is the return policy")).toBeNull();
    expect(parseMusicIntent("add the ridge mouse")).toBeNull();
  });
});

describe("music brain: shopping sentences stay shopping", () => {
  test("a pause inside a sentence about waiting does not stop the song", () => {
    // "pause" as a whole command stops the music; a sentence about the
    // catalog must not even glance at the ghost
    expect(parseIntent("add the pause-proof keyboard")).toMatchObject({ kind: "add" });
  });

  test("buy verbs still reach the buyer brain", () => {
    expect(parseIntent("i want the bud-pro earbuds")).toMatchObject({ kind: "add" });
    expect(parseIntent("play the bud-pro earbuds")?.kind).toBe("music");
  });
});
