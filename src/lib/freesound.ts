import { getCached, setCached } from "@/lib/apiCache";
import { AUDIO_MANIFEST, type AudioEventId } from "@/data/audioManifest";

const FREESOUND_SEARCH = "https://freesound.org/apiv2/search/text/";
const SEARCH_TTL_MS = 6 * 60 * 60 * 1000; // 6h — query→preview 매핑 캐시

export type FreesoundPreview = {
  soundId: number;
  name: string;
  username: string;
  previewUrl: string;
  duration: number;
  license: string;
};

type FreesoundSearchHit = {
  id: number;
  name: string;
  username?: string;
  duration?: number;
  license?: string;
  previews?: {
    "preview-hq-mp3"?: string;
    "preview-lq-mp3"?: string;
  };
};

type FreesoundSearchResponse = {
  count: number;
  results: FreesoundSearchHit[];
};

export function getFreesoundApiKey(): string | null {
  const key = process.env.FREESOUND_API_KEY?.trim();
  return key || null;
}

export function isAudioEventId(value: string): value is AudioEventId {
  return value in AUDIO_MANIFEST;
}

function pickBestHit(results: FreesoundSearchHit[]): FreesoundSearchHit | null {
  for (const hit of results) {
    const preview =
      hit.previews?.["preview-hq-mp3"] || hit.previews?.["preview-lq-mp3"];
    if (preview) return hit;
  }
  return null;
}

/** 검색 실패 시 단어 수를 줄여 재시도 */
function queryFallbacks(query: string): string[] {
  const trimmed = query.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ");
  const out: string[] = [trimmed];
  if (parts.length >= 3) out.push(parts.slice(0, 2).join(" "));
  if (parts.length >= 2) out.push(parts[0]!);
  return [...new Set(out.filter(Boolean))];
}

async function searchFreesoundOnce(
  apiKey: string,
  query: string,
  withDurationFilter: boolean,
): Promise<FreesoundSearchHit[]> {
  const url = new URL(FREESOUND_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("fields", "id,name,username,duration,license,previews");
  url.searchParams.set("page_size", "12");
  if (withDurationFilter) {
    url.searchParams.set("filter", "duration:[0.15 TO 45]");
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Token ${apiKey}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Freesound search failed: HTTP ${res.status} ${body.slice(0, 120)}`);
  }

  const json = (await res.json()) as FreesoundSearchResponse;
  return json.results ?? [];
}

/** Freesound 텍스트 검색 → HQ mp3 프리뷰 URL (서버 전용) */
export async function resolveFreesoundPreview(query: string): Promise<FreesoundPreview> {
  const cacheKey = `freesound-preview:${query.toLowerCase().trim()}`;
  const cached = getCached<FreesoundPreview>(cacheKey);
  if (cached) return cached;

  const apiKey = getFreesoundApiKey();
  if (!apiKey) {
    throw new Error("FREESOUND_API_KEY is not configured");
  }

  let hit: FreesoundSearchHit | null = null;
  let usedQuery = query;

  for (const candidate of queryFallbacks(query)) {
    usedQuery = candidate;
    hit = pickBestHit(await searchFreesoundOnce(apiKey, candidate, true));
    if (hit) break;
    hit = pickBestHit(await searchFreesoundOnce(apiKey, candidate, false));
    if (hit) break;
  }

  if (!hit) {
    throw new Error(`No Freesound preview for query: ${query}`);
  }

  const previewUrl =
    hit.previews?.["preview-hq-mp3"] || hit.previews?.["preview-lq-mp3"];
  if (!previewUrl) {
    throw new Error(`Freesound hit ${hit.id} missing preview URL`);
  }

  const preview: FreesoundPreview = {
    soundId: hit.id,
    name: hit.name,
    username: hit.username || "unknown",
    previewUrl,
    duration: hit.duration ?? 0,
    license: hit.license || "unknown",
  };

  setCached(cacheKey, preview, SEARCH_TTL_MS);
  setCached(`freesound-preview:${usedQuery.toLowerCase()}`, preview, SEARCH_TTL_MS);
  return preview;
}

export async function resolvePreviewForEvent(eventId: AudioEventId): Promise<{
  def: (typeof AUDIO_MANIFEST)[AudioEventId];
  preview: FreesoundPreview;
}> {
  const def = AUDIO_MANIFEST[eventId];
  const preview = await resolveFreesoundPreview(def.freesoundQuery);
  return { def, preview };
}
