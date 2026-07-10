import type { ConflictEvent, EventTier, GreatPowerScope } from "@/data/geoTypes";
import { getZoomOutScale } from "@/lib/zoomScale";

export { getZoomOutScale } from "@/lib/zoomScale";

/** 지정학 알림 4종: 전쟁 / 외교 긴장 / 동맹국 갈등 / 시위 */
export const ALLOWED_EVENT_TIERS: EventTier[] = ["war", "diplomatic", "alliance", "protest"];

export const TIER_LABELS: Record<EventTier, string> = {
  war: "전쟁·군사 충돌",
  diplomatic: "외교적 긴장",
  alliance: "동맹국 갈등",
  protest: "시위",
};

export const TIER_COLORS: Record<
  EventTier,
  { point: string; label: string; dot: string }
> = {
  war: {
    point: "rgba(239, 68, 68, 0.92)",
    label: "rgba(254, 226, 226, 0.96)",
    dot: "rgba(239, 68, 68, 0.95)",
  },
  diplomatic: {
    point: "rgba(251, 146, 60, 0.92)",
    label: "rgba(255, 237, 213, 0.96)",
    dot: "rgba(251, 146, 60, 0.95)",
  },
  alliance: {
    point: "rgba(217, 70, 239, 0.92)",
    label: "rgba(250, 232, 255, 0.96)",
    dot: "rgba(217, 70, 239, 0.95)",
  },
  protest: {
    point: "rgba(226, 232, 240, 0.96)",
    label: "rgba(15, 23, 42, 0.94)",
    dot: "rgba(226, 232, 240, 0.96)",
  },
};

/** 최신 속보 테두리 글로우 (노랑) */
export const FRESH_RING_COLOR = "rgba(250, 204, 21, 0.85)";
export const FRESH_EVENT_HOURS = 24;

const DIPLOMATIC_PAIRS = new Set([
  "USA|CHN", "CHN|USA", "CHN|TWN", "TWN|CHN", "CHN|JPN", "JPN|CHN", "CHN|KOR", "KOR|CHN",
  "CHN|PRK", "PRK|CHN", "PRK|KOR", "KOR|PRK", "IND|PAK", "PAK|IND",
  "IND|CHN", "CHN|IND", "CHN|VNM", "VNM|CHN", "CHN|PHL", "PHL|CHN", "CHN|MYS", "MYS|CHN",
  "RUS|DEU", "DEU|RUS", "RUS|POL", "POL|RUS", "ISR|IRN", "IRN|ISR", "SAU|IRN", "IRN|SAU",
  "USA|IRN", "IRN|USA", "USA|RUS", "RUS|USA",
]);

/** 동일 동맹·우호 블록 (블록 내부 actor1↔actor2 → alliance) */
const ALLIANCE_BLOCS: ReadonlyArray<ReadonlySet<string>> = [
  new Set(["USA", "GBR", "FRA", "DEU", "POL", "TUR", "NOR", "ITA", "ESP", "NLD", "BEL", "CAN", "DNK", "CZE", "ROU"]),
  new Set(["USA", "JPN", "KOR", "AUS"]),
  new Set(["DEU", "FRA", "ITA", "ESP", "POL", "NLD", "BEL", "AUT", "SWE", "FIN"]),
  new Set(["USA", "AUS", "GBR", "IND", "JPN"]),
  new Set(["USA", "ISR"]),
  new Set(["SAU", "ARE", "QAT", "BHR", "KWT", "OMN"]),
];

type Hotspot = { minLat: number; maxLat: number; minLng: number; maxLng: number };

const DIPLOMATIC_HOTSPOTS: Hotspot[] = [
  { minLat: 20, maxLat: 42, minLng: 115, maxLng: 130 },
  { minLat: 44, maxLat: 53, minLng: 22, maxLng: 41 },
  { minLat: 24, maxLat: 40, minLng: 44, maxLng: 64 },
  { minLat: 33, maxLat: 43, minLng: 124, maxLng: 132 },
  { minLat: 4, maxLat: 22, minLng: 98, maxLng: 122 },
  { minLat: 24, maxLat: 37, minLng: 68, maxLng: 78 },
  { minLat: 26, maxLat: 37, minLng: 73, maxLng: 97 },
];

export const GREAT_POWERS = new Set([
  "USA",
  "CHN",
  "RUS",
  "GBR",
  "FRA",
  "DEU",
  "JPN",
  "IND",
]);

export type { GreatPowerScope };

function pairKey(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b || a === b) return null;
  return `${a}|${b}`;
}

function inHotspot(lat: number, lng: number) {
  return DIPLOMATIC_HOTSPOTS.some(
    (box) => lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng,
  );
}

function isDiplomaticPair(a: string | null | undefined, b: string | null | undefined) {
  const key = pairKey(a, b);
  return key ? DIPLOMATIC_PAIRS.has(key) : false;
}

export function isAlliancePair(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b || a === b) return false;
  return ALLIANCE_BLOCS.some((bloc) => bloc.has(a) && bloc.has(b));
}

function normalizeStoredTier(tier: EventTier | string | undefined): EventTier | null {
  if (!tier) return null;
  if (tier === "riot" || tier === "intraBloc") return "alliance";
  if (ALLOWED_EVENT_TIERS.includes(tier as EventTier)) return tier as EventTier;
  return null;
}

export function isGreatPower(code: string | null | undefined): boolean {
  return Boolean(code && GREAT_POWERS.has(code));
}

export function getGreatPowerScope(event: ConflictEvent): GreatPowerScope | null {
  const a1 = event.actor1Country;
  const a2 = event.actor2Country;
  const gp1 = isGreatPower(a1);
  const gp2 = isGreatPower(a2);

  if (gp1 && gp2 && a1 !== a2 && !isAlliancePair(a1, a2)) return "rivalry";

  if (!gp1 && !gp2) return null;

  const tier = event.eventTier ?? classifyEventTier(event);
  const isConflict =
    tier === "war" ||
    tier === "diplomatic" ||
    tier === "alliance" ||
    event.category === "Battles" ||
    event.category === "Violence against civilians" ||
    event.category === "Strategic developments" ||
    event.category === "Riots";

  if (isConflict || inHotspot(event.lat, event.lng)) return "intervention";

  return null;
}

export function getMarkerRadius(
  event: ConflictEvent,
  scope: GreatPowerScope | null,
  altitude = 1,
): number {
  let base: number;
  if (scope === "rivalry") base = 0.38;
  else if (scope === "intervention") base = 0.28;
  else if (event.eventTier === "protest") base = 0.16;
  else if (event.eventTier === "alliance") base = 0.18;
  else base = 0.15;
  return base * getZoomOutScale(altitude);
}

export function getLabelSize(
  event: ConflictEvent,
  scope: GreatPowerScope | null,
  altitude = 1,
): number {
  const tension = event.tensionScore ?? getTensionScore(event);
  const base = 0.82 + tension / 180;
  let size: number;
  if (scope === "rivalry") size = base + 0.55;
  else if (scope === "intervention") size = base + 0.32;
  else size = base;
  return size * getZoomOutScale(altitude);
}

export function getLabelDotRadius(
  event: ConflictEvent,
  scope: GreatPowerScope | null,
  altitude = 1,
): number {
  let base: number;
  if (event.eventTier === "protest") {
    base = scope ? 0.22 : 0.18;
  } else if (event.eventTier === "alliance") {
    base = scope ? 0.2 : 0.14;
  } else {
    base = scope === "rivalry" ? 0.22 : scope === "intervention" ? 0.16 : 0.1;
  }
  return base * getZoomOutScale(altitude);
}

export function isVisibleAtAltitude(
  event: ConflictEvent,
  scope: GreatPowerScope | null | undefined,
  altitude: number,
): boolean {
  void event;
  void scope;
  void altitude;
  return true;
}

/** 파괴적·실제 전투/전쟁 뉴스만 빨간(war) 티어 */
export function isDestructiveWar(event: ConflictEvent): boolean {
  const gs = event.goldsteinScale ?? 0;

  switch (event.category) {
    case "Battles":
      return gs <= -4;
    case "Violence against civilians":
      return gs <= -7;
    default:
      return false;
  }
}

/**
 * GDELT CAMEO → 지정학 4종.
 * - war: 전투·민간인 폭력 (파괴적)
 * - diplomatic: 적대·핫스팟 외교 긴장
 * - alliance: 동맹·우호국 간 마찰
 * - protest: 시위
 */
export function classifyEventTier(event: ConflictEvent): EventTier | null {
  const stored = normalizeStoredTier(event.eventTier);
  const a1 = event.actor1Country;
  const a2 = event.actor2Country;

  if (stored) {
    if (stored === "war" && !isDestructiveWar(event)) return null;
    if (stored === "diplomatic" && isAlliancePair(a1, a2)) return "alliance";
    if (stored === "alliance" && !isAlliancePair(a1, a2) && !isDiplomaticPair(a1, a2)) {
      // 소요로 저장된 과거 데이터 중 동맹 매칭 안 되면 드롭
      if (event.category === "Riots") return null;
    }
    return stored;
  }

  switch (event.category) {
    case "Battles":
    case "Violence against civilians":
      return isDestructiveWar(event) ? "war" : null;
    case "Protests":
      return "protest";
    case "Riots":
      // 일반 소요는 제외, 동맹국 간만 alliance
      return isAlliancePair(a1, a2) ? "alliance" : null;
    case "Strategic developments": {
      if (isAlliancePair(a1, a2)) return "alliance";
      if (isDiplomaticPair(a1, a2)) return "diplomatic";
      if (inHotspot(event.lat, event.lng)) return "diplomatic";
      const gs = event.goldsteinScale ?? 0;
      if (gs < -1 && a1 && a2 && a1 !== a2) return "diplomatic";
      return null;
    }
    default:
      return null;
  }
}

export function getTensionScore(event: ConflictEvent, tier?: EventTier | null): number {
  if (typeof event.tensionScore === "number") return event.tensionScore;

  const resolvedTier = tier ?? classifyEventTier(event);
  const goldstein = event.goldsteinScale ?? 0;
  const conflictFactor = Math.max(0, -Math.min(goldstein, 0)) / 10;
  const severityFactor = (event.severity - 1) / 4;
  const tierBoost: Record<EventTier, number> = {
    war: 18,
    diplomatic: 8,
    alliance: 10,
    protest: 4,
  };

  const boost = resolvedTier ? tierBoost[resolvedTier] : 0;
  const raw = conflictFactor * 62 + severityFactor * 28 + boost;
  return Math.max(1, Math.min(99, Math.round(raw)));
}

export type ScoredEvent = ConflictEvent & {
  eventTier: EventTier;
  tensionScore: number;
  greatPowerScope: GreatPowerScope | null;
};

export function scoreEvents(events: ConflictEvent[]): ScoredEvent[] {
  const scored: ScoredEvent[] = [];

  for (const event of events) {
    const tier = classifyEventTier(event);
    if (!tier) continue;
    scored.push({
      ...event,
      eventTier: tier,
      tensionScore: getTensionScore(event, tier),
      greatPowerScope: getGreatPowerScope({ ...event, eventTier: tier }),
    });
  }

  return scored;
}

export function filterByTier(events: ScoredEvent[], tier: EventTier) {
  return events.filter((event) => event.eventTier === tier);
}

/** 최신 속보 (createdAt 우선, 없으면 eventDate) */
export function isFreshEvent(event: ConflictEvent, now = Date.now()): boolean {
  const created = event.createdAt ? Date.parse(event.createdAt) : Number.NaN;
  if (Number.isFinite(created)) {
    return now - created <= FRESH_EVENT_HOURS * 60 * 60 * 1000;
  }

  if (event.eventDate) {
    const dayStart = Date.parse(`${event.eventDate}T00:00:00Z`);
    if (Number.isFinite(dayStart)) {
      return now - dayStart <= FRESH_EVENT_HOURS * 60 * 60 * 1000;
    }
  }

  return false;
}

export function eventRecencyMs(event: ConflictEvent): number {
  const created = event.createdAt ? Date.parse(event.createdAt) : Number.NaN;
  if (Number.isFinite(created)) return created;
  if (event.eventDate) {
    const day = Date.parse(`${event.eventDate}T12:00:00Z`);
    if (Number.isFinite(day)) return day;
  }
  return 0;
}

export type TensionMarker = ScoredEvent & {
  markerId: string;
  labelText: string;
};

export function toTensionMarkers(events: ScoredEvent[]): TensionMarker[] {
  return events.map((event) => ({
    ...event,
    markerId: `marker-${event.id}`,
    labelText: TIER_LABELS[event.eventTier],
  }));
}
