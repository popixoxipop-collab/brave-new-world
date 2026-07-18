/**
 * geo-risk-desk 라우터 실행 진입점 — 실 Telegram → detect → NVIDIA 판정 → risk_events 저장.
 * D-GRF2 데이터 수집의 실제 시작점. cron으로 스케줄하거나 수동 POST로 1 사이클 실행.
 * D5: Claude 대신 callNvidiaMessages(step-3.5-flash 서버 키풀) 주입.
 */
import { NextResponse } from "next/server";
import { runRouterCycle } from "@/lib/geo-risk/router";
import { fetchTelegramAlerts } from "@/lib/geo-risk/telegramFetch";
import { readCursor, upsertRiskEvent, saveAnalysis } from "@/lib/geo-risk/d1";
import { callNvidiaMessages, hasNvidiaKeys } from "@/lib/llm/nvidiaMessages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  if (!hasNvidiaKeys()) {
    return NextResponse.json({ error: "NVIDIA 키 미설정" }, { status: 503 });
  }
  try {
    const nowIso = new Date().toISOString();
    const result = await runRouterCycle({
      readCursor,
      fetchAlertsSince: (cursor) => fetchTelegramAlerts(cursor),
      upsertEvent: upsertRiskEvent,
      saveAnalysis,
      callClaude: callNvidiaMessages, // D5: NVIDIA step-3.5-flash
      portfolio: null, // 교집합은 카드 단계에서(D3 스냅샷) — 라우터는 전 이벤트 저장
      apiKey: "", // NVIDIA는 서버 키풀(인자 무시)
      nowIso,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "router cycle error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
