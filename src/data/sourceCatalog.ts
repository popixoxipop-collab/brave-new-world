export interface NewsLayerSourceNote {
  layerId: string;
  source: string;
  url: string;
  cadence: string;
  attribution: string;
  notes: string;
  status: "shipped" | "planned";
  ingest: "static-build" | "cached-api" | "live-poll" | "mapped-existing";
}

/** 주요 실시간 출처 — 자료출처 패널 상단·도움말에 고정 표기 */
export type PrimaryLiveSource = {
  id: "nasa-firms" | "adsb" | "marinetraffic";
  nameKo: string;
  nameEn: string;
  product: string;
  url: string;
  layers: string;
  noteKo: string;
};

export const PRIMARY_LIVE_SOURCES: PrimaryLiveSource[] = [
  {
    id: "nasa-firms",
    nameKo: "NASA FIRMS",
    nameEn: "NASA Fire Information for Resource Management System",
    product: "VIIRS NRT (NOAA-20 / SNPP)",
    url: "https://firms.modaps.eosdis.nasa.gov/",
    layers: "위성 화재·폭격 추정 (/api/firms-fires)",
    noteKo:
      "근실시간 위성 열원 탐지. Cron → D1 → 공개 /firms 폴백. 지도 표기: NASA FIRMS.",
  },
  {
    id: "adsb",
    nameKo: "ADS-B",
    nameEn: "Automatic Dependent Surveillance–Broadcast",
    product: "adsb.lol · airplanes.live · ADSBexchange / adsb.fi",
    url: "https://www.adsbexchange.com/",
    layers: "군용기·민간 항적 (/api/adsb-mil, /api/adsb-traffic)",
    noteKo:
      "ADS-B 항적. 워커는 Worker IP 호환 소스(adsb.lol 등) 우선, 키 있으면 ADSBexchange. 지도 표기: ADS-B.",
  },
  {
    id: "marinetraffic",
    nameKo: "MarineTraffic",
    nameEn: "MarineTraffic AIS",
    product: "exportvessels · aisstream.io 폴백",
    url: "https://www.marinetraffic.com/",
    layers: "선박 AIS (/api/ais)",
    noteKo:
      "민간 화물·탱커·여객 등. MarineTraffic 키 실패 시 AISstream 폴백. 지도 표기: MarineTraffic · AIS.",
  },
];

/**
 * Conflict-view adapted source catalog.
 * URLs map to `/data/{profile}/*.json` static assets or `/api/*` routes in this app.
 */
export const NEWS_LAYER_SOURCE_CATALOG: NewsLayerSourceNote[] = [
  // Dynamic / real-time layers
  {
    layerId: "intel-hotspots",
    source: "Configurable GeoJSON feed",
    url: "/api/intel-hotspots",
    cadence: "Configured",
    attribution: "External provider",
    notes:
      "Intel/security hotspot events from a configurable GeoJSON endpoint (INTEL_HOTSPOTS_URL).",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "conflict-zones",
    source: "AI war-zone demo (local heuristics)",
    url: "/api/layers/conflict-zones",
    cadence: "2 min (120s TTL)",
    attribution: "Natural Earth + GDELT war clustering",
    notes:
      "Demo mode: no external AI API. Heuristically detects war zones from territorial disputes and recent combat news density.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "military-activity",
    source: "ADS-B (군용기)",
    url: "/api/adsb-mil",
    cadence: "Cron warm ~10m · toggle on-demand D1",
    attribution: "ADS-B · adsb.lol / airplanes.live / ADSBexchange / adsb.fi",
    notes:
      "Military aircraft via ADS-B. Cron → D1 `adsb_aircraft` (mode=mil). User toggle reads D1 first; ?live=1 forces upstream.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "air-traffic",
    source: "ADS-B (민간 항적)",
    url: "/api/adsb-traffic",
    cadence: "Cron hub warm ~10m · toggle on-demand D1",
    attribution: "ADS-B · adsb.lol / airplanes.live / ADSBexchange / adsb.fi",
    notes:
      "Civilian ADS-B traffic (exclude dbFlags&1). Cron warms hub grids into D1; viewport query prefers D1 bbox then live.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "ais",
    source: "MarineTraffic (AIS)",
    url: "/api/ais",
    cadence: "Cron ~10m · toggle on-demand D1",
    attribution: "MarineTraffic · aisstream.io",
    notes:
      "Commercial AIS via MarineTraffic → D1 `ais_vessels`. Toggle reads D1 first; AISstream live fallback when MT unavailable.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "tunnels",
    source: "Conflict View submarine tunnel seed → D1",
    url: "/api/submarine-tunnels",
    cadence: "On demand (seeded once)",
    attribution: "Conflict View logistics seed",
    notes:
      "Major undersea tunnels (Eurotunnel, Seikan, Marmaray, …). Stored in D1 `submarine_tunnels`; fetched only when layer toggled ON.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "firms-fires",
    source: "NASA FIRMS (VIIRS NRT)",
    url: "/api/firms-fires",
    cadence: "Cron ~10m · viewport bbox",
    attribution: "NASA FIRMS",
    notes:
      "Near-real-time satellite fire detections (VIIRS NOAA-20 / SNPP NRT). Cron → D1 → /api/firms-fires. Map attribution: NASA FIRMS.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "tzeva-adom",
    source: "Pikud HaOref (unofficial JSON)",
    url: "/api/tzeva-adom",
    cadence: "Client poll only while showTzevaAdom ON (stub 3s / live 15s); server cache ~2.5s",
    attribution: "Israel Home Front Command (Oref)",
    notes:
      "Tzeva Adom rocket/missile alerts via AlertsHistory.json — same feed as DavidTheExplorer/Tzeva-Adom-API. Geo-restricted to Israeli IP; use OREF_HISTORY_URL proxy abroad.",
    status: "shipped",
    ingest: "live-poll",
  },
  {
    layerId: "newfeeds-iran",
    source: "NewFeeds (ktoetotam/NewFeeds)",
    url: "/api/newfeeds-attacks?iran=1 · news via /api/news-stream",
    cadence: "5 min cache · attacks map + iran.json → bottom breaking",
    attribution:
      "NewFeeds · https://github.com/ktoetotam/NewFeeds (MIT) — underlying outlets retained per article",
    notes:
      "Iran-related geocoded attack/military events on the map (layer toggle). Iran state/regional headlines merge into /api/news-stream as Tier-3 state media and compete for the bottom breaking hero. Always credit NewFeeds when displayed.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "neptun",
    source: "NEPTUN (neptun.in.ua)",
    url: "/api/neptun",
    cadence: "WebSocket stream · REST fallback 5s",
    attribution: "NEPTUN — Карта повітряних тривог України",
    notes:
      "Ukraine air threats (UAV, missile, KAB) and official air-raid alerts. Free public API, no key. Not an official alert system — informational only.",
    status: "shipped",
    ingest: "live-poll",
  },
  {
    layerId: "ucdp-events",
    source: "UCDP GED",
    url: "/data/{profile}/ucdp-events.json",
    cadence: "Annual / point releases",
    attribution: "Uppsala Conflict Data Program (UCDP)",
    notes:
      "Verified (fatality-coded) organized violence events. Research-grade data from the UCDP Georeferenced Event Dataset (GED). Each event requires at least one recorded fatality.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "space-launches",
    source: "The Space Devs (LL2)",
    url: "/api/space-launches",
    cadence: "1 hour",
    attribution: "The Space Devs",
    notes: "Recent orbital launches via Launch Library 2 free tier.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "cyber-incidents",
    source: "GDELT Geo 2.0",
    url: "/api/gdelt?theme=cyber",
    cadence: "2 minutes",
    attribution: "GDELT Project",
    notes: "Cyber attack / ransomware events via GDELT theme query.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "election-events",
    source: "GDELT Geo 2.0",
    url: "/api/gdelt?theme=election",
    cadence: "2 hours",
    attribution: "GDELT Project",
    notes: "Election, vote, referendum events via GDELT.",
    status: "shipped",
    ingest: "cached-api",
  },

  // Static / mapped-existing layers
  {
    layerId: "military-bases",
    source: "Static build",
    url: "/data/{profile}/military-bases.json",
    cadence: "Project versioned",
    attribution: "OpenStreetMap / public datasets",
    notes: "Major military installations worldwide (static profile JSON).",
    status: "shipped",
    ingest: "mapped-existing",
  },
  {
    layerId: "nuclear-sites",
    source: "Static build",
    url: "/data/{profile}/nuclear-sites.json",
    cadence: "Project versioned",
    attribution: "IAEA / NTI / public datasets",
    notes: "Nuclear power plants and research reactors.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "ai-data-centers",
    source: "Local build + Wikidata SPARQL",
    url: "/api/layers/ai-data-centers",
    cadence: "4 hours",
    attribution: "Wikidata (CC0) / OpenStreetMap contributors (ODbL)",
    notes:
      "AI/cloud data center clusters from Wikidata entities and OSM facilities. Deterministic confidence and importance scoring. Clusters merge nearby sites within 50 km.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "trade-routes",
    source: "Static build",
    url: "/data/{profile}/shipping-lanes.json",
    cadence: "Project versioned",
    attribution: "IMO / public datasets",
    notes: "Major global maritime trade routes (mapped to shipping-lanes).",
    status: "shipped",
    ingest: "mapped-existing",
  },
  {
    layerId: "logistics-risk",
    source: "Curated seed",
    url: "src/data/logisticsRiskPoints.ts",
    cadence: "Project versioned",
    attribution: "멋진 신세계 editorial",
    notes:
      "Maritime chokepoints (Suez, Hormuz, Malacca, etc.) and critical logistics hubs (Eurotunnel, Crimea bridge). Hover shows risk note and related macro tickers.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "critical-nodes",
    source: "Critical Node Atlas (EkoA/chokepoints-project)",
    url: "src/data/vendor/chokepoints-nodes.json",
    cadence: "Project versioned (upstream MIT)",
    attribution: "Critical Node Atlas · MIT License",
    notes:
      "31 strategic chokepoints across maritime, cables, energy, financial, and tech layers. Shared by conflict and economy modes.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "oil-pipelines",
    source: "Global Energy Monitor (GEM)",
    url: "/data/{profile}/oil-pipelines.json",
    cadence: "Static build (GEM 2026-06)",
    attribution: "Global Energy Monitor (CC BY 4.0)",
    notes: "Oil and NGL pipeline segments from GEM GOIT tracker.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "gas-pipelines",
    source: "Global Energy Monitor (GEM)",
    url: "/data/{profile}/gas-pipelines.json",
    cadence: "Static build (GEM 2025-11)",
    attribution: "Global Energy Monitor (CC BY 4.0)",
    notes: "Gas transmission pipelines from GEM GGIT tracker.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "lng-terminals",
    source: "Global Energy Monitor (GEM)",
    url: "/data/{profile}/lng-terminals.json",
    cadence: "Static build (GEM 2025-09)",
    attribution: "Global Energy Monitor (CC BY 4.0)",
    notes: "LNG import/export terminal points from GEM GGIT.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "economic-centers",
    source: "Local build + World Bank context",
    url: "/api/layers/economic-centers",
    cadence: "4 hours",
    attribution:
      "Wikidata (CC0) / OpenStreetMap contributors (ODbL) / World Bank Open Data (CC BY 4.0)",
    notes:
      "Major global economic hubs scored by finance infrastructure, trade gateway presence, urban scale, and country GDP.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "world-stats",
    source: "Statistics of the World API",
    url: "/api/world-stats/countries",
    cadence: "1 hour cache (API Pro)",
    attribution: "Statistics of the World · World Bank WDI / IMF (provider terms apply)",
    notes:
      "Country GDP·population·trade·defense·inflation·growth cards for econ insight parchment and region panel. History shock + peer compare. Proxied with STATSOFTHEWORLD_API_KEY. Routes: /macro, /market-lamp, /compare, /rankings, /history. Bulk CSV: statisticsoftheworld.com/data.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "critical-minerals",
    source: "Static build (mapped to resources)",
    url: "/data/{profile}/resources.json",
    cadence: "Project versioned",
    attribution: "USGS / public datasets",
    notes: "Key critical mineral deposits and processing sites (mapped to resources).",
    status: "shipped",
    ingest: "mapped-existing",
  },
  {
    layerId: "internet-exchanges",
    source: "Static build",
    url: "/data/{profile}/internet-exchanges.json",
    cadence: "Project versioned",
    attribution: "PeeringDB / public",
    notes: "Internet exchange points (IXPs).",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "sanctions-entities",
    source: "OFAC SDN + UN + EU + UK",
    url: "/api/layers/sanctions-entities",
    cadence: "Daily (24h cache)",
    attribution: "US Treasury OFAC / UN Security Council / EU / UK Gov",
    notes:
      "Sanctioned individuals, organizations, vessels, aircraft from official bulk downloads with hybrid live-fetch + snapshot fallback.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "refugee-camps",
    source: "Static build",
    url: "/data/{profile}/refugee-camps.json",
    cadence: "Project versioned",
    attribution: "UNHCR / public datasets",
    notes: "Major UNHCR-registered refugee settlements and camps.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "arms-embargo-zones",
    source: "Official lists · local build",
    url: "/api/layers/arms-embargo-zones",
    cadence: "Daily (24h cache)",
    attribution: "UN / EU / UK / US + Wikidata",
    notes:
      "Country-level arms embargo zones from official sources with Wikidata SPARQL fallback.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "news-economy-rss",
    source: "Reuters / WSJ / CNBC / FT / Google News",
    url: "/api/news-stream?packages=geo-trader",
    cadence: "90s cache",
    attribution: "Each outlet RSS terms",
    notes:
      "Major-industry & company headlines for geo-trader: Big Tech/AI, semis (Nvidia·TSMC·ASML), EV/batteries, oil majors, shipping lines, plus market wires. Fetched via ALL_ECON_FEEDS.",
    status: "shipped",
    ingest: "live-poll",
  },
  {
    layerId: "telegram-osint",
    source: "IRONSIGHT (Nobler Works)",
    url: "/api/telegram-alerts",
    cadence: "Embed scrape · sync on demand",
    attribution: "Copyright (c) 2026 Nobler Works · MIT License",
    notes:
      "Public Telegram channel catalog derived from IRONSIGHT (MIT). Post content belongs to channel operators; viewer-only, not in LLM pipeline. See src/lib/licensing/ironsightPolicy.ts.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "app-data",
    source: "Natural Earth + GDELT build",
    url: "/api/data-stream?file=app-data.json",
    cadence: "Static build · stream on demand",
    attribution: "Natural Earth · GDELT",
    notes:
      "Manifest app-data.json + countries/disputes/places chunks. First paint loads countries+disputes only; places.json deferred. gzip: npm run data:compress.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "dispute-zones-me",
    source: "IRONSIGHT regionBoxes → disputes.json → D1 hatch",
    url: "/api/render/dispute-paths",
    cadence: "Build / Cron warm · toggle on-demand D1",
    attribution: "Copyright (c) 2026 Nobler Works · MIT License (IRONSIGHT reference)",
    notes:
      "Middle East combat/tension boxes (IRONSIGHT iran-israel) merged into disputes.json. Hatch precomputed to D1 `dispute_hatch_paths`; client fetches on war/diplomatic toggle only.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "viina-ukraine-control",
    source: "VIINA → D1 hatch snapshot",
    url: "/api/render/ukraine-control-paths",
    cadence: "Build / Cron warm · toggle on-demand D1",
    attribution: "VIINA · Open Database License (ODbL) v1.0",
    notes:
      "Ukraine control hatch precomputed (`ukraine:hatch:build`) into D1. Globe toggles fetch snapshot paths only — no client geometry hatch. VIINA raw stays private.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "mediazona-casualties",
    source: "Mediazona × BBC (KIA) · CSIS estimate (WIA)",
    url: "/api/mediazona-casualties",
    cadence: "Homepage scrape · 1h cache · Kaggle panel seed fallback",
    attribution: "Mediazona · BBC Russian Service · CSIS (WIA est.) · Meduza",
    notes:
      "Geopolitics-only globe overlay: skull + killed (named lower bound), wounded icon + CSIS-derived estimate. Screen-scaled by altitude. No layer checkbox. Cite originals, not the Kaggle compilation.",
    status: "shipped",
    ingest: "cached-api",
  },
];

export function getSourceNote(layerId: string): NewsLayerSourceNote | undefined {
  return NEWS_LAYER_SOURCE_CATALOG.find((note) => note.layerId === layerId);
}

/** attribution · cadence caption for UI source lines */
export function catalogCaption(layerId: string): string {
  const note = getSourceNote(layerId);
  if (!note) return "";
  return `${note.attribution} · ${note.cadence}`;
}
