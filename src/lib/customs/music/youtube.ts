/**
 * youtube.ts — the ghost's record crate. Server-side only (the key never
 * reaches the browser): resolve a song name to the top embeddable YouTube
 * result via the official Data API v3. Search costs 100 quota units,
 * the duration lookup 1 more — the free daily tier covers hundreds of
 * summons. No key, no search: the desk says so calmly and the ghost
 * stays in the floor.
 */

export interface Track {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  durationSec: number;
}

export interface SearchResult {
  tracks: Track[];
  error: "no-key" | "quota" | "network" | "empty" | null;
}

const KEY = process.env.YOUTUBE_API_KEY ?? "";

export function musicKeyConfigured(): boolean {
  return KEY.length > 0;
}

/** ISO-8601 ("PT3M42S") → seconds; 0 when unparseable (card hides the clock) */
function durationSec(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export async function searchTracks(query: string, limit = 3): Promise<SearchResult> {
  if (!KEY) return { tracks: [], error: "no-key" };
  try {
    const search = await fetch(
      "https://www.googleapis.com/youtube/v3/search" +
        `?part=snippet&type=video&videoEmbeddable=true&maxResults=${limit}` +
        `&q=${encodeURIComponent(query)}&key=${KEY}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (search.status === 403 || search.status === 429) return { tracks: [], error: "quota" };
    if (!search.ok) return { tracks: [], error: "network" };
    const body = (await search.json()) as {
      items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string } } } }[];
    };
    const items = body.items ?? [];
    if (!items.length) return { tracks: [], error: "empty" };

    const base: Track[] = items.map((i) => ({
      videoId: i.id.videoId,
      title: i.snippet.title,
      channel: i.snippet.channelTitle,
      thumbnail: i.snippet.thumbnails.medium?.url ?? "",
      durationSec: 0,
    }));

    // one extra unit buys the durations for the now-playing card
    const ids = base.map((t) => t.videoId).join(",");
    const details = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${KEY}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (details.ok) {
      const db = (await details.json()) as {
        items?: { id: string; contentDetails: { duration: string } }[];
      };
      for (const d of db.items ?? []) {
        const t = base.find((x) => x.videoId === d.id);
        if (t) t.durationSec = durationSec(d.contentDetails.duration);
      }
    }
    return { tracks: base, error: null };
  } catch {
    return { tracks: [], error: "network" };
  }
}
