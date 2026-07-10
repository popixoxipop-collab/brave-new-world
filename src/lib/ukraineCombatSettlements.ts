import type { UkraineControlZone, UkraineSettlement } from "@/data/geoTypes";
import {
  getUkraineSettlementTier,
  isUkraineSettlementLabelVisible,
  UA_SETTLEMENT_MAX_VISIBLE_ALTITUDE,
} from "@/lib/ukraineSettlementLabels";
import { getLodEffectiveAltitude } from "@/lib/zoomScale";

type ViewState = { lat: number; lng: number; altitude: number };

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

function frontlineBufferDeg(altitude: number): number {
  const a = getLodEffectiveAltitude(altitude);
  if (a > UA_SETTLEMENT_MAX_VISIBLE_ALTITUDE) return 0.55;
  if (a > 0.1) return 0.32;
  return 0.2;
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
 * 전선 인접 거주지만 라벨 표시 (요충지·대도시 자동 전역 표시 없음).
 */
export function isCombatRelevantSettlement(
  settlement: UkraineSettlement,
  hostileCenters: { lat: number; lng: number }[],
  altitude: number,
): boolean {
  const tier = getUkraineSettlementTier(settlement.population);
  if (!isUkraineSettlementLabelVisible(tier, altitude)) return false;

  if (settlement.controlStatus === "CONTESTED") {
    return isNearHostileFront(settlement, hostileCenters, frontlineBufferDeg(altitude));
  }

  const bufferDeg = frontlineBufferDeg(altitude);
  return isNearHostileFront(settlement, hostileCenters, bufferDeg);
}

export function isStrategicUkraineSettlement(
  settlement: Pick<UkraineSettlement, "name" | "population">,
): boolean {
  const tier = getUkraineSettlementTier(settlement.population);
  return tier === "megacity" || tier === "city";
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
  const effectiveAlt = getLodEffectiveAltitude(altitude);
  const maxCount =
    effectiveAlt <= UA_SETTLEMENT_MAX_VISIBLE_ALTITUDE ? 28 : effectiveAlt <= 0.1 ? 16 : 8;

  const filtered = candidates.filter((settlement) => {
    if (!isCombatRelevantSettlement(settlement, hostileCenters, altitude)) return false;
    return pointDistanceDeg(settlement, view) <= bufferDeg + 0.35;
  });

  const tierRank = { megacity: 4, city: 3, town: 2, village: 1 } as const;

  return filtered
    .slice()
    .sort((a, b) => {
      const tierDiff =
        tierRank[getUkraineSettlementTier(b.population)] -
        tierRank[getUkraineSettlementTier(a.population)];
      if (tierDiff !== 0) return tierDiff;
      return pointDistanceDeg(a, view) - pointDistanceDeg(b, view);
    })
    .slice(0, maxCount);
}
