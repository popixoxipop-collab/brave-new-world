import type { GeoJsonGeometry, UkraineControlZone } from "@/data/geoTypes";
import { EXTREME_ZOOM_ALTITUDE } from "@/lib/globeCamera";
import { getGlobeLod, type GlobeLod } from "@/lib/globeLod";

export type ViinaLod = GlobeLod & {
  mode: "hidden" | "overview" | "detail";
  maxFeatures: number;
};

export type ViinaPolygonLayers = {
  ruZones: UkraineControlZone[];
  /** 점령 면 채움 — 상세 줌에서는 단순화 폴리곤만 */
  ruFillZones: UkraineControlZone[];
  uaZones: UkraineControlZone[];
  contestedZones: UkraineControlZone[];
  zones: UkraineControlZone[];
  lod: ViinaLod;
};

type ViewState = { lat: number; lng: number; altitude: number };

/** 우크라이나 극동부 박스 대략 경계 — 이 밖 폴리곤은 버림 */
const UA_BOUNDS = {
  minLng: 21.5,
  maxLng: 41.5,
  minLat: 43.5,
  maxLat: 53.5,
};

const MAX_FEATURES: Record<ViinaLod["tier"], number> = {
  global: 0,
  continent: 1200,
  regional: 2800,
  near: 9000,
  village: 14000,
};

const LAYER_SHARE = {
  ru: 0.2,
  contested: 0.14,
  ua: 0.38,
} as const;

/** RU 점령 면 채움 상한 — WebGL 폴리곤 부하 완화 */
const RU_FILL_MAX: Record<ViinaLod["mode"], number> = {
  hidden: 0,
  overview: 160,
  detail: 220,
};

function longitudeDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function zoneDistanceDeg(zone: UkraineControlZone, view: ViewState) {
  const latDist = Math.abs(view.lat - zone.center.lat);
  const lngDist = longitudeDistance(view.lng, zone.center.lng);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

function zoneInUkraineTheater(zone: UkraineControlZone) {
  const { lat, lng } = zone.center;
  return (
    lng >= UA_BOUNDS.minLng &&
    lng <= UA_BOUNDS.maxLng &&
    lat >= UA_BOUNDS.minLat &&
    lat <= UA_BOUNDS.maxLat
  );
}

function zoneHasUsableGeometry(zone: UkraineControlZone) {
  const geometry = zone.geometry;
  if (!geometry) return false;
  const polys =
    geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : geometry.type === "MultiPolygon"
        ? (geometry.coordinates as number[][][][])
        : [];
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring || ring.length < 4) continue;
    if (Math.abs(ringSignedArea(ring)) > 1e-10) return true;
  }
  return false;
}

/** shoelace — lng/lat에서 양수면 CCW. three-globe는 CW(분쟁지와 동일)를 기대 */
function ringSignedArea(ring: number[][]) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return area / 2;
}

function ensureClockwiseRing(ring: number[][]) {
  if (!Array.isArray(ring) || ring.length < 4) return ring;
  if (ringSignedArea(ring) > 0) {
    return ring.slice().reverse();
  }
  return ring;
}

function normalizeGeometryWinding(geometry: GeoJsonGeometry): GeoJsonGeometry {
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates as number[][][];
    return {
      type: "Polygon",
      coordinates: coords.map((ring, index) => {
        const fixed = ensureClockwiseRing(ring);
        // holes should be opposite of exterior (CCW when exterior is CW)
        if (index > 0 && ringSignedArea(fixed) < 0) return fixed.slice().reverse();
        return fixed;
      }),
    };
  }
  if (geometry.type === "MultiPolygon") {
    const coords = geometry.coordinates as number[][][][];
    return {
      type: "MultiPolygon",
      coordinates: coords.map(
        (polygon) =>
          polygon.map((ring, index) => {
            const fixed = ensureClockwiseRing(ring);
            if (index > 0 && ringSignedArea(fixed) < 0) return fixed.slice().reverse();
            return fixed;
          }) as number[][][],
      ),
    };
  }
  return geometry;
}

export function normalizeViinaZoneWinding(zone: UkraineControlZone): UkraineControlZone {
  return {
    ...zone,
    geometry: normalizeGeometryWinding(zone.geometry),
  };
}

function simplifyRing(ring: number[][], maxPoints = 6) {
  if (!Array.isArray(ring) || ring.length <= maxPoints) return ensureClockwiseRing(ring);
  const step = Math.ceil(ring.length / maxPoints);
  const sampled = ring.filter((_, index) => index % step === 0);
  const last = ring[ring.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return ensureClockwiseRing(sampled);
}

function simplifyGeometry(geometry: GeoJsonGeometry, maxPoints = 6): GeoJsonGeometry {
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates as number[][][];
    return {
      type: "Polygon",
      coordinates: coords.map((ring) => simplifyRing(ring, maxPoints)),
    };
  }
  if (geometry.type === "MultiPolygon") {
    const coords = geometry.coordinates as number[][][][];
    return {
      type: "MultiPolygon",
      coordinates: coords.map((polygon) =>
        polygon.map((ring) => simplifyRing(ring, maxPoints)),
      ),
    };
  }
  return geometry;
}

export function getViinaLod(altitude: number): ViinaLod {
  const base = getGlobeLod(altitude);
  let mode: ViinaLod["mode"];
  if (base.tier === "global") mode = "hidden";
  else if (base.tier === "continent") mode = "overview";
  else mode = "detail";

  let maxFeatures = MAX_FEATURES[base.tier];
  if (altitude < EXTREME_ZOOM_ALTITUDE && maxFeatures > 0) {
    maxFeatures = Math.min(maxFeatures, 2400);
  }

  return {
    ...base,
    mode,
    maxFeatures,
  };
}

export function buildOverviewFromDetail(zones: UkraineControlZone[]): UkraineControlZone[] {
  return zones.map((zone, index) => ({
    ...zone,
    id: `viina-${zone.controlStatus.toLowerCase()}-overview-${index}`,
    geometry: simplifyGeometry(zone.geometry, 6),
  }));
}

function splitByStatus(zones: UkraineControlZone[]) {
  const ruZones: UkraineControlZone[] = [];
  const uaZones: UkraineControlZone[] = [];
  const contestedZones: UkraineControlZone[] = [];

  for (const zone of zones) {
    if (!zoneInUkraineTheater(zone) || !zoneHasUsableGeometry(zone)) continue;
    if (zone.controlStatus === "RU") ruZones.push(zone);
    else if (zone.controlStatus === "CONTESTED") contestedZones.push(zone);
    else uaZones.push(zone);
  }

  return { ruZones, uaZones, contestedZones };
}

export function filterViinaZones(
  zones: UkraineControlZone[],
  view: ViewState,
  lod: ViinaLod,
  maxCount?: number,
): UkraineControlZone[] {
  const budget = maxCount ?? lod.maxFeatures;
  if (lod.mode === "hidden" || budget <= 0) return [];

  const theater = zones.filter(zoneInUkraineTheater);
  const candidates =
    lod.radiusDeg > 0
      ? theater.filter((zone) => zoneDistanceDeg(zone, view) <= lod.radiusDeg)
      : theater;

  if (candidates.length <= budget) return candidates;

  return candidates
    .slice()
    .sort((a, b) => zoneDistanceDeg(a, view) - zoneDistanceDeg(b, view))
    .slice(0, budget);
}

function filterLayer(
  zones: UkraineControlZone[],
  view: ViewState,
  lod: ViinaLod,
  share: number,
): UkraineControlZone[] {
  const budget = Math.max(0, Math.floor(lod.maxFeatures * share));
  return filterViinaZones(zones, view, lod, budget).map(normalizeViinaZoneWinding);
}

export function selectViinaPolygons(
  detail: UkraineControlZone[],
  overview: UkraineControlZone[],
  view: ViewState,
  altitude: number,
): ViinaPolygonLayers {
  const lod = getViinaLod(altitude);

  if (lod.mode === "hidden") {
    return {
      ruZones: [],
      ruFillZones: [],
      uaZones: [],
      contestedZones: [],
      zones: [],
      lod,
    };
  }

  const detailSplit = splitByStatus(detail);
  const overviewSplit = splitByStatus(overview);

  const ruOverview =
    overviewSplit.ruZones.length > 0
      ? overviewSplit.ruZones
      : buildOverviewFromDetail(detailSplit.ruZones);
  const uaOverview =
    overviewSplit.uaZones.length > 0
      ? overviewSplit.uaZones
      : buildOverviewFromDetail(detailSplit.uaZones);
  const contestedOverview =
    overviewSplit.contestedZones.length > 0
      ? overviewSplit.contestedZones
      : buildOverviewFromDetail(detailSplit.contestedZones);

  const ruSource = lod.mode === "overview" ? ruOverview : detailSplit.ruZones;
  const uaSource = lod.mode === "overview" ? uaOverview : detailSplit.uaZones;
  const contestedSource =
    lod.mode === "overview" ? contestedOverview : detailSplit.contestedZones;

  const ruZones = filterLayer(ruSource, view, lod, LAYER_SHARE.ru);
  const contestedZones = filterLayer(contestedSource, view, lod, LAYER_SHARE.contested);
  const uaZones = filterLayer(uaSource, view, lod, LAYER_SHARE.ua);

  const ruFillSource = lod.mode === "detail" ? ruOverview : ruOverview;
  const ruFillZones = filterViinaZones(
    ruFillSource,
    view,
    lod,
    RU_FILL_MAX[lod.mode],
  ).map(normalizeViinaZoneWinding);

  const zones = [...ruFillZones, ...contestedZones, ...uaZones];

  return { ruZones, ruFillZones, uaZones, contestedZones, zones, lod };
}
