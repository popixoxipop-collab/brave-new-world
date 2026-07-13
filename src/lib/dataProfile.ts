import type { DataProfile } from "@/lib/runtimeConfig.types";
import { getRuntimeConfig } from "@/lib/runtimeConfig.client";

export type { DataProfile } from "@/lib/runtimeConfig.types";

/** 클라이언트 런타임 설정 — 서버는 getServerDataProfile() 사용 */
export function getDataProfile(): DataProfile {
  return getRuntimeConfig().dataProfile;
}

/** 프로필별 JSON 경로 — CDN 있으면 CDN, 없으면 /data/{profile}/… */
export function dataPath(relativePath: string): string {
  const profile = getDataProfile();
  const normalized = relativePath.replace(/^\//, "");
  const local = `/data/${profile}/${normalized}`;
  const cdn = getRuntimeConfig().dataCdnBase?.replace(/\/$/, "");
  if (!cdn) return local;
  return `${cdn}/data/${profile}/${normalized}`;
}

export function isFullDataProfile(): boolean {
  return getDataProfile() === "full";
}
