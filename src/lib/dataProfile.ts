export type DataProfile = "lite" | "full";

export function getDataProfile(): DataProfile {
  const env = process.env.NEXT_PUBLIC_DATA_PROFILE;
  if (env === "full") return "full";
  if (env === "lite") return "lite";
  return "lite";
}

/** 프로필별 JSON 경로 — public/data/{profile}/file.json */
export function dataPath(relativePath: string): string {
  const profile = getDataProfile();
  const normalized = relativePath.replace(/^\//, "");
  return `/data/${profile}/${normalized}`;
}

export function isFullDataProfile(): boolean {
  return getDataProfile() === "full";
}
