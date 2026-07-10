import type { GlobeLodTier } from "@/lib/globeLod";

export const SHIPPING_LANE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 0,
  regional: 120,
  near: 200,
  village: 400,
};

export const STATIC_POINT_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 0,
  continent: 80,
  regional: 300,
  near: 800,
  village: 2000,
};

/** 미군기지 부지 폴리곤 — 줌에 따라 면적 큰 기지부터 */
export const MILITARY_BASE_AREA_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 160,
  continent: 280,
  regional: 420,
  near: 650,
  village: 900,
};

export const SUBMARINE_CABLE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 120,
  continent: 200,
  regional: 400,
  near: 800,
  village: 1500,
};

export const OIL_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 40,
  continent: 80,
  regional: 160,
  near: 320,
  village: 600,
};

export const GAS_PIPELINE_MAX_BY_TIER: Record<GlobeLodTier, number> = {
  global: 60,
  continent: 120,
  regional: 240,
  near: 480,
  village: 900,
};
