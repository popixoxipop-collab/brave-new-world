/** NEPTUN (neptun.in.ua) — 우크라이나 공중 위협·공식 경보 오픈 API 타입 */

export type NeptunThreatType =
  | "uav"
  | "recon"
  | "missile"
  | "ballistic"
  | "kab"
  | "mig31k"
  | "unknown";

export type NeptunConfidence = "low" | "medium" | "high";

export type NeptunThreatStatus = "active" | "stale" | "resolved";

export type NeptunTrailPoint = {
  lat: number;
  lon: number;
  t: string;
};

export type NeptunThreat = {
  id: string;
  type: NeptunThreatType;
  title: string;
  region: string;
  district: string;
  locality: string;
  lat: number;
  lon: number;
  heading: number | null;
  confidenceLevel: NeptunConfidence;
  sourceCount: number;
  count?: number;
  updatedAt: string;
  status: NeptunThreatStatus;
  explanationShort?: string;
  velocity?: { bearingDeg: number; speedKmh: number };
  confirmedAt?: string;
  uncertaintyKm?: number;
  positionQuality?: string;
  trail?: NeptunTrailPoint[];
  lifecycle?: string;
};

export type NeptunAlertRegion = {
  key: string;
  name: string;
  oblast: string;
  since: string;
};

export type NeptunAlerts = {
  raions: NeptunAlertRegion[];
  oblasts: NeptunAlertRegion[];
};

export type NeptunThreatsResponse = {
  serverTime: string;
  threats: NeptunThreat[];
};

export type NeptunPayload = {
  fetchedAt: string;
  serverTime: string;
  live: boolean;
  threats: NeptunThreat[];
  alerts: NeptunAlerts;
  /** 데모·스텁용 — 이미 사라진 위협의 보존 궤적 */
  archivedThreats?: NeptunArchivedThreat[];
  stub?: boolean;
  error?: string;
};

export type NeptunTypeMeta = {
  label: string;
  shortLabel: string;
  color: string;
  severity: number;
};

export type NeptunPredicted = {
  lat: number;
  lon: number;
  heading: number | null;
  flying: boolean;
};

export type NeptunLiveThreat = NeptunThreat & {
  predictedLat: number;
  predictedLon: number;
  predictedHeading: number | null;
  flying: boolean;
};

/** WebSocket remove·snapshot delta로 사라진 위협의 보존 궤적 */
export type NeptunArchivedThreat = NeptunThreat & {
  archivedAt: string;
};

/** NEPTUN SDK THREAT_TYPES 색상·라벨과 동기화 */
const TYPE_META: Record<NeptunThreatType, NeptunTypeMeta> = {
  uav: { label: "UAV / Shahed", shortLabel: "БпЛА", color: "#f0820e", severity: 2 },
  recon: { label: "정찰 UAV", shortLabel: "Розвідка", color: "#1f9bd8", severity: 1 },
  missile: { label: "순항 미사일", shortLabel: "Ракети", color: "#e2384f", severity: 3 },
  ballistic: { label: "탄도 미사일", shortLabel: "Балістика", color: "#b21e6b", severity: 3 },
  kab: { label: "유도 폭탄 (KAB)", shortLabel: "КАБ", color: "#d9531e", severity: 2 },
  mig31k: { label: "MiG-31K 발사", shortLabel: "Авіація", color: "#7c4dff", severity: 3 },
  unknown: { label: "공중 위협", shortLabel: "Невідомі", color: "#6b7790", severity: 1 },
};

const EARTH_RADIUS_KM = 6371;

export function getNeptunTypeMeta(type: string): NeptunTypeMeta {
  return TYPE_META[type as NeptunThreatType] ?? TYPE_META.unknown;
}

/** 위도·경도·방위·거리(km)로 목적지 좌표 계산 */
export function neptunDest(lat: number, lon: number, bearingDeg: number, km: number) {
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const d = km / EARTH_RADIUS_KM;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI };
}

/** NEPTUN SDK와 동일한 dead-reckon 추측항법 */
export function neptunPredict(threat: NeptunThreat, nowMs = Date.now()): NeptunPredicted {
  const speed = threat.velocity?.speedKmh ?? 0;
  if (speed <= 0 || !Number.isFinite(threat.lat) || !Number.isFinite(threat.lon)) {
    return {
      lat: threat.lat,
      lon: threat.lon,
      heading: threat.heading,
      flying: false,
    };
  }

  const anchorIso = threat.confirmedAt || threat.updatedAt;
  const anchorMs = anchorIso ? Date.parse(anchorIso) : nowMs;
  const elapsedH = Math.max(0, (nowMs - anchorMs) / 3_600_000);
  const km = speed * elapsedH;
  const bearing = threat.velocity?.bearingDeg ?? threat.heading ?? 0;
  const pos = neptunDest(threat.lat, threat.lon, bearing, km);

  return {
    lat: pos.lat,
    lon: pos.lon,
    heading: bearing,
    flying: km > 0.01,
  };
}

export function isNeptunThreatVisible(threat: NeptunThreat): boolean {
  return (
    threat.status === "active" &&
    Number.isFinite(threat.lat) &&
    Number.isFinite(threat.lon)
  );
}

export function formatNeptunLocation(threat: NeptunThreat): string {
  return [threat.locality, threat.district, threat.region].filter(Boolean).join(" · ");
}

export const NEPTUN_ATTRIBUTION_URL = "https://neptun.in.ua/";
export const NEPTUN_API_BASE = "https://neptun.in.ua";
export const NEPTUN_WS_URL = "wss://neptun.in.ua/api/v1/stream";
