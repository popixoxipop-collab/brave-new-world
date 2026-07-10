import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDataProfile } from "@/lib/dataProfile";
import type { UsCarrier } from "@/data/usCarriers";
import { US_CARRIERS_SEED } from "@/data/usCarriers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ROOT = process.cwd();

function loadCarrierFile(): { carriers: UsCarrier[]; updatedAt: string; source: string } {
  const profile = getDataProfile();
  const filePath = path.join(PROJECT_ROOT, "public", "data", profile, "us-carriers.json");
  if (fs.existsSync(filePath)) {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      carriers?: UsCarrier[];
      updatedAt?: string;
      source?: string;
      generatedAt?: string;
    };
    return {
      carriers: payload.carriers || US_CARRIERS_SEED,
      updatedAt: payload.updatedAt || payload.generatedAt || new Date().toISOString(),
      source: payload.source || "local JSON",
    };
  }
  return {
    carriers: US_CARRIERS_SEED,
    updatedAt: "2026-01-21",
    source: "built-in seed",
  };
}

/** stub과 무관하게 정적 항모 데이터 제공 (외부 API 없음) */
export async function GET() {
  try {
    const { carriers, updatedAt, source } = loadCarrierFile();
    return NextResponse.json({
      receivedAt: new Date().toISOString(),
      updatedAt,
      source,
      count: carriers.length,
      carriers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "항모 데이터 로드 실패",
        carriers: US_CARRIERS_SEED,
        count: US_CARRIERS_SEED.length,
      },
      { status: 500 },
    );
  }
}
