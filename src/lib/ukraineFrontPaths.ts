import type { TransportPath, TransportPathPoint, UkraineControlZone } from "@/data/geoTypes";
import type { RegionBBox } from "@/data/navRegions";
import type { GlobeLodTier } from "@/lib/globeLod";
import { geometryToAccentOutlineAndHatch, type DisputeHatchStyle } from "@/lib/disputeHatch";

type Point = { lat: number; lng: number };

function pointDistanceDeg(a: Point, b: Point) {
  const latDist = Math.abs(a.lat - b.lat);
  const lngDiff = Math.abs(a.lng - b.lng);
  const lngDist = Math.min(lngDiff, 360 - lngDiff);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

function filterFrontZones(zones: UkraineControlZone[], view: Point, maxCount: number) {
  return zones
    .slice()
    .sort((a, b) => pointDistanceDeg(a.center, view) - pointDistanceDeg(b.center, view))
    .slice(0, maxCount);
}

function findNearestZone(
  origin: Point,
  zones: UkraineControlZone[],
): UkraineControlZone | null {
  let best: UkraineControlZone | null = null;
  let bestDist = Infinity;
  for (const zone of zones) {
    const dist = pointDistanceDeg(origin, zone.center);
    if (dist < bestDist) {
      bestDist = dist;
      best = zone;
    }
  }
  return best;
}

/** RU 점령 — 얇은 실선 테두리 + 빗금 */
const RU_OCCUPIED = {
  outlineKind: "ukraine-ru-occupied" as const,
  hatchKind: "ukraine-ru-occupied-hatch" as const,
  outlineColor: "rgba(185, 28, 28, 0.72)",
  hatchColor: "rgba(220, 38, 38, 0.42)",
  pattern: "slash" as const,
};

/** UA 점령 — 얇은 실선 테두리 + 빗금 */
const UA_OCCUPIED = {
  outlineKind: "ukraine-ua-occupied" as const,
  hatchKind: "ukraine-ua-occupied-hatch" as const,
  outlineColor: "rgba(56, 189, 248, 0.7)",
  hatchColor: "rgba(56, 189, 248, 0.38)",
  pattern: "backslash" as const,
};

/** RU 진격·주장 — 주황 점선 테두리 + 빗금 */
const RU_CLAIM = {
  outlineKind: "ukraine-ru-claim" as const,
  hatchKind: "ukraine-ru-claim-hatch" as const,
  outlineColor: "rgba(251, 146, 60, 0.88)",
  hatchColor: "rgba(251, 146, 60, 0.48)",
  pattern: "slash" as const,
};

/** UA 주장 — 하늘색 점선 테두리 + 빗금 */
const UA_CLAIM = {
  outlineKind: "ukraine-ua-claim" as const,
  hatchKind: "ukraine-ua-claim-hatch" as const,
  outlineColor: "rgba(56, 189, 248, 0.9)",
  hatchColor: "rgba(125, 211, 252, 0.45)",
  pattern: "horizontal" as const,
};

type ZoneHatchStyle = {
  outlineKind: TransportPath["kind"];
  hatchKind: TransportPath["kind"];
  outlineColor: string;
  hatchColor: string;
  pattern: DisputeHatchStyle;
};

function zonesToHatchPaths(
  zones: UkraineControlZone[],
  style: ZoneHatchStyle,
  preferDetail: boolean,
): TransportPath[] {
  const out: TransportPath[] = [];
  for (const zone of zones) {
    if (!zone.geometry) continue;
    out.push(
      ...geometryToAccentOutlineAndHatch(zone.id, zone.name ?? null, zone.geometry, {
        ...style,
        preferDetailSegments: preferDetail,
      }),
    );
  }
  return out;
}

export type UkraineFrontRender = {
  paths: TransportPath[];
};

/**
 * 점령 = 얇은 실선 테두리+빗금.
 * 진격/주장(경합) = 주황(RU)·하늘색(UA) 점선 테두리+빗금.
 * 전선(접촉선) · 진격 화살선은 생성하지 않음.
 */
export function buildUkraineFrontRender(
  ruZones: UkraineControlZone[],
  uaZones: UkraineControlZone[],
  contestedZones: UkraineControlZone[],
  view: Point,
  options: { maxZones?: number; maxArrows?: number; lodTier?: GlobeLodTier } = {},
): UkraineFrontRender {
  const maxZones = options.maxZones ?? 2400;
  const lodTier = options.lodTier ?? "regional";
  const preferDetail =
    lodTier === "regional" || lodTier === "near" || lodTier === "village";

  const occRu = filterFrontZones(ruZones, view, Math.floor(maxZones * 0.4));
  const occUa = filterFrontZones(
    uaZones.filter((z) => z.center.lng >= 30.5 && z.center.lat <= 50.8),
    view,
    Math.floor(maxZones * 0.35),
  );
  const contested = filterFrontZones(contestedZones, view, Math.floor(maxZones * 0.25));

  const ruClaimZones: UkraineControlZone[] = [];
  const uaClaimZones: UkraineControlZone[] = [];
  for (const zone of contested) {
    const nearestRu = findNearestZone(zone.center, ruZones);
    const nearestUa = findNearestZone(zone.center, uaZones);
    const dRu = nearestRu ? pointDistanceDeg(zone.center, nearestRu.center) : Infinity;
    const dUa = nearestUa ? pointDistanceDeg(zone.center, nearestUa.center) : Infinity;
    if (dUa <= dRu) uaClaimZones.push(zone);
    else ruClaimZones.push(zone);
  }

  const paths: TransportPath[] = [
    ...zonesToHatchPaths(occRu, RU_OCCUPIED, preferDetail),
    ...zonesToHatchPaths(occUa, UA_OCCUPIED, preferDetail),
    ...zonesToHatchPaths(ruClaimZones, RU_CLAIM, preferDetail),
    ...zonesToHatchPaths(uaClaimZones, UA_CLAIM, preferDetail),
  ];

  return { paths };
}

/** @deprecated buildUkraineFrontRender 사용 */
export function buildUkraineCleanFrontLines(
  ruZones: UkraineControlZone[],
  uaZones: UkraineControlZone[],
  contestedZones: UkraineControlZone[],
  view: Point,
  options: { maxZones?: number; maxArrows?: number } = {},
): TransportPath[] {
  return buildUkraineFrontRender(ruZones, uaZones, contestedZones, view, options).paths;
}

const DEFAULT_FRONT_BBOX: RegionBBox = {
  minLat: 45.8,
  maxLat: 51.0,
  minLng: 30.2,
  maxLng: 39.8,
};

export function computeUkraineFrontFitBbox(
  zones: UkraineControlZone[],
  extraPoints: { lat: number; lng: number }[] = [],
): RegionBBox {
  const points: { lat: number; lng: number }[] = [...extraPoints];

  for (const zone of zones) {
    if (zone.controlStatus === "CONTESTED") {
      points.push(zone.center);
      continue;
    }
    if (zone.controlStatus === "RU") {
      points.push(zone.center);
      continue;
    }
    if (zone.center.lng >= 30.5 && zone.center.lat <= 50.5) {
      points.push(zone.center);
    }
  }

  if (points.length < 4) return DEFAULT_FRONT_BBOX;

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const raw: RegionBBox = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };

  const latPad = Math.max(0.45, (raw.maxLat - raw.minLat) * 0.12);
  const lngPad = Math.max(0.55, (raw.maxLng - raw.minLng) * 0.1);

  return {
    minLat: Math.max(44.5, raw.minLat - latPad),
    maxLat: Math.min(52.5, raw.maxLat + latPad),
    minLng: Math.max(28.5, raw.minLng - lngPad),
    maxLng: Math.min(41.0, raw.maxLng + lngPad),
  };
}
