import type { GeoJsonGeometry } from "@/data/geoTypes";
import type { UkraineAxisPath } from "@/data/ukraineSituationSeed";
import type { TransportPath } from "@/data/geoTypes";
import type { GlobeLodTier } from "@/lib/globeLod";

export type UkraineArrowPolygon = {
  id: string;
  polygonLayer: "ukraine-ua-arrow" | "ukraine-ru-arrow";
  geometry: GeoJsonGeometry;
  center: { lat: number; lng: number };
};

function bearingDeg(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function offsetPoint(
  origin: { lat: number; lng: number },
  bearing: number,
  distanceDeg: number,
): { lat: number; lng: number } {
  const rad = (bearing * Math.PI) / 180;
  const latRad = (origin.lat * Math.PI) / 180;
  const cosLat = Math.cos(latRad) || 1e-6;
  return {
    lat: origin.lat + distanceDeg * Math.cos(rad),
    lng: origin.lng + (distanceDeg * Math.sin(rad)) / cosLat,
  };
}

function pointDistanceDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const latDist = Math.abs(a.lat - b.lat);
  const lngDist = Math.abs(a.lng - b.lng);
  return Math.sqrt(latDist ** 2 + lngDist ** 2);
}

function toRing(points: { lat: number; lng: number }[]): number[][] {
  const ring = points.map((p) => [p.lng, p.lat] as [number, number]);
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  }
  return ring;
}

/** 두꺼운 면 채움 화살표 (UA 방어=파랑, RU 진격=주황) */
export function buildFilledArrowPolygon(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  options: {
    shaftWidthDeg?: number;
    headLengthDeg?: number;
    headSpreadDeg?: number;
  } = {},
): GeoJsonGeometry {
  const shaftWidthDeg = options.shaftWidthDeg ?? 0.022;
  const headLengthDeg = options.headLengthDeg ?? 0.07;
  const headSpreadDeg = options.headSpreadDeg ?? 26;

  const bearing = bearingDeg(from, to);
  const span = pointDistanceDeg(from, to);
  const headLen = Math.min(headLengthDeg, Math.max(0.025, span * 0.38));
  const shaftEnd = offsetPoint(to, bearing + 180, headLen);

  const left = bearing + 90;
  const right = bearing - 90;
  const half = shaftWidthDeg / 2;

  const shaftStartL = offsetPoint(from, left, half);
  const shaftStartR = offsetPoint(from, right, half);
  const shaftEndL = offsetPoint(shaftEnd, left, half);
  const shaftEndR = offsetPoint(shaftEnd, right, half);
  const headLeft = offsetPoint(to, bearing + 180 + headSpreadDeg, headLen);
  const headRight = offsetPoint(to, bearing + 180 - headSpreadDeg, headLen);

  return {
    type: "Polygon",
    coordinates: [
      toRing([shaftStartL, shaftStartR, shaftEndR, headRight, to, headLeft, shaftEndL]),
    ],
  };
}

export function buildFilledArrowFromPoints(
  points: { lat: number; lng: number }[],
  layer: UkraineArrowPolygon["polygonLayer"],
  id: string,
  scale = 1,
): UkraineArrowPolygon | null {
  if (points.length < 2) return null;
  const from = points[0];
  const to = points[points.length - 1];
  if (pointDistanceDeg(from, to) < 0.02) return null;

  const geometry = buildFilledArrowPolygon(from, to, {
    shaftWidthDeg: 0.018 * scale,
    headLengthDeg: 0.055 * scale,
    headSpreadDeg: 24,
  });

  return {
    id,
    polygonLayer: layer,
    geometry,
    center: {
      lat: (from.lat + to.lat) / 2,
      lng: (from.lng + to.lng) / 2,
    },
  };
}

/** 경로 끝에 진격 방향 화살촉(선) 점 추가 — 레거시 */
export function appendAdvanceArrowHead(
  points: { lat: number; lng: number }[],
  headLengthDeg = 0.09,
  headSpreadDeg = 22,
): { lat: number; lng: number }[] {
  if (points.length < 2) return points;
  const tip = points[points.length - 1];
  const prev = points[points.length - 2];
  const bearing = bearingDeg(prev, tip);
  const left = offsetPoint(tip, bearing + 180 + headSpreadDeg, headLengthDeg);
  const right = offsetPoint(tip, bearing + 180 - headSpreadDeg, headLengthDeg);
  return [...points, left, tip, right];
}

export function ukraineAxisToTransportPath(path: UkraineAxisPath): TransportPath {
  const points = path.points.map((p) => ({ lat: p.lat, lng: p.lng, alt: 0 }));
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);

  return {
    id: path.id,
    kind: path.kind,
    name: path.name,
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

export const UKRAINE_ARROW_PATH_KINDS = new Set([
  "ua-axis",
  "ru-axis",
  "ua-advance",
  "ru-advance",
]);

export function ukraineArrowScale(lodTier: GlobeLodTier): number {
  switch (lodTier) {
    case "village":
      return 1.15;
    case "near":
      return 1;
    case "regional":
      return 0.88;
    case "continent":
      return 0.72;
    default:
      return 0.58;
  }
}

export function transportPathToArrowPolygon(
  path: TransportPath,
  scale = 1,
): UkraineArrowPolygon | null {
  if (!UKRAINE_ARROW_PATH_KINDS.has(path.kind)) return null;
  const layer =
    path.kind === "ua-advance" || path.kind === "ua-axis"
      ? "ukraine-ua-arrow"
      : "ukraine-ru-arrow";
  const pts = path.points.map((p) => ({ lat: p.lat, lng: p.lng }));
  return buildFilledArrowFromPoints(pts, layer, `ua-arrow-${path.id}`, scale);
}

export function ukraineAxisToArrowPolygon(
  path: UkraineAxisPath,
  scale = 1,
): UkraineArrowPolygon | null {
  const layer =
    path.kind === "ua-advance" || path.kind === "ua-axis"
      ? "ukraine-ua-arrow"
      : path.kind === "ru-advance" || path.kind === "ru-axis"
        ? "ukraine-ru-arrow"
        : null;
  if (!layer) return null;
  return buildFilledArrowFromPoints(path.points, layer, `ua-arrow-${path.id}`, scale);
}
