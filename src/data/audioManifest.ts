/**
 * Conflict View — 사운드 지휘소(Manifest)
 *
 * 108개 UI/상황 이벤트 중 "대시보드가 살아 숨 쉰다"는 느낌을 만드는
 * 킬러 이벤트만 엄선. Freesound HQ mp3 프리뷰는 `/api/sound-stream` 프록시로 스트리밍.
 *
 * 큐레이션 원칙
 * - Conflict: 건조·무겁게 (사이렌·원거리 포성·충격). 한반도/대만은 앰비언스만, 교전음 과다 금지.
 * - Economy: 산업·금융 현장감 (항만·건설·거래소 벨).
 * - UI: 거슬리지 않는 짧은 피드백.
 * - Ambient: 루프·저볼륨 — 피로도 최우선.
 */

export type AudioCategory = "conflict" | "economy" | "ui" | "ambient";

export interface AudioEventDef {
  eventId: string;
  /** Freesound 텍스트 검색에 넣을 2~3단어 영어 키워드 */
  freesoundQuery: string;
  /** 0.1 ~ 1.0 — 앰비언스는 낮게, 경보는 확실하게 */
  volume: number;
  /** 앰비언스용 루프 */
  loop?: boolean;
  category: AudioCategory;
}

export const AUDIO_MANIFEST = {
  // ── Conflict: 경보 · 충격 (최우선 킬러) ───────────────────────────

  /** 이스라엘 적색 경보 — 사이렌이 곧 "심각함"의 시그니처 */
  "tzeva-red-alert": {
    eventId: "tzeva-red-alert",
    freesoundQuery: "air raid siren short",
    volume: 0.72,
    category: "conflict",
  },

  /** 경보 해제 — 사이렌 페이드와 구분되는 all-clear */
  "tzeva-all-clear": {
    eventId: "tzeva-all-clear",
    freesoundQuery: "all clear siren",
    volume: 0.45,
    category: "conflict",
  },

  /** NEPTUN 임팩트 — 원거리·둔탁한 폭음 (근접 크래시/시네마틱 붐 금지) */
  "neptun-impact": {
    eventId: "neptun-impact",
    freesoundQuery: "distant muffled boom",
    volume: 0.55,
    category: "conflict",
  },

  /** Shahed/UAV 비행 — 윙윙이 미사일보다 일상적 공포에 가깝다 */
  "neptun-uav-flyby": {
    eventId: "neptun-uav-flyby",
    freesoundQuery: "drone propeller buzz",
    volume: 0.38,
    category: "conflict",
  },

  /** 탄도/MiG-31K — 고고도 로켓감, 짧게만 */
  "neptun-ballistic": {
    eventId: "neptun-ballistic",
    freesoundQuery: "rocket whoosh distant",
    volume: 0.55,
    category: "conflict",
  },

  /** 우크라 raion/oblast 공습 경보 갱신 — Tzeva와 톤을 살짝 다르게 */
  "neptun-air-alert": {
    eventId: "neptun-air-alert",
    freesoundQuery: "civil defense siren",
    volume: 0.65,
    category: "conflict",
  },

  /** Hero breaking (urgency≥45) — 뉴스룸 스팅, 사이렌과 겹치지 않게 */
  "hero-breaking": {
    eventId: "hero-breaking",
    freesoundQuery: "newsroom breaking alert beep",
    volume: 0.58,
    category: "conflict",
  },

  /** GDELT war — 먼 총성(둔탁·짧게). 근접 총격/리포트 금지 */
  "gdelt-war-sting": {
    eventId: "gdelt-war-sting",
    freesoundQuery: "distant muffled gunfire",
    volume: 0.32,
    category: "conflict",
  },

  /** GDELT protest — 군중·도심 불안 (총성과 구분) */
  "gdelt-protest-sting": {
    eventId: "gdelt-protest-sting",
    freesoundQuery: "crowd protest chant distant",
    volume: 0.35,
    category: "conflict",
  },

  /** Local dispute tension=high — 낮은 긴장 톤 */
  "dispute-tension-high": {
    eventId: "dispute-tension-high",
    freesoundQuery: "low tension drone",
    volume: 0.32,
    category: "conflict",
  },

  /**
   * FIRMS × 분쟁/전선 교차 추정.
   * 훈련과 구분 불가 — UI는 "전투/훈련 미구분". 볼륨 낮게.
   * 산불·농지소각·exercise 구역에는 쓰지 말 것.
   */
  "firms-combat-burst": {
    eventId: "firms-combat-burst",
    freesoundQuery: "distant muffled boom",
    volume: 0.2,
    category: "conflict",
  },

  /**
   * NOTAM/사격장 레이어 안 FIRMS — 기본 무음에 가깝게.
   * exerciseZones 데이터가 채워지면 classify → 여기로 옴.
   * 자동 재생은 기본 OFF 권장 (SoundEffectsBridge 미연결).
   */
  "firms-exercise": {
    eventId: "firms-exercise",
    freesoundQuery: "distant soft thud muted",
    volume: 0.08,
    category: "ambient",
  },

  /**
   * 원인 미분류 FIRMS — 기본 무음 권장.
   * 수동 프리뷰/디버그용. 자동 재생에 묶지 말 것.
   */
  "firms-wildfire-crackle": {
    eventId: "firms-wildfire-crackle",
    freesoundQuery: "soft fire crackle distant",
    volume: 0.12,
    category: "ambient",
  },

  /** Telegram OSINT LIVE 신규 — 무전기 버스트 */
  "telegram-live-burst": {
    eventId: "telegram-live-burst",
    freesoundQuery: "radio static burst short",
    volume: 0.34,
    category: "conflict",
  },

  /** 사이버 침해 — 디지털 알람 (물리 전장과 톤 분리) */
  "cyber-incident": {
    eventId: "cyber-incident",
    freesoundQuery: "digital alarm glitch",
    volume: 0.4,
    category: "conflict",
  },

  // ── Conflict ambient: 전선 줌인 시에만 (루프·저볼륨) ─────────────

  /**
   * 우크라 contested 근접 줌 — 원거리 포격(둔탁·낮은 rumble).
   * 근접 포성·연속 사격 루프 금지. 한반도·대만은 이 루프 OFF.
   */
  "frontline-artillery-ambient": {
    eventId: "frontline-artillery-ambient",
    freesoundQuery: "distant artillery rumble",
    volume: 0.14,
    loop: true,
    category: "ambient",
  },

  /** 항모 작전중 포커스 — 갑판 앰비언스, 짧게 루프 */
  "carrier-deck-ambient": {
    eventId: "carrier-deck-ambient",
    freesoundQuery: "aircraft carrier deck ambient",
    volume: 0.2,
    loop: true,
    category: "ambient",
  },

  // ── Economy: 시장 · 인프라 ───────────────────────────────────────

  /** Ticker SPIKE (±1.25%) — 거래소 벨이 시장 긴장 시그니처 */
  "ticker-spike": {
    eventId: "ticker-spike",
    freesoundQuery: "stock exchange trading bell",
    volume: 0.55,
    category: "economy",
  },

  /** VIX 급등 — 리스크 프리미엄, 벨보다 날카롭게 */
  "vix-spike": {
    eventId: "vix-spike",
    freesoundQuery: "market warning beep",
    volume: 0.5,
    category: "economy",
  },

  /** WTI/Brent 급등 — 에너지 초크포인트와 연결 */
  "oil-spike": {
    eventId: "oil-spike",
    freesoundQuery: "industrial pipe pressure hiss",
    volume: 0.42,
    category: "economy",
  },

  /** 경제 허브 / 항만 fly-to — 크레인·부두가 "지경학 창" 입구 */
  "econ-hub-arrive": {
    eventId: "econ-hub-arrive",
    freesoundQuery: "industrial port crane ambient",
    volume: 0.28,
    category: "economy",
  },

  /** Ports / LNG / shipping 레이어 근접 — 산업 현장 루프 */
  "port-ambient": {
    eventId: "port-ambient",
    freesoundQuery: "harbor cargo ship ambient",
    volume: 0.16,
    loop: true,
    category: "ambient",
  },

  /** Economic centers / 건설감 — 사용자 요청의 "건물 짓는 소리" */
  "construction-ambient": {
    eventId: "construction-ambient",
    freesoundQuery: "construction site hammer crane",
    volume: 0.15,
    loop: true,
    category: "ambient",
  },

  /** Oil/gas pipelines 레이어 */
  "pipeline-hum": {
    eventId: "pipeline-hum",
    freesoundQuery: "gas pipeline pump hum",
    volume: 0.22,
    loop: true,
    category: "ambient",
  },

  /** AI data centers / IXP — 서버룸 */
  "datacenter-hum": {
    eventId: "datacenter-hum",
    freesoundQuery: "server room cooling fan hum",
    volume: 0.14,
    loop: true,
    category: "ambient",
  },

  /** Sanctions / 제재 포인트 — 차갑고 행정적인 피드백 */
  "sanctions-stamp": {
    eventId: "sanctions-stamp",
    freesoundQuery: "rubber stamp thud",
    volume: 0.36,
    category: "economy",
  },

  /** Economy Intel alert 모드 — 전쟁 사이렌과 분리된 시세 알람 */
  "economy-alert": {
    eventId: "economy-alert",
    freesoundQuery: "trading floor alert chime",
    volume: 0.48,
    category: "economy",
  },

  // ── UI / 공통 ────────────────────────────────────────────────────

  /** Fly-to 도착 — 카메라 착지 피드백 */
  "flyto-arrive": {
    eventId: "flyto-arrive",
    freesoundQuery: "low cinematic bass whoosh",
    volume: 0.3,
    category: "ui",
  },

  /** 지정학 ↔ 지경학 / 패키지 확정 */
  "mode-switch": {
    eventId: "mode-switch",
    freesoundQuery: "cinematic transition whoosh",
    volume: 0.35,
    category: "ui",
  },

  /** 부트 완료 · 오버레이 페이드아웃 */
  "boot-ready": {
    eventId: "boot-ready",
    freesoundQuery: "ui power chime",
    volume: 0.28,
    category: "ui",
  },

  /** 레이어 토글 / 탭 / 체크박스 — 최소 클릭음 */
  "ui-click": {
    eventId: "ui-click",
    freesoundQuery: "subtle soft ui click",
    volume: 0.22,
    category: "ui",
  },

  /** 패널 열기 */
  "panel-open": {
    eventId: "panel-open",
    freesoundQuery: "soft panel slide open",
    volume: 0.2,
    category: "ui",
  },

  /** Load error / 치명 오류 — 거슬리지 않되 인지 가능하게 */
  "load-error": {
    eventId: "load-error",
    freesoundQuery: "error beep soft",
    volume: 0.4,
    category: "ui",
  },

  /** WS/라이브 끊김 — conflict 무전기 계열로 살짝 톤 맞춤 */
  "stream-disconnect": {
    eventId: "stream-disconnect",
    freesoundQuery: "radio disconnect click",
    volume: 0.3,
    category: "ui",
  },
} as const satisfies Record<string, AudioEventDef>;

export type AudioEventId = keyof typeof AUDIO_MANIFEST;

export function getAudioEvent(eventId: AudioEventId): AudioEventDef {
  return AUDIO_MANIFEST[eventId];
}

export function listAudioEventsByCategory(category: AudioCategory): AudioEventDef[] {
  return Object.values(AUDIO_MANIFEST).filter((def) => def.category === category);
}

/** 루프 앰비언스 — 동시 재생 시 하나만 켜는 게 UX상 안전 */
export const AMBIENT_EVENT_IDS = Object.values(AUDIO_MANIFEST)
  .filter((def) => def.loop)
  .map((def) => def.eventId) as AudioEventId[];
