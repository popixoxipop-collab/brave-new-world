/**
 * Conflict View — 사운드 지휘소(Manifest)
 *
 * Freesound HQ mp3는 `/api/sound-stream` 프록시. `freesoundId`가 있으면 텍스트 검색보다 우선
 * (오매칭·잡음 차단). ID는 페이지 설명·태그를 기준으로 큐레이션한 값.
 *
 * ★ HARD RULES
 * - 폭음/폭격/폭발: 먼 대형 폭탄의 둔탁한 "쿵" (deep/muffled/thud) — 근접 crack·cinematic 금지
 * - 경보: 공습 사이렌은 로컬 Mega Siren 고정
 * - 경제/긴장/부가: 전부 freesoundId 고정 (검색 폴백만 보조)
 * - 볼륨 낮게 + 줌 연동 cap (원샷 ≤0.22~0.55, 앰비언트 ≤0.22)
 */

export type AudioCategory = "conflict" | "economy" | "ui" | "ambient";

export interface AudioEventDef {
  eventId: string;
  /** Freesound 텍스트 검색 폴백 (localSrc·freesoundId 실패 시) */
  freesoundQuery: string;
  /** 검증된 Freesound 사운드 ID — localSrc 없을 때 검색 스킵 */
  freesoundId?: number;
  /**
   * 로컬 정적 파일 (`public/` 기준). 있으면 Freesound보다 절대 우선.
   * 공습경보·전투 원샷처럼 오매칭 비용이 큰 이벤트는 반드시 로컬 고정.
   */
  localSrc?: string;
  volume: number;
  loop?: boolean;
  category: AudioCategory;
  /** 큐레이션 메모 (감사·유지보수) */
  note?: string;
}

export const AUDIO_MANIFEST = {
  // ── Conflict: 경보 · 충격 ────────────────────────────────────────

  /** 이스라엘 적색 경보 — 다성 중형 공습사이렌 (Chrysler Victory 계열, 묵직) */
  "tzeva-red-alert": {
    eventId: "tzeva-red-alert",
    freesoundQuery: "heavy air raid siren",
    localSrc: "/audio/air-attack-siren.mp3",
    volume: 0.88,
    category: "conflict",
    note: "로컬 Mega Siren (3-tone) · Freesound 미사용",
  },

  /** 이스라엘 경보 해제 — 동일 사이렌을 짧게·작게 */
  "tzeva-all-clear": {
    eventId: "tzeva-all-clear",
    freesoundQuery: "heavy air raid siren",
    localSrc: "/audio/air-attack-siren.mp3",
    volume: 0.34,
    category: "conflict",
    note: "해제용 · 적색보다 작게 · 로컬 고정",
  },

  /**
   * NEPTUN 탄착(드론·미사일·KAB 등) — 로컬 묵직 폭발음
   */
  "neptun-impact": {
    eventId: "neptun-impact",
    freesoundQuery: "heavy muffled explosion thud",
    localSrc: "/audio/combat-explosion.wav",
    volume: 0.55,
    category: "conflict",
    note: "로컬 폭발 thud · 드론/미사일 탄착",
  },

  /** Shahed/UAV — qubodup DJI 호버 루프 (짧은 프로펠러 윙윙) */
  "neptun-uav-flyby": {
    eventId: "neptun-uav-flyby",
    freesoundQuery: "drone propeller buzz soft",
    freesoundId: 854382,
    volume: 0.24,
    category: "conflict",
    note: "FS#854382 qubodup · UAV 호버/프로펠러",
  },

  /** 탄도 — 먼 whoosh만 (폭음 아님) */
  "neptun-ballistic": {
    eventId: "neptun-ballistic",
    freesoundQuery: "distant rocket whoosh soft",
    freesoundId: 211617,
    volume: 0.18,
    category: "conflict",
    note: "FS#211617 qubodup Far Away Rocket Launch · 통과음만",
  },

  /**
   * 우크라 공습 경보 — 동일 묵직 다성 공습사이렌
   */
  "neptun-air-alert": {
    eventId: "neptun-air-alert",
    freesoundQuery: "heavy air raid siren",
    localSrc: "/audio/air-attack-siren.mp3",
    volume: 0.86,
    category: "conflict",
    note: "로컬 Mega Siren (3-tone) · Freesound 미사용",
  },

  /** Hero breaking — 뉴스룸 스팅 (사이렌·벨과 겹치지 않게) */
  "hero-breaking": {
    eventId: "hero-breaking",
    freesoundQuery: "newsroom alert beep short",
    freesoundId: 419493,
    volume: 0.38,
    category: "conflict",
    note: "FS#419493 plasterbrain Bell Chime Alert · 짧은 뉴스 스팅",
  },

  /** 전선 총격 — 원거리 연발 */
  "frontline-gunfire": {
    eventId: "frontline-gunfire",
    freesoundQuery: "distant gunfire burst",
    localSrc: "/audio/combat-gunfire.wav",
    volume: 0.42,
    category: "conflict",
    note: "로컬 총격 버스트 · 전선 간헐",
  },

  /** 전선 폭격 */
  "frontline-bombing": {
    eventId: "frontline-bombing",
    freesoundQuery: "distant heavy bombing thud",
    localSrc: "/audio/combat-bombing.wav",
    volume: 0.48,
    category: "conflict",
    note: "로컬 폭격 · 전선 간헐",
  },

  /** 전선 포격 단발 */
  "frontline-artillery-shot": {
    eventId: "frontline-artillery-shot",
    freesoundQuery: "distant artillery boom",
    localSrc: "/audio/combat-artillery.wav",
    volume: 0.46,
    category: "conflict",
    note: "로컬 포격 · 전선 간헐",
  },

  /** 다련장로켓(MLRS) 살보 */
  "frontline-mlrs": {
    eventId: "frontline-mlrs",
    freesoundQuery: "multiple rocket launcher salvo",
    localSrc: "/audio/combat-mlrs.wav",
    volume: 0.5,
    category: "conflict",
    note: "로컬 MLRS 살보 · 저빈도",
  },

  /** GDELT war — 총격 스팅 (전선 gunfire와 동일 로컬 샘플) */
  "gdelt-war-sting": {
    eventId: "gdelt-war-sting",
    freesoundQuery: "distant gunfire soft",
    localSrc: "/audio/combat-gunfire.wav",
    volume: 0.28,
    category: "conflict",
    note: "로컬 총격 · GDELT/전선 공용",
  },

  /** GDELT protest — 먼 군중 (총성과 구분) */
  "gdelt-protest-sting": {
    eventId: "gdelt-protest-sting",
    freesoundQuery: "distant crowd protest chant",
    freesoundId: 360758,
    volume: 0.26,
    category: "conflict",
    note: "FS#360758 dnlburnett Taxi protest distant · 군중/시위",
  },

  /** 분쟁 고긴장 — 저음 긴장 rumble (항공기 드론과 혼동 방지) */
  "dispute-tension-high": {
    eventId: "dispute-tension-high",
    freesoundQuery: "low ominous rumble tension soft loop",
    freesoundId: 593785,
    volume: 0.12,
    loop: true,
    category: "ambient",
    note: "FS#593785 steaq Ominous Rumble · 전쟁구역/고긴장 위 앰비언트",
  },

  /**
   * FIRMS 폭격 추정 — 로컬 폭발음
   */
  "firms-combat-burst": {
    eventId: "firms-combat-burst",
    freesoundQuery: "muffled distant explosion thud",
    localSrc: "/audio/combat-explosion.wav",
    volume: 0.4,
    category: "conflict",
    note: "로컬 폭발 · FIRMS 전투 열감지",
  },

  /** 사격장 FIRMS — 아주 작은 둔탁음 (자동 재생 거의 없음) */
  "firms-exercise": {
    eventId: "firms-exercise",
    freesoundQuery: "soft distant thud muted",
    freesoundId: 478189,
    volume: 0.05,
    category: "ambient",
    note: "FS#478189 JonnyRuss01 Beep_Soft_2 · 훈련 구역 극소 신호",
  },

  /** 미분류 FIRMS — 먼 잔불 (자동 재생 OFF) */
  "firms-wildfire-crackle": {
    eventId: "firms-wildfire-crackle",
    freesoundQuery: "distant campfire crackle soft",
    freesoundId: 620324,
    volume: 0.07,
    category: "ambient",
    note: "FS#620324 marb7e Campfire crackling Loop · 산불/잔불",
  },

  /** Telegram OSINT — 무전기 종료 스퀠치 */
  "telegram-live-burst": {
    eventId: "telegram-live-burst",
    freesoundQuery: "radio static burst short walkie",
    freesoundId: 524205,
    volume: 0.28,
    category: "conflict",
    note: "FS#524205 · 무전 스퀠치",
  },

  /** 사이버 — 디지털 UI 글리치/에러 톤 */
  "cyber-incident": {
    eventId: "cyber-incident",
    freesoundQuery: "digital glitch alarm short",
    freesoundId: 423166,
    volume: 0.3,
    category: "conflict",
    note: "FS#423166 plasterbrain Minimalist Sci-Fi UI Error · 디지털 톤",
  },

  // ── Ambient ──────────────────────────────────────────────────────

  /** 전선 줌 — 먼 포격 rumble 베드 (루프) */
  "frontline-artillery-ambient": {
    eventId: "frontline-artillery-ambient",
    freesoundQuery: "distant artillery rumble soft loop",
    localSrc: "/audio/combat-frontline-bed.wav",
    volume: 0.14,
    loop: true,
    category: "ambient",
    note: "로컬 전선 rumble · 간헐 원샷과 함께",
  },

  /** 항모 갑판 */
  "carrier-deck-ambient": {
    eventId: "carrier-deck-ambient",
    freesoundQuery: "aircraft carrier flight deck ambient",
    freesoundId: 162449,
    volume: 0.14,
    loop: true,
    category: "ambient",
    note: "FS#162449 qubodup Jet launches/recoveries on carrier · 갑판 앰비언스",
  },

  // ── Economy ──────────────────────────────────────────────────────

  /** 티커 급등 — NYSE 거래소 벨 */
  "ticker-spike": {
    eventId: "ticker-spike",
    freesoundQuery: "stock exchange trading bell ring",
    freesoundId: 380490,
    volume: 0.4,
    category: "economy",
    note: "FS#380490 tahur1976 NYSEBell · 거래소 벨",
  },

  /** VIX — 시장 경고 비프 (벨과 구분) */
  "vix-spike": {
    eventId: "vix-spike",
    freesoundQuery: "soft warning beep short electronic",
    freesoundId: 478189,
    volume: 0.32,
    category: "economy",
    note: "FS#478189 JonnyRuss01 Beep_Soft_2 · 짧은 전자 경고",
  },

  /** 유가 급등 — 산업 압력/파이프 히스 */
  "oil-spike": {
    eventId: "oil-spike",
    freesoundQuery: "steam pipe pressure release hiss short",
    freesoundId: 234782,
    volume: 0.3,
    category: "economy",
    note: "FS#234782 wubitog Steam/hiss · 배관 압력 해제",
  },

  /** 경제 허브 도착 — 항만 크레인·부두 산업음 */
  "econ-hub-arrive": {
    eventId: "econ-hub-arrive",
    freesoundQuery: "harbor port crane industrial short",
    freesoundId: 86739,
    volume: 0.22,
    category: "economy",
    note: "FS#86739 dobroide Seville port crane scrap · 항만 산업",
  },

  /** 항만 레이어 앰비언스 */
  "port-ambient": {
    eventId: "port-ambient",
    freesoundQuery: "harbor seaport ambient waves ships",
    freesoundId: 254130,
    volume: 0.13,
    loop: true,
    category: "ambient",
    note: "FS#254130 clif_creates Harbor Ambience 2 · 항구/파도/선박",
  },

  /** 건설/경제 중심 */
  "construction-ambient": {
    eventId: "construction-ambient",
    freesoundQuery: "construction site hammering distant soft",
    freesoundId: 366124,
    volume: 0.11,
    loop: true,
    category: "ambient",
    note: "FS#366124 DCSFX Construction site [Loop] AMB · 현장 앰비언스",
  },

  /** 파이프라인 */
  "pipeline-hum": {
    eventId: "pipeline-hum",
    freesoundQuery: "industrial pump hum low continuous",
    freesoundId: 453514,
    volume: 0.14,
    loop: true,
    category: "ambient",
    note: "FS#453514 kyles industrial hums hiss water treatment · 펌프/배관",
  },

  /** 데이터센터 */
  "datacenter-hum": {
    eventId: "datacenter-hum",
    freesoundQuery: "server room fan cooling hum",
    freesoundId: 610761,
    volume: 0.11,
    loop: true,
    category: "ambient",
    note: "FS#610761 DeVern Computer Server Room Ambience Loop · 서버룸 팬",
  },

  /** 제재 — 도장 찍는 소리 */
  "sanctions-stamp": {
    eventId: "sanctions-stamp",
    freesoundQuery: "rubber stamp paper thud",
    freesoundId: 470710,
    volume: 0.28,
    category: "economy",
    note: "FS#470710 I.fekry traditional stamp · 행정 도장",
  },

  /** 경제 알림 — 시세 차임 (전쟁 사이렌·NYSE 벨과 분리) */
  "economy-alert": {
    eventId: "economy-alert",
    freesoundQuery: "soft chime notification market",
    freesoundId: 571511,
    volume: 0.34,
    category: "economy",
    note: "FS#571511 LegitCheese Soft-Notifications LowDing · 부드러운 차임",
  },

  // ── UI ───────────────────────────────────────────────────────────

  /** Fly-to 착지 — 짧은 UI 핑 (시네마틱 과장 금지) */
  "flyto-arrive": {
    eventId: "flyto-arrive",
    freesoundQuery: "soft ui whoosh short",
    freesoundId: 833599,
    volume: 0.16,
    category: "ui",
    note: "FS#833599 subquire Bright Synth Ping · 짧은 UI 착지",
  },

  /** 모드 전환 */
  "mode-switch": {
    eventId: "mode-switch",
    freesoundQuery: "soft ui transition swipe",
    freesoundId: 458586,
    volume: 0.22,
    category: "ui",
    note: "FS#458586 InspectorJ UI Mechanical Notification · 전환",
  },

  /** 부트 완료 */
  "boot-ready": {
    eventId: "boot-ready",
    freesoundQuery: "soft ui power on chime",
    freesoundId: 413749,
    volume: 0.2,
    category: "ui",
    note: "FS#413749 InspectorJ UI Confirmation Alert · 준비 차임",
  },

  /** 레이어 클릭 */
  "ui-click": {
    eventId: "ui-click",
    freesoundQuery: "soft ui button click",
    freesoundId: 458586,
    volume: 0.14,
    category: "ui",
    note: "FS#458586 InspectorJ mechanical notification · 최소 클릭",
  },

  /** 패널 열기 */
  "panel-open": {
    eventId: "panel-open",
    freesoundQuery: "soft ui panel open",
    freesoundId: 419493,
    volume: 0.14,
    category: "ui",
    note: "FS#419493 plasterbrain Bell Chime Alert · 패널",
  },

  /** 로드 오류 */
  "load-error": {
    eventId: "load-error",
    freesoundQuery: "soft error beep ui",
    freesoundId: 423169,
    volume: 0.28,
    category: "ui",
    note: "FS#423169 plasterbrain PC Game UI Error · 소프트 에러",
  },

  /** 스트림 끊김 — 무전 클릭/스퀠치 */
  "stream-disconnect": {
    eventId: "stream-disconnect",
    freesoundQuery: "radio click disconnect short",
    freesoundId: 524205,
    volume: 0.24,
    category: "ui",
    note: "FS#524205 · 무전 끊김 스퀠치",
  },
} as const satisfies Record<string, AudioEventDef>;

export type AudioEventId = keyof typeof AUDIO_MANIFEST;

export function getAudioEvent(eventId: AudioEventId): AudioEventDef {
  return AUDIO_MANIFEST[eventId];
}

export function listAudioEventsByCategory(category: AudioCategory): AudioEventDef[] {
  return (Object.values(AUDIO_MANIFEST) as AudioEventDef[]).filter(
    (def) => def.category === category,
  );
}

/** 루프 앰비언스 — 동시 재생 시 하나만 */
export const AMBIENT_EVENT_IDS = (Object.values(AUDIO_MANIFEST) as AudioEventDef[])
  .filter((def) => Boolean(def.loop))
  .map((def) => def.eventId as AudioEventId);
