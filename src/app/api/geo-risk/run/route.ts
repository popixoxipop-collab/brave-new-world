/**
 * geo-risk-desk 라우터 실행 진입점 — 실 Telegram → detect → NVIDIA 판정 → risk_events 저장.
 * D-GRF2 데이터 수집의 실제 시작점. cron으로 스케줄하거나 수동 POST로 1 사이클 실행.
 * D5: Claude 대신 callNvidiaMessages(step-3.5-flash 서버 키풀) 주입.
 * D-GRF11(2026-07-20): readCursor/fetchAlertsSince 제거 — fetchAlerts(무필터)+getEventStatus로
 * 교체(cursor가 미승격 알림을 영구 유실시키던 버그 수정, router.ts 헤더 참조).
 */
import { NextResponse } from "next/server";
import { runRouterCycle } from "@/lib/geo-risk/router";
import { fetchTelegramAlerts } from "@/lib/geo-risk/telegramFetch";
import { upsertRiskEvent, getEventStatus, saveAnalysis } from "@/lib/geo-risk/d1";
import { callNvidiaMessages, hasNvidiaKeys } from "@/lib/llm/nvidiaMessages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  // cron 인증: INGEST_CRON_SECRET 설정 시 Bearer 일치만 허용(무단 POST로 NVIDIA 비용 유발 차단).
  // cron-ingest worker의 warmEndpoint가 이 Bearer를 보낸다. secret 미설정(로컬 dev)이면 통과.
  const secret = process.env.INGEST_CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!hasNvidiaKeys()) {
    return NextResponse.json({ error: "NVIDIA 키 미설정" }, { status: 503 });
  }
  try {
    const nowIso = new Date().toISOString();
    const result = await runRouterCycle({
      fetchAlerts: () => fetchTelegramAlerts(),
      upsertEvent: upsertRiskEvent,
      getEventStatus,
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
