/**
 * globe.gl 고도: altitude = cameraDistance / 100 - 1
 * 너무 가까이 가면 지표면 클리핑·Z-fighting·텍스처 깨짐이 발생함
 */
export const MIN_GLOBE_ALTITUDE = 0.14;

/** 극저고도 — 이 아래에서는 지오메트리·bump를 추가로 줄임 */
export const EXTREME_ZOOM_ALTITUDE = 0.18;

/**
 * 궤도(ISS급) 개요 — 환영·도메인·세부 선택 후 첫 진입 카메라.
 * 중동 전역(걸프·레반트·이란)이 한 화면에 들어오는 원거리.
 */
export const ORBITAL_OVERVIEW_ALTITUDE = 1.78;

/** 전장/경제 허브 진입 시 이보다 가까이 붙지 않음 */
export const THEATER_ENTRY_MIN_ALTITUDE = 1.58;

export function clampGlobeAltitude(altitude: number): number {
  const a = Number.isFinite(altitude) ? altitude : MIN_GLOBE_ALTITUDE;
  return Math.max(MIN_GLOBE_ALTITUDE, a);
}

export function globeDistanceForAltitude(altitude: number): number {
  return (clampGlobeAltitude(altitude) + 1) * 100;
}
