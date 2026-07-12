import type { TransportPath, TransportPathPoint, UkraineControlZone } from "@/data/geoTypes";
import type { RegionBBox } from "@/data/navRegions";
import type { GlobeLodTier } from "@/lib/globeLod";

type ControlStatus = UkraineControlZone["controlStatus"];
type FrontEdgeKind = "ukraine-ru-front" | "ukraine-ua-front" | "ukraine-contested-front";
type ClaimKind = "ukraine-ru-claim" | "ukraine-ua-claim";

type Point = { lat: number; lng: number };
type FrontEdge = { p1: Point; p2: Point; kind: FrontEdgeKind };

/** 전투지역 반경 5km ≈ 위도 48° 기준 */
const COMBAT_ZONE_RADIUS_DEG = 5 / 111;

const ALL_FRONT_KINDS = new Set<FrontEdgeKind>([
  "ukraine-ru-front",
  "ukraine-contested-front",
  "ukraine-ua-front",
]);

function groundPoint(point: Point): TransportPathPoint {
  return { lat: point.lat, lng: point.lng, alt: 0 };
}

function longitudeDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function pointDistanceDeg(a: Point, b: Point) {
  const latDist = Math.abs(a.lat - b.lat);
  const lngDist = longitudeDistance(a.lng, b.lng);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

function roundCoord(value: number) {
  return Math.round(value * 10000) / 10000;
}

function edgeKey(p1: Point, p2: Point) {
  const a = `${roundCoord(p1.lng)},${roundCoord(p1.lat)}`;
  const b = `${roundCoord(p2.lng)},${roundCoord(p2.lat)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function classifyEdgeKind(a: ControlStatus, b: ControlStatus): FrontEdgeKind | null {
  const pair = new Set([a, b]);
  if (pair.has("RU") && pair.has("UA")) return "ukraine-contested-front";
  if (pair.has("RU") && pair.has("CONTESTED")) return "ukraine-ru-front";
  if (pair.has("UA") && pair.has("CONTESTED")) return "ukraine-ua-front";
  return null;
}

function ringToPoints(ring: number[][]): Point[] {
  return ring
    .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

function collectZoneEdges(zone: UkraineControlZone): Array<{ key: string; p1: Point; p2: Point }> {
  const geometry = zone.geometry;
  const rings: number[][][] = [];

  if (geometry.type === "Polygon") {
    const outer = geometry.coordinates?.[0];
    if (Array.isArray(outer) && outer.length >= 2) rings.push(outer);
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates || []) {
      const outer = polygon?.[0];
      if (Array.isArray(outer) && outer.length >= 2) rings.push(outer);
    }
  }

  const edges: Array<{ key: string; p1: Point; p2: Point }> = [];
  for (const ring of rings) {
    const points = ringToPoints(ring);
    for (let i = 0; i < points.length - 1; i += 1) {
      const p1 = points[i];
      const p2 = points[i + 1];
      edges.push({ key: edgeKey(p1, p2), p1, p2 });
    }
  }
  return edges;
}

function extractFrontEdges(zones: UkraineControlZone[]): FrontEdge[] {
  const edgeStatuses = new Map<string, { statuses: Set<ControlStatus>; p1: Point; p2: Point }>();

  for (const zone of zones) {
    for (const edge of collectZoneEdges(zone)) {
      const existing = edgeStatuses.get(edge.key);
      if (existing) {
        existing.statuses.add(zone.controlStatus);
      } else {
        edgeStatuses.set(edge.key, {
          statuses: new Set([zone.controlStatus]),
          p1: edge.p1,
          p2: edge.p2,
        });
      }
    }
  }

  const frontEdges: FrontEdge[] = [];
  for (const entry of edgeStatuses.values()) {
    if (entry.statuses.size !== 2) continue;
    const [a, b] = [...entry.statuses];
    const kind = classifyEdgeKind(a, b);
    if (!kind) continue;
    frontEdges.push({ p1: entry.p1, p2: entry.p2, kind });
  }
  return frontEdges;
}

function edgeMidpoint(edge: FrontEdge): Point {
  return {
    lat: (edge.p1.lat + edge.p2.lat) / 2,
    lng: (edge.p1.lng + edge.p2.lng) / 2,
  };
}

const FRONT_LAT_BANDS = [
  { id: "north", minLat: 49.35, maxLat: 52.5 },
  { id: "donbas", minLat: 48.0, maxLat: 49.35 },
  { id: "south", minLat: 45.5, maxLat: 48.0 },
] as const;

function edgesInBand(edges: FrontEdge[], minLat: number, maxLat: number) {
  return edges.filter((edge) => {
    const mid = edgeMidpoint(edge);
    return mid.lat >= minLat && mid.lat < maxLat;
  });
}

function pathFromEdge(edge: FrontEdge, index: number): TransportPath {
  const points = [groundPoint(edge.p1), groundPoint(edge.p2)];
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    id: `ukraine-front-edge-${edge.kind}-${index}`,
    kind: edge.kind,
    name: null,
    scalerank: 1,
    lengthKm: null,
    bbox: {
      minLat: Math.min(...lats),
      minLng: Math.min(...lngs),
      maxLat: Math.max(...lats),
      maxLng: Math.max(...lngs),
    },
    points,
  };
}

function extractExteriorEdges(zones: UkraineControlZone[]): Array<{ p1: Point; p2: Point }> {
  const edgeCounts = new Map<string, { p1: Point; p2: Point; count: number }>();

  for (const zone of zones) {
    for (const edge of collectZoneEdges(zone)) {
      const existing = edgeCounts.get(edge.key);
      if (existing) {
        existing.count += 1;
      } else {
        edgeCounts.set(edge.key, { p1: edge.p1, p2: edge.p2, count: 1 });
      }
    }
  }

  return [...edgeCounts.values()]
    .filter((entry) => entry.count === 1)
    .map(({ p1, p2 }) => ({ p1, p2 }));
}

function buildClaimOutlinePaths(
  zones: UkraineControlZone[],
  kind: ClaimKind,
  lodTier: GlobeLodTier,
): TransportPath[] {
  const maxSegments =
    lodTier === "village"
      ? 900
      : lodTier === "near"
        ? 620
        : lodTier === "regional"
          ? 280
          : lodTier === "continent"
            ? 80
            : 0;
  if (maxSegments <= 0 || zones.length === 0) return [];

  const edges = extractExteriorEdges(zones);
  return edges.slice(0, maxSegments).map((edge, index) => {
    const points = [groundPoint(edge.p1), groundPoint(edge.p2)];
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    return {
      id: `${kind}-${index}`,
      kind,
      name: null,
      scalerank: 1,
      lengthKm: null,
      bbox: {
        minLat: Math.min(...lats),
        minLng: Math.min(...lngs),
        maxLat: Math.max(...lats),
        maxLng: Math.max(...lngs),
      },
      points,
    };
  });
}

function edgeSegmentsToPaths(edges: FrontEdge[], maxSegments: number): TransportPath[] {
  const filtered = edges.filter((edge) => ALL_FRONT_KINDS.has(edge.kind));
  return filtered.slice(0, maxSegments).map((edge, index) => pathFromEdge(edge, index));
}

function straightSegmentFromEdges(
  edges: FrontEdge[],
  kind: FrontEdgeKind,
  bandId: string,
  index: number,
): TransportPath | null {
  if (edges.length === 0) return null;

  const mids = edges.map(edgeMidpoint);
  const sorted = mids.slice().sort((a, b) => a.lng - b.lng);
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  if (pointDistanceDeg(start, end) < 0.04) return null;

  const points = [groundPoint(start), groundPoint(end)];
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);

  return {
    id: `ukraine-front-${kind}-${bandId}-${index}`,
    kind,
    name: null,
    scalerank: 1,
    lengthKm: null,
    bbox: {
      minLat: Math.min(...lats),
      minLng: Math.min(...lngs),
      maxLat: Math.max(...lats),
      maxLng: Math.max(...lngs),
    },
    points,
  };
}

function simplifyEdgesToStraightPaths(edges: FrontEdge[]): TransportPath[] {
  const paths: TransportPath[] = [];
  const kinds = [...ALL_FRONT_KINDS];

  for (const band of FRONT_LAT_BANDS) {
    const bandEdges = edgesInBand(edges, band.minLat, band.maxLat);
    for (const kind of kinds) {
      const kindEdges = bandEdges.filter((edge) => edge.kind === kind);
      const path = straightSegmentFromEdges(kindEdges, kind, band.id, 0);
      if (path) paths.push(path);

      if (kindEdges.length >= 12) {
        const mids = kindEdges.map(edgeMidpoint).sort((a, b) => a.lng - b.lng);
        const midLng = mids[Math.floor(mids.length / 2)].lng;
        const west = kindEdges.filter((edge) => edgeMidpoint(edge).lng <= midLng);
        const east = kindEdges.filter((edge) => edgeMidpoint(edge).lng > midLng);
        const westPath = straightSegmentFromEdges(west, kind, `${band.id}-w`, 1);
        const eastPath = straightSegmentFromEdges(east, kind, `${band.id}-e`, 2);
        if (westPath) paths.push(westPath);
        if (eastPath) paths.push(eastPath);
      }
    }
  }

  return paths;
}

function buildFrontlinePaths(edges: FrontEdge[], lodTier: GlobeLodTier): TransportPath[] {
  const frontEdges = edges.filter((edge) => ALL_FRONT_KINDS.has(edge.kind));
  if (lodTier === "near" || lodTier === "village") {
    return edgeSegmentsToPaths(frontEdges, lodTier === "village" ? 1400 : 900);
  }
  if (lodTier === "regional") {
    return edgeSegmentsToPaths(frontEdges, 420);
  }
  return simplifyEdgesToStraightPaths(frontEdges);
}

function circleRing(center: Point, radiusDeg: number, segments = 14): Point[] {
  const cosLat = Math.cos((center.lat * Math.PI) / 180) || 1e-6;
  const ring: Point[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    ring.push({
      lat: center.lat + radiusDeg * Math.sin(angle),
      lng: center.lng + (radiusDeg * Math.cos(angle)) / cosLat,
    });
  }
  return ring;
}

/** 전선 인접 경합지 — 반경 5km 회색 전투지역 링 */
function buildCombatZoneRings(
  contestedZones: UkraineControlZone[],
  view: Point,
  lodTier: GlobeLodTier,
): TransportPath[] {
  const maxRings =
    lodTier === "village"
      ? 48
      : lodTier === "near"
        ? 36
        : lodTier === "regional"
          ? 18
          : 8;
  const segments = lodTier === "global" || lodTier === "continent" ? 10 : 14;

  const ranked = contestedZones
    .slice()
    .sort((a, b) => pointDistanceDeg(a.center, view) - pointDistanceDeg(b.center, view))
    .slice(0, maxRings);

  return ranked.map((zone, index) => {
    const points = circleRing(zone.center, COMBAT_ZONE_RADIUS_DEG, segments).map(groundPoint);
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    return {
      id: `ukraine-combat-${zone.id}-${index}`,
      kind: "ukraine-combat-zone" as const,
      name: null,
      scalerank: 1,
      lengthKm: null,
      bbox: {
        minLat: Math.min(...lats),
        minLng: Math.min(...lngs),
        maxLat: Math.max(...lats),
        maxLng: Math.max(...lngs),
      },
      points,
    };
  });
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

function advancePathFromPoints(
  from: Point,
  to: Point,
  kind: "ua-advance" | "ru-advance",
  id: string,
): TransportPath | null {
  if (pointDistanceDeg(from, to) < 0.02) return null;
  const points = [groundPoint(from), groundPoint(to)];
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    id,
    kind,
    name: null,
    scalerank: 1,
    lengthKm: null,
    bbox: {
      minLat: Math.min(...lats),
      minLng: Math.min(...lngs),
      maxLat: Math.max(...lats),
      maxLng: Math.max(...lngs),
    },
    points,
  };
}

function buildDynamicAdvanceLines(
  contestedZones: UkraineControlZone[],
  ruZones: UkraineControlZone[],
  uaZones: UkraineControlZone[],
  view: Point,
  maxArrows = 8,
): TransportPath[] {
  if (contestedZones.length === 0) return [];

  const ranked = contestedZones
    .slice()
    .sort((a, b) => pointDistanceDeg(a.center, view) - pointDistanceDeg(b.center, view));

  const sampled: UkraineControlZone[] = [];
  const minGap = 0.55;
  for (const zone of ranked) {
    if (sampled.some((s) => pointDistanceDeg(s.center, zone.center) < minGap)) continue;
    sampled.push(zone);
    if (sampled.length >= maxArrows) break;
  }

  const paths: TransportPath[] = [];
  for (const contested of sampled) {
    const nearestUa = findNearestZone(contested.center, uaZones);
    const nearestRu = findNearestZone(contested.center, ruZones);

    if (nearestUa && pointDistanceDeg(nearestUa.center, contested.center) <= 1.8) {
      const path = advancePathFromPoints(
        nearestUa.center,
        contested.center,
        "ua-advance",
        `ukraine-ua-advance-${contested.id}`,
      );
      if (path) paths.push(path);
    }

    if (nearestRu && pointDistanceDeg(nearestRu.center, contested.center) <= 1.8) {
      const path = advancePathFromPoints(
        nearestRu.center,
        contested.center,
        "ru-advance",
        `ukraine-ru-advance-${contested.id}`,
      );
      if (path) paths.push(path);
    }
  }

  return paths;
}

function buildUaGainOutlinePaths(
  contestedZones: UkraineControlZone[],
  uaZones: UkraineControlZone[],
  lodTier: GlobeLodTier,
): TransportPath[] {
  const gainZones = contestedZones.filter((zone) =>
    uaZones.some((ua) => pointDistanceDeg(ua.center, zone.center) <= 2.4),
  );
  if (gainZones.length === 0) return [];

  const maxSegments =
    lodTier === "village"
      ? 480
      : lodTier === "near"
        ? 320
        : lodTier === "regional"
          ? 180
          : lodTier === "continent"
            ? 60
            : 0;
  if (maxSegments <= 0) return [];

  const edges = extractExteriorEdges(gainZones);
  return edges.slice(0, maxSegments).map((edge, index) => {
    const points = [groundPoint(edge.p1), groundPoint(edge.p2)];
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    return {
      id: `ukraine-ua-gain-${index}`,
      kind: "ukraine-ua-gain" as const,
      name: null,
      scalerank: 1,
      lengthKm: null,
      bbox: {
        minLat: Math.min(...lats),
        minLng: Math.min(...lngs),
        maxLat: Math.max(...lats),
        maxLng: Math.max(...lngs),
      },
      points,
    };
  });
}

function filterFrontZones(zones: UkraineControlZone[], view: Point, maxCount: number) {
  return zones
    .slice()
    .sort((a, b) => pointDistanceDeg(a.center, view) - pointDistanceDeg(b.center, view))
    .slice(0, maxCount);
}

export type UkraineFrontRender = {
  paths: TransportPath[];
};

/** RU·UA 주장 외곽선 + 점령 경계 전선 + 전투지역 링 + 진격 방향선 (지표면) */
export function buildUkraineFrontRender(
  ruZones: UkraineControlZone[],
  uaZones: UkraineControlZone[],
  contestedZones: UkraineControlZone[],
  view: Point,
  options: { maxZones?: number; maxArrows?: number; lodTier?: GlobeLodTier } = {},
): UkraineFrontRender {
  const maxZones = options.maxZones ?? 2400;
  const lodTier = options.lodTier ?? "regional";

  const frontUa = filterFrontZones(
    uaZones.filter((z) => z.center.lng >= 30.5 && z.center.lat <= 50.8),
    view,
    Math.floor(maxZones * 0.35),
  );
  const frontContested = filterFrontZones(contestedZones, view, Math.floor(maxZones * 0.25));
  const frontRu = filterFrontZones(
    contestedZones.length
      ? ruZones.filter((z) =>
          contestedZones.some((c) => pointDistanceDeg(z.center, c.center) <= 2.2),
        )
      : ruZones,
    view,
    Math.floor(maxZones * 0.4),
  );

  const allZones = [...frontRu, ...frontUa, ...frontContested];
  const frontEdges = extractFrontEdges(allZones);
  const linePaths = buildFrontlinePaths(frontEdges, lodTier);

  // 면형(주장 외곽·전투 링·회복 영역·진격 화살)은 표시하지 않고 전선만 유지
  return {
    paths: linePaths,
  };
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
