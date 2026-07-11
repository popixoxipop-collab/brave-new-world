import type { UkraineSettlement } from "@/data/geoTypes";
import type { PlaceLabelTier } from "@/lib/placeLabelColors";
import { isStrategicUkraineSettlement } from "@/lib/ukraineCombatSettlements";

/** 우크라 전황 라벨용 규모 — 주요도시 / 중소도시 / 마을 */
export function getUkraineSettlementTier(
  population: number | null | undefined,
): PlaceLabelTier {
  const pop = population ?? 0;
  if (pop >= 1_500_000) return "megacity";
  if (pop >= 100_000) return "city";
  if (pop >= 10_000) return "town";
  return "village";
}

/**
 * 등급별 기본 글자 크기(°)
 * 주요도시 0.8 · 도시 0.4 · 중소도시 0.08 · 마을 0.05
 */
const UA_LABEL_BASE_DEG: Record<PlaceLabelTier, number> = {
  megacity: 0.8,
  city: 0.4,
  town: 0.08,
  village: 0.05,
};

const UA_DOT_BASE_DEG: Record<PlaceLabelTier, number> = {
  megacity: 0.1,
  city: 0.05,
  town: 0.012,
  village: 0.008,
};

/**
 * altitude ≥ 0.2: 고정 / altitude < 0.2부터 LOD 축소
 */
export function getUkraineSettlementScreenScale(altitude: number): number {
  const a = Number.isFinite(altitude) ? altitude : 0.2;
  if (a >= 0.2) return 1;

  if (a <= 0.04) return 0.16;
  if (a <= 0.08) return 0.16 + ((a - 0.04) / 0.04) * 0.2; // → 0.36
  if (a <= 0.12) return 0.36 + ((a - 0.08) / 0.04) * 0.28; // → 0.64
  // 0.12 → 0.2
  return 0.64 + ((a - 0.12) / 0.08) * 0.36;
}

/** 거주지 이름 텍스트 높이(°) */
export function getUkraineSettlementLabelSize(
  tier: PlaceLabelTier,
  altitude: number,
): number {
  return UA_LABEL_BASE_DEG[tier] * getUkraineSettlementScreenScale(altitude);
}

/** 위치 점 반경(°) */
export function getUkraineSettlementDotRadius(
  tier: PlaceLabelTier,
  altitude: number,
): number {
  return UA_DOT_BASE_DEG[tier] * getUkraineSettlementScreenScale(altitude);
}

export function getUkraineSettlementLabelAltitude(altitude: number): number {
  const a = Number.isFinite(altitude) ? altitude : 0.2;
  if (a <= 0.12) return 0.0026;
  if (a <= 0.2) return 0.003;
  return 0.0036;
}

/**
 * 요충지·대도시 = 노란 형광 / 일반 마을 = 하얀 빛
 * (RU·UA 통제색 구분 없음 — 영토는 폴리곤으로 표시)
 */
export function getUkraineSettlementLabelColor(
  settlement: Pick<UkraineSettlement, "name" | "population">,
  tier: PlaceLabelTier,
): string {
  const strategic = isStrategicUkraineSettlement(settlement) || tier === "megacity" || tier === "city";

  if (strategic) {
    switch (tier) {
      case "megacity":
        return "rgba(255, 214, 0, 0.98)";
      case "city":
        return "rgba(255, 235, 59, 0.96)";
      case "town":
        return "rgba(255, 241, 118, 0.94)";
      case "village":
        return "rgba(255, 249, 168, 0.92)";
    }
  }

  switch (tier) {
    case "town":
      return "rgba(248, 250, 252, 0.9)";
    case "village":
      return "rgba(255, 255, 255, 0.82)";
    default:
      return "rgba(255, 255, 255, 0.88)";
  }
}

export function ukraineControlStatusLabel(
  status: UkraineSettlement["controlStatus"],
): string {
  if (status === "RU") return "러시아 주장";
  if (status === "CONTESTED") return "경합";
  return "우크라이나 주장";
}

export function isInUkraineTheater(lat: number, lng: number): boolean {
  return lat >= 43.5 && lat <= 53.5 && lng >= 21.5 && lng <= 41.5;
}
