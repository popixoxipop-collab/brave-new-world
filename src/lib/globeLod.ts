export type GlobeLodTier = "global" | "continent" | "regional" | "near" | "village";

export type GlobeLod = {
  tier: GlobeLodTier;
  label: string;
  radiusDeg: number;
};

const LABELS: Record<GlobeLodTier, string> = {
  global: "전역",
  continent: "대륙",
  regional: "지역",
  near: "근접",
  village: "도시와 마을",
};

const RADIUS_DEG: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 28,
  regional: 16,
  near: 8,
  village: 2.2,
};

export function getGlobeLod(altitude: number): GlobeLod {
  let tier: GlobeLodTier;
  if (altitude > 1.65) tier = "global";
  else if (altitude > 1.1) tier = "continent";
  else if (altitude > 0.72) tier = "regional";
  else if (altitude > 0.28) tier = "near";
  else tier = "village";

  return { tier, label: LABELS[tier], radiusDeg: RADIUS_DEG[tier] };
}

export function getGlobeLodLabel(altitude: number): string {
  return getGlobeLod(altitude).label;
}
