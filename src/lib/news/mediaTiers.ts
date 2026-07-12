import type { MediaTrustTier } from "@/lib/news/types";

/** Tier 1 — wire services & editorially independent major outlets */
const TIER1_SOURCE = [
  "reuters",
  "associated press",
  "ap news",
  "afp",
  "agence france",
  "dpa",
  "efe",
  "ansa",
  "pti",
  "yonhap",
  "ytn",
  "연합뉴스",
  "bbc",
  "washington post",
  "wsj",
  "wall street journal",
  "nyt",
  "new york times",
  "guardian",
  "bloomberg",
  "cnbc",
  "financial times",
  "kyiv independent",
  "kyiv post",
  "ukrinform",
  "the moscow times",
  "meduza",
  "centcom",
  "dod",
  "defense.gov",
];

/** Tier 2 — verified but bias controversies */
const TIER2_SOURCE = [
  "cnn",
  "al jazeera",
  "the hindu",
  "times of india",
  "anadolu",
  "fox news",
  "times of israel",
  "jerusalem post",
  "haaretz",
  "ynet",
  "n12",
  "mako",
  "walla",
  "the national",
  "drop site",
  "breaking def",
  "military times",
  "war on rocks",
  "long war",
  "ukrainska pravda",
  "nv",
  "google news",
  "cnbc",
  "financial times",
];

/** Tier 3 — state/party controlled — breaking signal only */
const TIER3_SOURCE = [
  "presstv",
  "irna",
  "fars news",
  "tasnim",
  "xinhua",
  "cctv",
  "people's daily",
  "tass",
  "rt",
  "rt.com",
  "kcna",
  "sputnik",
  "global times",
  "china daily",
];

const TIER1_HOST =
  /(?:^|\.)((?:reuters|apnews|afp|bbc|nytimes|wsj|theguardian|bloomberg|washingtonpost|kyivindependent|kyivpost|ukrinform|meduza|themoscowtimes|defense|ft)\.)/i;

const TIER3_HOST =
  /(?:^|\.)((?:presstv|irna|farsnews|tasnimnews|tass|rt\.com|kcna|xinhuanet|news\.cn|globaltimes|sputniknews)\.)/i;

function normalizeKey(value: string): string {
  return value.toLowerCase().trim();
}

function matchesAny(haystack: string, needles: string[]): boolean {
  const key = normalizeKey(haystack);
  return needles.some((needle) => key.includes(normalizeKey(needle)));
}

export function extractHostname(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function classifyMediaTier(source: string, link = ""): MediaTrustTier {
  const host = extractHostname(link);
  const blob = `${source} ${host} ${link}`;

  if (TIER3_HOST.test(host) || matchesAny(blob, TIER3_SOURCE)) return 3;
  if (TIER1_HOST.test(host) || matchesAny(blob, TIER1_SOURCE)) return 1;
  if (matchesAny(blob, TIER2_SOURCE)) return 2;

  // Unknown outlet from Google News aggregation → conservative Tier 2
  if (/google\.com/i.test(host) || /news\.google/i.test(source)) return 2;

  return 2;
}

export const TIER_LABELS: Record<MediaTrustTier, string> = {
  1: "Tier 1 · 확인 매체",
  2: "Tier 2 · 보완 매체",
  3: "Tier 3 · 당사자 입장",
};

export const ECONOMY_TIER_LABELS: Record<
  MediaTrustTier,
  { label: string; detail: string }
> = {
  1: { label: "공식·와이어", detail: "Reuters · WSJ · FT" },
  2: { label: "시장 매체", detail: "CNBC · Google News" },
  3: { label: "미확인 속보", detail: "참고용" },
};
