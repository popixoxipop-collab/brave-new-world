import type { NewsTheater } from "@/lib/news/types";
import type { TelegramAlertRegion } from "@/lib/telegramAlerts";

export type IntelTheaterFilter = NewsTheater | "all";

export type MapFlyTarget =
  | { kind: "coords"; lat: number; lng: number; altitude?: number }
  | { kind: "theater"; theater: NewsTheater };

/** 시트 상단 전장 칩 순서 */
export const THEATER_CHIP_ORDER: NewsTheater[] = [
  "middle-east",
  "russia-ukraine",
  "china-taiwan",
  "korea",
  "global",
];

export const THEATER_CHIP_LABELS: Record<NewsTheater, string> = {
  "middle-east": "중동",
  "russia-ukraine": "러·우",
  "china-taiwan": "중·대",
  korea: "한반도",
  japan: "일본",
  "south-asia": "남아시아",
  global: "글로벌",
};

export const THEATER_FLY_TO: Record<NewsTheater, { lat: number; lng: number; altitude: number }> = {
  "middle-east": { lat: 29.2, lng: 42.5, altitude: 2.05 },
  "russia-ukraine": { lat: 48.5, lng: 34, altitude: 1.72 },
  "china-taiwan": { lat: 20, lng: 118, altitude: 1.7 },
  korea: { lat: 37.5, lng: 127, altitude: 1.68 },
  japan: { lat: 36, lng: 138, altitude: 1.7 },
  "south-asia": { lat: 22, lng: 78, altitude: 1.75 },
  global: { lat: 25, lng: 20, altitude: 2.2 },
};

export function newsTheaterFromCoords(lat: number, lng: number): NewsTheater {
  if (lat >= 12 && lat <= 42 && lng >= 34 && lng <= 63) return "middle-east";
  if (lat >= 44 && lat <= 62 && lng >= 22 && lng <= 45) return "russia-ukraine";
  if (lat >= 33 && lat <= 43 && lng >= 124 && lng <= 132) return "korea";
  if (lat >= 22 && lat <= 26 && lng >= 118 && lng <= 123) return "china-taiwan";
  if (lat >= 30 && lat <= 46 && lng >= 129 && lng <= 146) return "japan";
  if (lat >= 5 && lat <= 35 && lng >= 60 && lng <= 95) return "south-asia";
  if (lat >= 18 && lat <= 45 && lng >= 100 && lng <= 130) return "china-taiwan";
  return "global";
}

export function newsTheaterFromNavId(id: string): IntelTheaterFilter {
  const key = id.toLowerCase();
  if (key.includes("ukraine") || key.includes("west-russia")) return "russia-ukraine";
  if (
    key.includes("middle-east") ||
    key.includes("gulf") ||
    key.includes("israel") ||
    key.includes("iran") ||
    key.includes("yemen") ||
    key.includes("red-sea")
  ) {
    return "middle-east";
  }
  if (key.includes("taiwan") || key.includes("china") || key.includes("south-china")) {
    return "china-taiwan";
  }
  if (key.includes("korea") || key.includes("dmz")) return "korea";
  if (key.includes("japan")) return "japan";
  if (key.includes("india") || key.includes("pakistan") || key.includes("south-asia")) {
    return "south-asia";
  }
  return "all";
}

export function telegramRegionToTheater(region: TelegramAlertRegion): NewsTheater {
  if (region === "ukraine") return "russia-ukraine";
  if (region === "middle-east") return "middle-east";
  return "global";
}

export function matchesTheaterFilter(
  theater: NewsTheater,
  filter: IntelTheaterFilter,
): boolean {
  return filter === "all" || theater === filter;
}

export function flyTargetForTheater(theater: NewsTheater): MapFlyTarget {
  const center = THEATER_FLY_TO[theater];
  return { kind: "coords", lat: center.lat, lng: center.lng, altitude: center.altitude };
}
