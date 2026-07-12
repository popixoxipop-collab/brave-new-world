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
    source: "adsb.fi open data",
    url: "/api/adsb-mil",
    cadence: "On demand (≤1 req/s upstream)",
    attribution: "adsb.fi",
    notes: "Military aircraft positions via opendata.adsb.fi /v2/mil (ADSBexchange v2 compatible).",
    status: "shipped",
    ingest: "live-poll",
  },
  {
    layerId: "firms-fires",
    source: "NASA FIRMS (VIIRS NRT)",
    url: "/api/firms-fires",
    cadence: "3 min (TTL) · viewport bbox",
    attribution: "NASA FIRMS",
    notes:
      "Near-real-time satellite fire detections (VIIRS SNPP NRT). Queries current map viewport bounding box.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "tzeva-adom",
    source: "Pikud HaOref (unofficial JSON)",
    url: "/api/tzeva-adom",
    cadence: "3s poll (TZEVA_ADOM_POLL_MS)",
    attribution: "Israel Home Front Command (Oref)",
    notes:
      "Tzeva Adom rocket/missile alerts via AlertsHistory.json — same feed as DavidTheExplorer/Tzeva-Adom-API. Geo-restricted to Israeli IP; use OREF_HISTORY_URL proxy abroad.",
    status: "shipped",
    ingest: "live-poll",
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
    attribution: "Conflict View editorial",
    notes:
      "Maritime chokepoints (Suez, Hormuz, Malacca, etc.) and critical logistics hubs (Eurotunnel, Crimea bridge). Hover shows risk note and related macro tickers.",
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
      "Macro, energy, shipping, and sanctions headlines for geo-trader view. Fetched via feedCatalog ALL_ECON_FEEDS with ECON_RELEVANCE filter.",
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
    source: "IRONSIGHT regionBoxes + regional tension seeds",
    url: "/data/{profile}/app-data.json",
    cadence: "Build (merge-regional-tensions)",
    attribution: "Copyright (c) 2026 Nobler Works · MIT License (IRONSIGHT reference)",
    notes:
      "Middle East combat/tension hatch boxes aligned to IRONSIGHT iran-israel.ts regionBoxes and strikeLocations. Hatch rendering via disputeHatch.ts.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "viina-ukraine-control",
    source: "VIINA",
    url: "(rendering only — no public API)",
    cadence: "Build from vendor/VIINA (gitignored render cache)",
    attribution: "VIINA · Open Database License (ODbL) v1.0",
    notes:
      "Ukraine territorial control for globe rendering only (ODbL Produced Work). Loaded server-side from private/viina-render; no public API, GeoJSON export, or bulk static distribution. See docs/copyright-checklist.md and src/lib/licensing/viinaPolicy.ts.",
    status: "shipped",
    ingest: "static-build",
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
