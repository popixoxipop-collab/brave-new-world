import fs from "fs";
import path from "path";
import type { ArmsEmbargoZone, StaticPoint } from "@/data/geoTypes";
import { expandStaticPoints } from "@/lib/compactData";

const ROOT = process.cwd();

function readJsonFile<T>(relativePath: string): T | null {
  const candidates = [
    path.join(ROOT, "public", "data", "lite", relativePath),
    path.join(ROOT, "public", "data", "full", relativePath),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      return JSON.parse(fs.readFileSync(candidate, "utf8")) as T;
    } catch {
      // try next
    }
  }
  return null;
}

export function loadLocalStaticPoints(fileName: string): StaticPoint[] {
  const raw = readJsonFile<unknown[]>(fileName);
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return expandStaticPoints(raw as Parameters<typeof expandStaticPoints>[0]);
}

export function loadLocalArmsEmbargoZones(): ArmsEmbargoZone[] {
  const raw = readJsonFile<ArmsEmbargoZone[]>("arms-embargo-zones.json");
  return Array.isArray(raw) ? raw : [];
}
