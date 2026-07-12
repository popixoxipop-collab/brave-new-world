/** 활성 교전 전장 — 콜아웃·전장 사운드 공용 */

export type CombatTheaterId =
  | "russia-ukraine"
  | "middle-east"
  | "china-taiwan"
  | "korea";

type TheaterBox = {
  id: CombatTheaterId;
  south: number;
  north: number;
  west: number;
  east: number;
};

const THEATER_BOXES: TheaterBox[] = [
  { id: "russia-ukraine", south: 43.5, north: 53.5, west: 21.5, east: 41.5 },
  { id: "middle-east", south: 12, north: 42, west: 32, east: 63 },
  { id: "china-taiwan", south: 20, north: 27, west: 116, east: 124 },
  { id: "korea", south: 33, north: 43, west: 124, east: 132 },
];

export function isInCombatTheater(
  theater: CombatTheaterId,
  lat: number,
  lng: number,
): boolean {
  const box = THEATER_BOXES.find((b) => b.id === theater);
  if (!box) return false;
  return lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east;
}

/** 카메라 중심이 속한 교전 전장 (우선순위: 우크라 > 중동 > 대만 > 한반도) */
export function resolveCombatTheaterAt(
  lat: number,
  lng: number,
): CombatTheaterId | null {
  for (const box of THEATER_BOXES) {
    if (lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east) {
      return box.id;
    }
  }
  return null;
}

export function combatTheaterLabel(theater: CombatTheaterId, lang: "ko" | "en" = "ko"): string {
  const labels: Record<CombatTheaterId, { ko: string; en: string }> = {
    "russia-ukraine": { ko: "우크라이나 전선", en: "Ukraine front" },
    "middle-east": { ko: "중동·이란 전선", en: "Middle East / Iran front" },
    "china-taiwan": { ko: "대만 해협", en: "Taiwan Strait" },
    korea: { ko: "한반도", en: "Korean Peninsula" },
  };
  return labels[theater][lang];
}
