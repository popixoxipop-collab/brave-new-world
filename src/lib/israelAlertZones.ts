import zones from "@/data/israel-oref-zones.json";

type ZoneEntry = { name: string; lat: number; lng: number };

const ZONE_LIST = zones as ZoneEntry[];

/** Pikud HaOref 히브리 지역명 → 대략 좌표 (부분 일치) */
export function geocodeOrefRegion(region: string): { lat: number; lng: number } {
  const normalized = region.trim();
  if (!normalized) return israelFallback(normalized);

  const exact = ZONE_LIST.find((z) => z.name === normalized);
  if (exact) return { lat: exact.lat, lng: exact.lng };

  const partial = ZONE_LIST.find(
    (z) => normalized.includes(z.name) || z.name.includes(normalized),
  );
  if (partial) return { lat: partial.lat, lng: partial.lng };

  const token = normalized.split(/[-–]/)[0]?.trim();
  if (token) {
    const byToken = ZONE_LIST.find((z) => z.name.startsWith(token) || token.startsWith(z.name));
    if (byToken) return { lat: byToken.lat, lng: byToken.lng };
  }

  return israelFallback(normalized);
}

function israelFallback(seed: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const t = Math.abs(hash);
  return {
    lat: 31.0 + (t % 180) / 600,
    lng: 34.3 + ((t >> 8) % 220) / 600,
  };
}
