// Helpers for YouTube IDs, thumbnails, and durations.

const ID_REGEX = /(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/;

export function extractYouTubeId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const m = trimmed.match(ID_REGEX);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return "";
}

export function youtubeThumbnail(id: string, size: "mq" | "hq" | "sd" | "max" = "mq") {
  const map = { mq: "mqdefault", hq: "hqdefault", sd: "sddefault", max: "maxresdefault" } as const;
  return `https://i.ytimg.com/vi/${id}/${map[size]}.jpg`;
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Fetch video title via YouTube oEmbed (no API key required, works for unlisted/public).
export async function fetchYouTubeOEmbed(id: string): Promise<{ title: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
    );
    if (!res.ok) return null;
    const j = await res.json();
    return { title: j.title ?? "" };
  } catch {
    return null;
  }
}
