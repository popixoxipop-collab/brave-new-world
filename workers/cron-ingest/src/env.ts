/** Cloudflare Worker bindings for conflict-view-ingest */

export type IngestEnv = {
  DB: D1Database;
  /** NASA FIRMS map key — set via `wrangler secret put NASA_FIRMS_API_KEY` */
  NASA_FIRMS_API_KEY?: string;
  FIRMS_MAP_KEY?: string;
  /** Optional bearer for manual HTTP trigger */
  INGEST_CRON_SECRET?: string;
  /**
   * Next 앱의 뉴스 워밍 URL.
   * 예: https://your-app.example/api/news-stream/warm
   * 설정 시 Cron이 FIRMS/GDELT 직후 POST로 D1 뉴스 스냅샷을 채운다.
   */
  NEWS_WARM_URL?: string;
  /**
   * Next 동영상 뉴스 워밍 URL (YouTube Atom 메타 → D1)
   * 예: https://your-app.example/api/video-news/warm
   */
  VIDEO_NEWS_WARM_URL?: string;
  /**
   * Next AIS 워밍 URL (MarineTraffic → D1)
   * 예: https://your-app.example/api/ais/warm
   */
  AIS_WARM_URL?: string;
  /**
   * Next ADS-B 워밍 URL (mil + civ hubs → D1)
   * 예: https://your-app.example/api/adsb/warm
   */
  ADSB_WARM_URL?: string;
  /**
   * Next 해저터널 시드 워밍
   * 예: https://your-app.example/api/submarine-tunnels/warm
   */
  TUNNELS_WARM_URL?: string;
  /**
   * 분쟁·중동(이란) 전선 hatch 재빌드
   * 예: https://your-app.example/api/render/dispute-paths?lod=overview
   * (POST — overview/detail 각각 또는 Cron이 두 번 호출)
   */
  DISPUTE_HATCH_WARM_URL?: string;
  /**
   * 우크라 전선 hatch 재빌드 (VIINA 캐시가 앱 서버에 있을 때만)
   * 예: https://your-app.example/api/render/ukraine-control-paths?lod=overview
   */
  UKRAINE_HATCH_WARM_URL?: string;
  FIRMS_DAY_RANGE?: string;
  FIRMS_MAX_PER_THEATER?: string;
  GDELT_MAX_POINTS?: string;
  RETENTION_HOURS?: string;
  /** 텔레그램 스크레이프 최대 속보 수 (기본 200) */
  TELEGRAM_MAX_ALERTS?: string;
  /** "false"/"0" 이면 텔레그램 스크레이프 비활성 */
  TELEGRAM_INGEST_ENABLED?: string;
};

export type FirmsFireRow = {
  id: string;
  lat: number;
  lng: number;
  frp: number | null;
  brightness: number | null;
  confidence: string | null;
  acq_date: string | null;
  acq_time: string | null;
  satellite: string | null;
  daynight: string | null;
  source: string;
  theater: string;
};

export type GdeltPointRow = {
  id: string;
  lat: number;
  lng: number;
  name: string | null;
  url: string | null;
  mention_count: number | null;
  share_image: string | null;
  query_tag: string;
};

export type TelegramAlertRow = {
  id: string;
  channel_username: string;
  channel_title: string | null;
  region: string;
  text: string;
  message_url: string | null;
  received_at: string;
};
