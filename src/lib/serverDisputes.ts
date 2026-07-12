import fs from "fs";
import path from "path";
import type { DisputeArea } from "@/data/geoTypes";
import { getServerDataProfile } from "@/lib/serverEnv";
import type { DataProfile } from "@/lib/runtimeConfig.types";

function readJson<T>(rel: string, profile: DataProfile): T | null {
  const filePath = path.join(process.cwd(), "public", "data", profile, rel);
  if (!fs.existsSync(filePath)) {
    const fallback = path.join(process.cwd(), "public", "data", rel);
    if (!fs.existsSync(fallback)) return null;
    try {
      return JSON.parse(fs.readFileSync(fallback, "utf8")) as T;
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

/** 서버에서 disputes.json / app-data 로드 */
export function loadServerDisputes(profile?: DataProfile): DisputeArea[] {
  const resolved = profile ?? getServerDataProfile();
  const chunk = readJson<DisputeArea[]>("disputes.json", resolved);
  if (Array.isArray(chunk) && chunk.length > 0) return chunk;
  const appData = readJson<{ disputes?: DisputeArea[] }>("app-data.json", resolved);
  if (Array.isArray(appData?.disputes)) return appData.disputes;
  return [];
}
