import type { UkraineAxisPath } from "@/data/ukraineSituationSeed";
import type { TransportPath } from "@/data/geoTypes";

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

/** 경로 끝에 진격 방향 화살촉(삼각형) 점 추가 */
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
  const isAdvance = path.kind === "ua-advance" || path.kind === "ru-advance";
  const points = isAdvance ? appendAdvanceArrowHead(path.points) : path.points;
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
