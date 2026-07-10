import type { UkraineControlZone, UkraineSettlement } from "@/data/geoTypes";
import { getUkraineSettlementTier } from "@/lib/ukraineSettlementLabels";
import { getLodEffectiveAltitude } from "@/lib/zoomScale";

type ViewState = { lat: number; lng: number; altitude: number };

/** VIINA·ISW 기준 주요 요충지 (크기 무관 노란색 표시) */
const STRATEGIC_NAME_PATTERNS: RegExp[] = [
  /\bbakhmut\b/i,
  /\bavdiivka\b/i,
  /\bmarinka\b/i,
  /\bkherson\b/i,
  /\bmariupol\b/i,
  /\bmelitopol\b/i,
  /\btokmak\b/i,
  /\bverbove\b/i,
  /\bnovoprokopivka\b/i,
  /\brobotyne\b/i,
  /\bkupyansk\b/i,
  /\bsvatove\b/i,
  /\bkreminna\b/i,
  /\blysychansk\b/i,
  /\bseverodonetsk\b/i,
  /\bchernihiv\b/i,
  /\bsumy\b/i,
  /\bkharkiv\b/i,
  /\bzaporizhzhia\b/i,
  /\bodesa\b/i,
  /\bmykolaiv\b/i,
  /\bdnipro\b/i,
  /\bkyiv\b/i,
  /\bchernivtsi\b/i,
  /\bizium\b/i,
  /\bvuhledar\b/i,
  /\bugledar\b/i,
  /\bpokrovsk\b/i,
  /\btoretsk\b/i,
  /\bchasyv/i,
  /\bchervonopartyzansk\b/i,
  /\bstaromlynivka\b/i,
  /\bnovoazovsk\b/i,
  /\bvolnovakha\b/i,
  /\bberdyansk\b/i,
  /\benerhodar\b/i,
  /\boleksandrivka\b/i,
];

function longitudeDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function pointDistanceDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const latDist = Math.abs(a.lat - b.lat);
  const lngDist = longitudeDistance(a.lng, b.lng);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

export function isStrategicUkraineSettlement(
  settlement: Pick<UkraineSettlement, "name" | "population">,
): boolean {
  const tier = getUkraineSettlementTier(settlement.population);
  if (tier === "megacity" || tier === "city") return true;
  const name = settlement.name || "";
  return STRATEGIC_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

function frontlineBufferDeg(altitude: number): number {
  const a = getLodEffectiveAltitude(altitude);
  if (a >= 0.2) return 2.4;
  if (a > 0.1) return 1.1;
  return 0.42;
}

function buildHostileCenters(
  settlements: UkraineSettlement[],
  zones: UkraineControlZone[],
): { lat: number; lng: number }[] {
  const centers: { lat: number; lng: number }[] = [];
  for (const zone of zones) {
    if (zone.controlStatus === "RU" || zone.controlStatus === "CONTESTED") {
      centers.push(zone.center);
    }
  }
  for (const settlement of settlements) {
    if (settlement.controlStatus === "RU" || settlement.controlStatus === "CONTESTED") {
      centers.push({ lat: settlement.lat, lng: settlement.lng });
    }
  }
  return centers;
}

function isNearHostileFront(
  settlement: UkraineSettlement,
  hostileCenters: { lat: number; lng: number }[],
  bufferDeg: number,
): boolean {
  if (hostileCenters.length === 0) return false;
  const point = { lat: settlement.lat, lng: settlement.lng };
  return hostileCenters.some((center) => pointDistanceDeg(point, center) <= bufferDeg);
}

/**
 * 전투 주변·경합·점령지·요충지만 라벨 표시.
 * (전체 3만 마을 이름 표시 금지)
 */
export function isCombatRelevantSettlement(
  settlement: UkraineSettlement,
  hostileCenters: { lat: number; lng: number }[],
  altitude: number,
): boolean {
  if (isStrategicUkraineSettlement(settlement)) return true;
  if (settlement.controlStatus === "CONTESTED") return true;
  if (settlement.controlStatus === "RU") return true;

  const bufferDeg = frontlineBufferDeg(altitude);
  if (isNearHostileFront(settlement, hostileCenters, bufferDeg)) return true;

  // UA 전방 마을: RU/경합 인접
  if (settlement.controlStatus === "UA") {
    return isNearHostileFront(settlement, hostileCenters, bufferDeg * 0.85);
  }

  return false;
}

export function zoneToSettlementLabel(zone: UkraineControlZone): UkraineSettlement {
  return {
    geonameId: zone.geonameId || zone.id,
    name: zone.name,
    nameLong: zone.nameLong,
    lat: zone.center.lat,
    lng: zone.center.lng,
    adm1: zone.adm1 ?? null,
    adm2: zone.adm2 ?? null,
    population: zone.population ?? null,
    controlStatus: zone.controlStatus,
  };
}

export function buildCombatSettlementCandidates(
  settlements: UkraineSettlement[],
  zones: UkraineControlZone[],
): UkraineSettlement[] {
  if (settlements.length > 0) return settlements;

  // lite(거주지 미포함): RU·경합 폴리곤 중심을 전선 라벨 후보로 사용
  return zones
    .filter((zone) => zone.controlStatus === "RU" || zone.controlStatus === "CONTESTED")
    .map(zoneToSettlementLabel);
}

export function filterCombatSettlementsForView(
  settlements: UkraineSettlement[],
  zones: UkraineControlZone[],
  view: ViewState,
  altitude: number,
): UkraineSettlement[] {
  const candidates = buildCombatSettlementCandidates(settlements, zones);
  const hostileCenters = buildHostileCenters(settlements, zones);
  const bufferDeg = frontlineBufferDeg(altitude);
  const maxCount =
    getLodEffectiveAltitude(altitude) >= 0.2 ? 36 : getLodEffectiveAltitude(altitude) > 0.1 ? 120 : 420;

  const filtered = candidates.filter((settlement) => {
    if (!isCombatRelevantSettlement(settlement, hostileCenters, altitude)) return false;
    return pointDistanceDeg(settlement, view) <= bufferDeg + 0.8;
  });

  const tierRank = { megacity: 4, city: 3, town: 2, village: 1 } as const;

  return filtered
    .slice()
    .sort((a, b) => {
      const aStrategic = isStrategicUkraineSettlement(a) ? 1 : 0;
      const bStrategic = isStrategicUkraineSettlement(b) ? 1 : 0;
      if (bStrategic !== aStrategic) return bStrategic - aStrategic;
      const tierDiff =
        tierRank[getUkraineSettlementTier(b.population)] -
        tierRank[getUkraineSettlementTier(a.population)];
      if (tierDiff !== 0) return tierDiff;
      return pointDistanceDeg(a, view) - pointDistanceDeg(b, view);
    })
    .slice(0, maxCount);
}
