import type { AppDataLoadProgress } from "@/lib/fetchAppDataStream";

/** 번들 로딩 구간 상한 (%) */
export const BUNDLE_PROGRESS_CAP = 18;

export function appDataProgressPercent(progress: AppDataLoadProgress | null): number {
  if (!progress) return 0;
  if (progress.phase === "ready") return 100;
  if (progress.contentLength && progress.contentLength > 0) {
    return Math.min(
      100,
      Math.round((progress.bytesReceived / progress.contentLength) * 100),
    );
  }
  if (progress.bytesReceived > 0) {
    return Math.min(88, Math.round(progress.bytesReceived / 4096));
  }
  return progress.phase === "parsing" ? 72 : 8;
}

export function computeDashboardBootProgress(opts: {
  globeReady: boolean;
  isLoading: boolean;
  appDataLoadProgress: AppDataLoadProgress | null;
}): number {
  const dataPct = opts.isLoading ? appDataProgressPercent(opts.appDataLoadProgress) : 100;
  const globePct = opts.globeReady ? 100 : 0;

  // 엔진 35% + 데이터 65%
  return Math.round(globePct * 0.35 + dataPct * 0.65);
}

export function combineBootProgress(bundlePct: number, dashboardPct: number, bundleReady: boolean): number {
  if (!bundleReady) return Math.min(BUNDLE_PROGRESS_CAP, Math.round(bundlePct));
  const scaled = BUNDLE_PROGRESS_CAP + (dashboardPct / 100) * (100 - BUNDLE_PROGRESS_CAP);
  return Math.min(100, Math.round(scaled));
}
