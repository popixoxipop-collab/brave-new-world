"use client";

/**
 * 공유 버튼 등 바이럴 기능이 실제로 눌리는지 확인하기 위한 경량 클라이언트 트래커.
 * fire-and-forget — 실패해도 절대 UX를 막지 않는다. 개인식별 정보는 보내지 않는다.
 */
export function trackEvent(
  event: string,
  meta?: Record<string, unknown>,
  extra?: { viewerMode?: string; lang?: string },
) {
  if (typeof window === "undefined") return;

  try {
    const body = JSON.stringify({
      event,
      meta,
      viewerMode: extra?.viewerMode,
      lang: extra?.lang,
    });

    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/track", blob);
      if (ok) return;
    }

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 트래킹 실패는 무시 — 절대 사용자 흐름을 막지 않는다
  }
}
