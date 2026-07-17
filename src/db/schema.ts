import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * D1 schema (Drizzle) — Conflict View
 *
 * - firms_fires: Cron ingest 라이브 산불/열원 (NASA FIRMS)
 * - ukraine_control_paths: 점령/주장 테두리·빗금 사전계산 path
 * - ukraine_control_builds: 사전계산 빌드 메타
 * - gdelt_points / ingest_runs: Cron ingest 호환
 * - news_stream_snapshots / news_stream_items: RSS 티어 뉴스 D1 캐시
 * - ais_vessels / adsb_aircraft: MarineTraffic·ADS-B 클라우드 로그
 * - submarine_tunnels: 해저터널 인프라 (온디맨드)
 * - dispute_hatch_*: 분쟁·중동(이란) 전선 빗금 스냅샷
 */

/** NASA FIRMS 라이브 포인트 (workers/cron-ingest 와 동일 테이블) */
export const firmsFires = sqliteTable(
  "firms_fires",
  {
    id: text("id").primaryKey(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    frp: real("frp"),
    brightness: real("brightness"),
    confidence: text("confidence"),
    acqDate: text("acq_date"),
    acqTime: text("acq_time"),
    satellite: text("satellite"),
    daynight: text("daynight"),
    source: text("source").notNull().default("VIIRS_SNPP_NRT"),
    theater: text("theater"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    ingestedIdx: index("idx_firms_ingested").on(t.ingestedAt),
    theaterIdx: index("idx_firms_theater").on(t.theater),
    geoIdx: index("idx_firms_geo").on(t.lat, t.lng),
  }),
);

/**
 * 우크라이나 점령/주장 빗금·테두리 사전계산 결과.
 * 클라이언트 `buildUkraineFrontRender` 대신 D1에서 path를 읽어 그린다.
 *
 * kind 예:
 *  ukraine-ru-occupied | ukraine-ua-occupied
 *  ukraine-ru-occupied-hatch | ukraine-ua-occupied-hatch
 *  ukraine-ru-claim | ukraine-ua-claim
 *  ukraine-ru-claim-hatch | ukraine-ua-claim-hatch
 */
export const ukraineControlPaths = sqliteTable(
  "ukraine_control_paths",
  {
    id: text("id").primaryKey(),
    /** VIINA zone id */
    zoneId: text("zone_id").notNull(),
    kind: text("kind").notNull(),
    name: text("name"),
    accentColor: text("accent_color"),
    /** overview | detail — LOD별 사전계산 세트 */
    lodTier: text("lod_tier").notNull(),
    /** VIINA 기준일 YYYYMMDD */
    controlDate: text("control_date").notNull(),
    /** JSON: Array<{ lat: number; lng: number }> */
    pointsJson: text("points_json").notNull(),
    pointCount: integer("point_count").notNull().default(0),
    minLat: real("min_lat"),
    minLng: real("min_lng"),
    maxLat: real("max_lat"),
    maxLng: real("max_lng"),
    builtAt: text("built_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    zoneIdx: index("idx_ua_paths_zone").on(t.zoneId),
    kindIdx: index("idx_ua_paths_kind").on(t.kind),
    lodDateIdx: index("idx_ua_paths_lod_date").on(t.lodTier, t.controlDate),
    geoIdx: index("idx_ua_paths_geo").on(t.minLat, t.maxLat, t.minLng, t.maxLng),
  }),
);

/** 우크라 사전계산 빌드 이력 */
export const ukraineControlBuilds = sqliteTable(
  "ukraine_control_builds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    controlDate: text("control_date").notNull(),
    lodTier: text("lod_tier").notNull(),
    pathCount: integer("path_count").notNull().default(0),
    zoneCount: integer("zone_count").notNull().default(0),
    source: text("source").default("viina-build"),
    builtAt: text("built_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    note: text("note"),
  },
  (t) => ({
    dateLodIdx: index("idx_ua_builds_date_lod").on(t.controlDate, t.lodTier),
  }),
);

/** GDELT Geo 스냅샷 (Cron ingest 호환) */
export const gdeltPoints = sqliteTable(
  "gdelt_points",
  {
    id: text("id").primaryKey(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    name: text("name"),
    url: text("url"),
    mentionCount: integer("mention_count"),
    shareImage: text("share_image"),
    queryTag: text("query_tag"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    ingestedIdx: index("idx_gdelt_ingested").on(t.ingestedAt),
    tagIdx: index("idx_gdelt_tag").on(t.queryTag),
    geoIdx: index("idx_gdelt_geo").on(t.lat, t.lng),
  }),
);

/**
 * 뉴스 스트림 전체 페이로드 스냅샷 (패키지·언어별).
 * `/api/news-stream` 이 RSS 재수집 대신 D1을 우선 읽어 렌더를 빠르게 한다.
 */
export const newsStreamSnapshots = sqliteTable(
  "news_stream_snapshots",
  {
    /** e.g. conflict-watch:ko | default:en */
    cacheKey: text("cache_key").primaryKey(),
    packages: text("packages"),
    lang: text("lang").notNull().default("ko"),
    /** JSON: NewsStreamPayload */
    payloadJson: text("payload_json").notNull(),
    itemCount: integer("item_count").notNull().default(0),
    tier1Count: integer("tier1_count").notNull().default(0),
    tier2Count: integer("tier2_count").notNull().default(0),
    tier3Count: integer("tier3_count").notNull().default(0),
    fetchedAt: text("fetched_at").notNull(),
    ingestedAt: text("ingested_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    fetchedIdx: index("idx_news_snap_fetched").on(t.fetchedAt),
    langIdx: index("idx_news_snap_lang").on(t.lang),
  }),
);

/**
 * 뉴스 티어별 개별 아이템 (스냅샷에서 펼친 행).
 * trust_tier = 1|2|3 (매체 신뢰도).
 */
export const newsStreamItems = sqliteTable(
  "news_stream_items",
  {
    /** `${cacheKey}:${itemId}:${role}` */
    id: text("id").primaryKey(),
    cacheKey: text("cache_key").notNull(),
    itemId: text("item_id").notNull(),
    trustTier: integer("trust_tier").notNull(),
    theater: text("theater"),
    title: text("title").notNull(),
    link: text("link").notNull(),
    source: text("source"),
    publisher: text("publisher"),
    pubDate: text("pub_date"),
    feedTopic: text("feed_topic"),
    econGenre: text("econ_genre"),
    category: text("category"),
    imageUrl: text("image_url"),
    summary: text("summary"),
    /** verified | stateMedia | hero */
    role: text("role").notNull().default("verified"),
    ingestedAt: text("ingested_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    cacheIdx: index("idx_news_items_cache").on(t.cacheKey),
    tierIdx: index("idx_news_items_tier").on(t.trustTier),
    theaterIdx: index("idx_news_items_theater").on(t.theater),
    ingestedIdx: index("idx_news_items_ingested").on(t.ingestedAt),
  }),
);

/** MarineTraffic / aisstream AIS 스냅샷 (Cron warm → D1) */
export const aisVessels = sqliteTable(
  "ais_vessels",
  {
    id: text("id").primaryKey(),
    mmsi: text("mmsi").notNull(),
    shipName: text("ship_name"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    sog: real("sog"),
    cog: real("cog"),
    trueHeading: real("true_heading"),
    shipType: integer("ship_type"),
    shipTypeLabel: text("ship_type_label"),
    category: text("category").notNull().default("other"),
    provider: text("provider"),
    timestamp: text("timestamp"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    ingestedIdx: index("idx_ais_ingested").on(t.ingestedAt),
    categoryIdx: index("idx_ais_category").on(t.category),
    geoIdx: index("idx_ais_geo").on(t.lat, t.lng),
  }),
);

/** ADS-B 군용·민간 스냅샷 (Cron warm → D1) */
export const adsbAircraft = sqliteTable(
  "adsb_aircraft",
  {
    id: text("id").primaryKey(),
    hex: text("hex").notNull(),
    /** mil | civ */
    mode: text("mode").notNull(),
    callsign: text("callsign"),
    registration: text("registration"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    altitude: real("altitude"),
    altitudeGeom: real("altitude_geom"),
    groundSpeed: real("ground_speed"),
    track: real("track"),
    type: text("type"),
    category: text("category"),
    dbFlags: integer("db_flags"),
    squawk: text("squawk"),
    emergency: text("emergency"),
    /** JSON: 나머지 MilitaryAircraft 필드 */
    payloadJson: text("payload_json"),
    hub: text("hub"),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    ingestedIdx: index("idx_adsb_ingested").on(t.ingestedAt),
    modeIdx: index("idx_adsb_mode").on(t.mode),
    geoIdx: index("idx_adsb_geo").on(t.lat, t.lng),
    hexIdx: index("idx_adsb_hex").on(t.hex),
  }),
);

/** 해저터널 정적 인프라 (시드 + 온디맨드 API) */
export const submarineTunnels = sqliteTable(
  "submarine_tunnels",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    startLat: real("start_lat"),
    startLng: real("start_lng"),
    endLat: real("end_lat"),
    endLng: real("end_lng"),
    country: text("country"),
    lengthKm: real("length_km"),
    riskNote: text("risk_note"),
    relatedTickers: text("related_tickers"),
    tier: integer("tier").notNull().default(1),
    ingestedAt: text("ingested_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    geoIdx: index("idx_tunnels_geo").on(t.lat, t.lng),
  }),
);

/**
 * 분쟁·중동(이란 등) 전선 빗금 사전계산.
 * disputes.json 기반 — 이란/이스라엘 IRONSIGHT 시드 포함.
 */
export const disputeHatchPaths = sqliteTable(
  "dispute_hatch_paths",
  {
    id: text("id").primaryKey(),
    disputeId: text("dispute_id").notNull(),
    kind: text("kind").notNull(),
    name: text("name"),
    accentColor: text("accent_color"),
    lodTier: text("lod_tier").notNull(),
    pointsJson: text("points_json").notNull(),
    pointCount: integer("point_count").notNull().default(0),
    minLat: real("min_lat"),
    minLng: real("min_lng"),
    maxLat: real("max_lat"),
    maxLng: real("max_lng"),
    builtAt: text("built_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    disputeIdx: index("idx_dispute_hatch_dispute").on(t.disputeId),
    lodIdx: index("idx_dispute_hatch_lod").on(t.lodTier),
    geoIdx: index("idx_dispute_hatch_geo").on(t.minLat, t.maxLat, t.minLng, t.maxLng),
  }),
);

export const disputeHatchBuilds = sqliteTable(
  "dispute_hatch_builds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lodTier: text("lod_tier").notNull(),
    pathCount: integer("path_count").notNull().default(0),
    disputeCount: integer("dispute_count").notNull().default(0),
    pathDisputeIdsJson: text("path_dispute_ids_json"),
    source: text("source").default("dispute-hatch-precompute"),
    builtAt: text("built_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    note: text("note"),
  },
  (t) => ({
    lodIdx: index("idx_dispute_hatch_builds_lod").on(t.lodTier),
  }),
);

/**
 * 동영상 뉴스 메타 스냅샷 (YouTube Atom → 제목·썸네일·URL만).
 * 본 `news_stream_*` 와 분리 — 클릭 재생용.
 */
export const videoNewsSnapshots = sqliteTable(
  "video_news_snapshots",
  {
    /** e.g. video:defense:ko | video:economy:en */
    cacheKey: text("cache_key").primaryKey(),
    topic: text("topic").notNull(),
    lang: text("lang").notNull().default("ko"),
    packages: text("packages"),
    /** JSON: VideoNewsPayload */
    payloadJson: text("payload_json").notNull(),
    itemCount: integer("item_count").notNull().default(0),
    fetchedAt: text("fetched_at").notNull(),
    ingestedAt: text("ingested_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    fetchedIdx: index("idx_video_news_fetched").on(t.fetchedAt),
    topicIdx: index("idx_video_news_topic").on(t.topic),
  }),
);

/**
 * 텔레그램 OSINT 라이브 속보 (Cloudflare cron 워커가 t.me 공개 채널 스크레이프 → D1).
 * 서버리스(Vercel/CF) 어디에 배포해도 방문자 모두 같은 피드를 본다.
 */
export const telegramAlerts = sqliteTable(
  "telegram_alerts",
  {
    /** `${channelUsername}/${postId}` */
    id: text("id").primaryKey(),
    channelUsername: text("channel_username").notNull(),
    channelTitle: text("channel_title"),
    /** ukraine | middle-east | global */
    region: text("region").notNull().default("global"),
    text: text("text").notNull(),
    messageUrl: text("message_url"),
    receivedAt: text("received_at").notNull(),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => ({
    receivedIdx: index("idx_tg_received").on(t.receivedAt),
    ingestedIdx: index("idx_tg_ingested").on(t.ingestedAt),
    regionIdx: index("idx_tg_region").on(t.region),
  }),
);

/**
 * 일간/주간/월간 회고 브리핑용 집계 (LLM 없음).
 * Cron이 매일 daily-* 스냅샷을 쌓고, weekly/monthly는 daily 합산.
 */
export const briefingPeriodStats = sqliteTable(
  "briefing_period_stats",
  {
    /** daily-YYYY-MM-DD | weekly-YYYY-Www | monthly-YYYY-MM */
    periodKey: text("period_key").primaryKey(),
    tier: text("tier").notNull(),
    gdeltCount: integer("gdelt_count").notNull().default(0),
    firmsCount: integer("firms_count").notNull().default(0),
    telegramCount: integer("telegram_count").notNull().default(0),
    newsItemCount: integer("news_item_count").notNull().default(0),
    topGdeltTag: text("top_gdelt_tag"),
    topTelegramRegion: text("top_telegram_region"),
    detailJson: text("detail_json"),
    windowStart: text("window_start"),
    windowEnd: text("window_end"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    tierIdx: index("idx_briefing_tier").on(t.tier),
    updatedIdx: index("idx_briefing_updated").on(t.updatedAt),
  }),
);

/**
 * 경량 UI 이벤트 로그 — 공유 버튼 등 바이럴 기능이 실제로 눌리는지 확인용.
 * 개인식별 정보 없음(세션/유저 식별자 저장 안 함). 순수 append-only 카운팅 목적.
 */
export const uiEvents = sqliteTable(
  "ui_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** e.g. share_view_click | friction_card_share_success | mobile_home_view_toggle */
    event: text("event").notNull(),
    /** JSON: 부가 메타(예: {"to":"globe"}) — 없으면 null */
    metaJson: text("meta_json"),
    viewerMode: text("viewer_mode"),
    lang: text("lang"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    eventIdx: index("idx_ui_events_event").on(t.event),
    createdIdx: index("idx_ui_events_created").on(t.createdAt),
  }),
);

/** Cron / 빌드 실행 로그 */
export const ingestRuns = sqliteTable("ingest_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  firmsCount: integer("firms_count").default(0),
  gdeltCount: integer("gdelt_count").default(0),
  ok: integer("ok").notNull().default(0),
  error: text("error"),
  detailJson: text("detail_json"),
});

/**
 * geo-risk-desk 라우터 — 감지된 지정학 리스크 이벤트 (diff 결과).
 * telegram_alerts 등 원본 스트림에서 라우터가 "새 이벤트"로 승격한 것만 여기 들어온다.
 * 원본 테이블은 upsert 덮어쓰기라 first-seen을 못 잡으므로, 이 테이블이 append-only로
 * first_seen_at을 소유한다(라우터 cursor의 진실 원천). D6: Telegram received_at diff가 소스.
 */
export const riskEvents = sqliteTable(
  "risk_events",
  {
    /** `${source}:${sourceRef}` 예: `telegram:disclosetv/12345` */
    id: text("id").primaryKey(),
    /** telegram | gdelt | ais | manual */
    source: text("source").notNull(),
    /** 원본 스트림의 행 id (telegram_alerts.id 등) */
    sourceRef: text("source_ref").notNull(),
    /** chokepoint_disruption | sanction | conflict_shift | infra_attack | other */
    eventClass: text("event_class").notNull().default("other"),
    geography: text("geography"),
    /** L1 | L2 | L3 (severity — L2+만 full 분석 승격) */
    severity: text("severity").notNull().default("L1"),
    summary: text("summary").notNull(),
    lat: real("lat"),
    lon: real("lon"),
    /** 2-source corroboration 게이트: 이 이벤트를 뒷받침한 독립 소스 수 */
    corroborationCount: integer("corroboration_count").notNull().default(1),
    /** ★ append-only first-seen (라우터 cursor). 재관측돼도 안 바뀐다. */
    firstSeenAt: text("first_seen_at").notNull(),
    /** detected | analyzed | dismissed */
    status: text("status").notNull().default("detected"),
  },
  (t) => ({
    firstSeenIdx: index("idx_re_first_seen").on(t.firstSeenAt),
    statusIdx: index("idx_re_status").on(t.status),
    classIdx: index("idx_re_class").on(t.eventClass),
  }),
);

/**
 * geo-risk-desk 라우터 — Claude 방향성 판정 출력.
 * exposures_json은 EconInsightBrief.marketLinks 계약과 동형
 * ([{ ticker, direction: up|down|watch, rationale, verified }]) — 카드가 바로 렌더 가능.
 * D2 Hybrid: direction/rationale는 무료 데이터 기반 real, portfolio_delta 등 정밀 숫자는
 * 유료 MCP 전까지 mock이며 verified=false("unverified" 회색 처리)로 정직하게 구분한다.
 */
export const riskAnalyses = sqliteTable(
  "risk_analyses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** risk_events.id */
    eventId: text("event_id").notNull(),
    /** JSON: [{ ticker, direction, rationale, verified }] — marketLinks 동형 */
    exposuresJson: text("exposures_json").notNull(),
    /** 포트폴리오 영향 추정치 (D2: 유료 데이터 전까지 mock) */
    portfolioDelta: real("portfolio_delta"),
    /** grounding: exposures가 검증된 소스에서 왔는지 (false=unverified 회색) */
    verified: integer("verified").notNull().default(0),
    /** 판정에 쓴 모델 (예: claude-sonnet-4-6) */
    model: text("model"),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    eventIdx: index("idx_ra_event").on(t.eventId),
    createdIdx: index("idx_ra_created").on(t.createdAt),
  }),
);

export type FirmsFireRow = typeof firmsFires.$inferSelect;
export type NewFirmsFireRow = typeof firmsFires.$inferInsert;
export type UkraineControlPathRow = typeof ukraineControlPaths.$inferSelect;
export type NewUkraineControlPathRow = typeof ukraineControlPaths.$inferInsert;
export type UkraineControlBuildRow = typeof ukraineControlBuilds.$inferSelect;
export type NewsStreamSnapshotRow = typeof newsStreamSnapshots.$inferSelect;
export type NewsStreamItemRow = typeof newsStreamItems.$inferSelect;
export type VideoNewsSnapshotRow = typeof videoNewsSnapshots.$inferSelect;
export type AisVesselRow = typeof aisVessels.$inferSelect;
export type AdsbAircraftRow = typeof adsbAircraft.$inferSelect;
export type SubmarineTunnelRow = typeof submarineTunnels.$inferSelect;
export type DisputeHatchPathRow = typeof disputeHatchPaths.$inferSelect;
export type NewDisputeHatchPathRow = typeof disputeHatchPaths.$inferInsert;
export type TelegramAlertRow = typeof telegramAlerts.$inferSelect;
export type NewTelegramAlertRow = typeof telegramAlerts.$inferInsert;
export type BriefingPeriodStatsRow = typeof briefingPeriodStats.$inferSelect;
export type NewBriefingPeriodStatsRow = typeof briefingPeriodStats.$inferInsert;
export type UiEventRow = typeof uiEvents.$inferSelect;
export type NewUiEventRow = typeof uiEvents.$inferInsert;
export type RiskEventRow = typeof riskEvents.$inferSelect;
export type NewRiskEventRow = typeof riskEvents.$inferInsert;
export type RiskAnalysisRow = typeof riskAnalyses.$inferSelect;
export type NewRiskAnalysisRow = typeof riskAnalyses.$inferInsert;
