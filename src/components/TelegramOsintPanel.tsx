"use client";

import {
  TELEGRAM_CATALOG_NOTE,
  TELEGRAM_REGION_LABELS,
  type TelegramAlert,
  type TelegramAlertRegion,
} from "@/lib/telegramAlerts";

type TelegramOsintPanelProps = {
  alerts: TelegramAlert[];
  liveStatus: "idle" | "loading" | "ok" | "error" | "stub" | "waiting";
  live: boolean;
  needsAuth?: boolean;
  sessionExists?: boolean;
  embedMode?: boolean;
  channelCount?: number;
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TelegramOsintPanel({
  alerts,
  liveStatus,
  live,
  needsAuth,
  sessionExists,
  embedMode = true,
  channelCount = 0,
}: TelegramOsintPanelProps) {
  return (
    <div className="pointer-events-auto absolute bottom-5 left-4 z-20 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-sky-300/20 bg-[#0a1428]/88 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-sky-300/15 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-sky-200/75">Telegram OSINT</p>
          <p className="mt-0.5 text-xs text-sky-50/90">
            {embedMode
              ? `공개 채널 임베드 · ${channelCount || "—"}채널 · 한국어 번역`
              : "분쟁 지역 실시간 속보 · 한국어 번역"}
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] ${
            live
              ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-100"
              : "border-sky-300/25 bg-sky-400/10 text-sky-100/80"
          }`}
        >
          {liveStatus === "loading"
            ? "동기화"
            : liveStatus === "error"
              ? "오프라인"
              : live
                ? "LIVE"
                : liveStatus === "stub"
                  ? "데모"
                  : liveStatus === "waiting"
                    ? "대기"
                    : "대기"}
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="px-3 py-4 text-xs leading-5 text-slate-400">
          {liveStatus === "loading" ? (
            <>
              <p>텔레그램 공개 채널을 동기화하는 중…</p>
              {embedMode && channelCount > 0 ? (
                <p className="mt-2 text-[10px] text-slate-500">
                  중동·우크라이나 {channelCount}채널 · 최초 실행 시 1~2분 걸릴 수 있습니다
                </p>
              ) : null}
            </>
          ) : embedMode ? (
            <>
              <p className="font-medium text-sky-200/90">공개 임베드 수집 (로그인 불필요)</p>
              <p className="mt-2 text-slate-500">
                Telegram 공개 embed 엔드포인트로 중동·우크라이나 채널 속보를 가져옵니다. 60초마다
                자동 갱신됩니다.
              </p>
              <p className="mt-2 text-[10px] text-slate-600">{TELEGRAM_CATALOG_NOTE}</p>
            </>
          ) : needsAuth ? (
            <>
              <p className="font-medium text-amber-200/90">텔레그램 로그인이 필요합니다</p>
              <p className="mt-2 text-slate-500">
                인증번호는 <strong className="text-slate-300">웹 화면이 아니라 터미널</strong>에서 받습니다.
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-slate-500">
                <li>Cursor 하단 터미널 열기</li>
                <li>
                  <code className="rounded bg-slate-800 px-1 py-0.5">python scripts/telegram-osint/auth.py</code>
                </li>
                <li>번호 입력 (+8210…)</li>
                <li>
                  <strong className="text-slate-300">텔레그램 앱 → 「Telegram」 공식 채팅</strong>에서 코드 확인
                  <span className="block text-[10px] text-slate-600">문자 SMS가 아닌 경우가 많습니다</span>
                </li>
                <li>로그인 후 collector 실행</li>
              </ol>
            </>
          ) : liveStatus === "waiting" || (needsAuth === false && sessionExists) ? (
            <>
              <p className="font-medium text-sky-200/90">실시간 수집 대기 중</p>
              <p className="mt-2 text-slate-500">
                다른 터미널에서{" "}
                <code className="rounded bg-slate-800 px-1 py-0.5">npm run telegram:collect</code>
                를 실행하세요. (Next.js dev와 함께 켜져 있어야 합니다)
              </p>
              {sessionExists ? (
                <p className="mt-1 text-[10px] text-emerald-400/80">텔레그램 로그인 세션 확인됨</p>
              ) : null}
            </>
          ) : (
            <p>속보를 불러오는 중입니다…</p>
          )}
        </div>
      ) : (
        <ul className="max-h-[min(42vh,320px)] divide-y divide-sky-300/10 overflow-y-auto">
          {alerts.map((alert) => (
            <li key={alert.id} className="px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] text-sky-100/90">
                  뉴스 알림
                </span>
                <span className="font-medium text-sky-50">
                  {TELEGRAM_REGION_LABELS[alert.region as TelegramAlertRegion]}
                </span>
                <span className="text-slate-500">{formatTime(alert.receivedAt)}</span>
              </div>
              <p className="mt-1 truncate text-[11px] text-sky-100/70">@{alert.channelUsername}</p>
              <p className="mt-1 line-clamp-4 text-[11px] leading-5 text-slate-300">{alert.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
