import { clampGlobeAltitude } from "@/lib/globeCamera";

/** Conflict View 단일 베이스맵 — Carto Dark Matter (레이어 가독용 다크 벡터) */
export const MAPLIBRE_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export type MapLibreCamera = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

/** globe.gl altitude → MapLibre zoom (globe projection, 경험적 보정) */
export function globeViewToMapLibre(view: {
  lat: number;
  lng: number;
  altitude: number;
}): MapLibreCamera {
  const alt = clampGlobeAltitude(view.altitude);
  const zoom = altitudeToMapLibreZoom(alt);

  return {
    longitude: view.lng,
    latitude: view.lat,
    zoom,
    pitch: 0,
    bearing: 0,
  };
}

export function altitudeToMapLibreZoom(altitude: number): number {
  const alt = clampGlobeAltitude(altitude);
  return Math.max(0.85, Math.min(13.8, 9.25 - Math.log2(alt + 0.06) * 2.35));
}

/** MapLibre zoom → globe.gl altitude (globeViewToMapLibre 역변환) */
export function mapLibreZoomToAltitude(zoom: number): number {
  const z = Math.max(0.85, Math.min(13.8, zoom));
  return clampGlobeAltitude(2 ** ((9.25 - z) / 2.35) - 0.06);
}

export function getMapLibreStyleUrl(): string {
  return MAPLIBRE_STYLE_URL;
}
