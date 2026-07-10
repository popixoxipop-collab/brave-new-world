import type { FirmsFire } from "@/data/geoTypes";

const DEFAULT_SOURCE = "VIIRS_SNPP_NRT";

export function getFirmsMapKey(): string | null {
  const key = process.env.FIRMS_MAP_KEY?.trim();
  return key || null;
}

export function isFirmsLiveEnabled(): boolean {
  return getFirmsMapKey() !== null;
}

export function parseFirmsCsv(csv: string, maxCount = 2000): FirmsFire[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
  const latIdx = header.indexOf("latitude");
  const lngIdx = header.indexOf("longitude");
  if (latIdx < 0 || lngIdx < 0) return [];

  const frpIdx = header.indexOf("frp");
  const brightIdx = header.indexOf("brightness");
  const confIdx = header.indexOf("confidence");
  const dateIdx = header.indexOf("acq_date");
  const timeIdx = header.indexOf("acq_time");
  const satIdx = header.indexOf("satellite");
  const dnIdx = header.indexOf("daynight");

  const fires: FirmsFire[] = [];
  for (let i = 1; i < lines.length && fires.length < maxCount; i += 1) {
    const cols = lines[i].split(",");
    const lat = Number(cols[latIdx]);
    const lng = Number(cols[lngIdx]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const acqDate = dateIdx >= 0 ? cols[dateIdx]?.trim() || null : null;
    const acqTime = timeIdx >= 0 ? cols[timeIdx]?.trim() || null : null;
    const frpRaw = frpIdx >= 0 ? Number(cols[frpIdx]) : NaN;

    fires.push({
      id: `firms-${acqDate || "na"}-${acqTime || i}-${lat.toFixed(3)}-${lng.toFixed(3)}`,
      lat,
      lng,
      frp: Number.isFinite(frpRaw) ? frpRaw : null,
      brightness: brightIdx >= 0 ? Number(cols[brightIdx]) || null : null,
      confidence: confIdx >= 0 ? cols[confIdx]?.trim() || null : null,
      acqDate,
      acqTime,
      satellite: satIdx >= 0 ? cols[satIdx]?.trim() || null : null,
      daynight: dnIdx >= 0 ? cols[dnIdx]?.trim() || null : null,
    });
  }

  return fires;
}

export function buildFirmsAreaUrl(options: {
  mapKey: string;
  west: number;
  south: number;
  east: number;
  north: number;
  dayRange?: number;
  source?: string;
}) {
  const {
    mapKey,
    west,
    south,
    east,
    north,
    dayRange = 1,
    source = DEFAULT_SOURCE,
  } = options;
  const bbox = `${west},${south},${east},${north}`;
  const days = Math.min(5, Math.max(1, dayRange));
  return `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bbox}/${days}`;
}

export function clampBbox(west: number, south: number, east: number, north: number) {
  return {
    west: Math.max(-180, Math.min(180, west)),
    south: Math.max(-90, Math.min(90, south)),
    east: Math.max(-180, Math.min(180, east)),
    north: Math.max(-90, Math.min(90, north)),
  };
}
