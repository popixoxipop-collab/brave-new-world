import { getGlobeLod, type GlobeLodTier } from "@/lib/globeLod";

export type TransportLod = {
  label: string;
  radiusDeg: number;
  railMaxScalerank: number;
  arterialMaxRank: number;
  maxRailroads: number;
};

const LIMITS: Record<GlobeLodTier, Omit<TransportLod, "label" | "radiusDeg">> = {
  global: {
    railMaxScalerank: 2,
    arterialMaxRank: 2,
    maxRailroads: 480,
  },
  continent: {
    railMaxScalerank: 5,
    arterialMaxRank: 2,
    maxRailroads: 900,
  },
  regional: {
    railMaxScalerank: 8,
    arterialMaxRank: 3,
    maxRailroads: 1000,
  },
  near: {
    railMaxScalerank: 99,
    arterialMaxRank: 99,
    maxRailroads: 2200,
  },
  village: {
    railMaxScalerank: 99,
    arterialMaxRank: 99,
    maxRailroads: 3500,
  },
};

export function getTransportLod(altitude: number): TransportLod {
  const { label, radiusDeg, tier } = getGlobeLod(altitude);
  return { label, radiusDeg, ...LIMITS[tier] };
}
