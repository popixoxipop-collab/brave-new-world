import fs from "fs";
import path from "path";
import type { DisputeHatchCachePayload, DisputeHatchLod } from "@/lib/disputeHatchPrecompute";
import { getServerDataProfile } from "@/lib/serverEnv";
import type { DataProfile } from "@/lib/runtimeConfig.types";

function cacheDir(profile: DataProfile) {
  return path.join(process.cwd(), "private", "overlay-cache", profile);
}

function cacheFile(profile: DataProfile, lod: DisputeHatchLod) {
  return path.join(cacheDir(profile), `dispute-hatch-paths-${lod}.json`);
}

export function loadDisputeHatchCache(
  lod: DisputeHatchLod,
  profile?: DataProfile,
): DisputeHatchCachePayload | null {
  const resolved = profile ?? getServerDataProfile();
  const filePath = cacheFile(resolved, lod);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as DisputeHatchCachePayload;
    if (!Array.isArray(raw.paths) || raw.paths.length === 0) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveDisputeHatchCache(
  payload: DisputeHatchCachePayload,
  profile?: DataProfile,
) {
  const resolved = profile ?? getServerDataProfile();
  const dir = cacheDir(resolved);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = cacheFile(resolved, payload.lodTier);
  fs.writeFileSync(filePath, JSON.stringify(payload));
  return filePath;
}
