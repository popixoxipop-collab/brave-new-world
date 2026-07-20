/**
 * geo-risk-desk 라이브 Telegram fetch — t.me/s 공개 미리보기 스크래핑 → AlertInput[].
 *
 * D6: telegram_alerts D1를 경유하지 않고 라우터 진입점이 직접 t.me에서 최근 메시지를 가져온다
 *   (Tier 1: cron worker의 telegram_alerts 파이프라인이 아직 우리 라우터에 안 붙어서 — 붙으면
 *   D1 조회로 교체). API 키 불필요(공개 미리보기), Cloudflare Worker fetch 호환.
 * 채널 목록은 geowatch cron-ingest의 telegramChannels와 동일 지정학 OSINT 집합.
 * 라이선스: t.me 공개 임베드(licensing/telegramOsintPolicy 참조) — 파생 분석물만 표시.
 *
 * D-GRF11(2026-07-20): cursor 기반 필터를 제거했다(과거엔 receivedAt>cursor로 걸렀음).
 *   WHY: cursor=risk_events 전역 MAX(firstSeenAt)였는데, 한 사이클에 무관한 버킷이 승격돼
 *     커서가 전진하면 같은 사이클의 미승격 약신호 단일소스 알림이 다음 사이클엔 커서보다
 *     과거가 돼 영구 필터링됐다(2-source corroboration이 실전에서 발동 못하는 버그, vitest로
 *     재현: firstSeenAt.audit.test.ts). 매 채널 최근 8개로 자연히 작은 창이 있어 cursor 없이도
 *     재처리량이 안 커진다 — LLM 비용 통제는 router.ts가 "이미 analyzed"만 스킵하는 방식으로 이전.
 *   COST: 매 사이클 같은 메시지를 재분류(무료, 결정론적 룰)한다 — LLM 호출은 없음(비용 0 증가).
 *   EXIT: 채널당 8개 초과 스크롤이 필요해지면(트래픽 급증) telegram_alerts D1 테이블을 실제
 *     소스로 승격하고 "이미 본 alert id" 영속 집합으로 교체.
 */
import type { AlertInput } from "./detect";

const PREVIEW_BASE = "https://t.me/s/";

/** 지정학 OSINT 채널 (cron-ingest telegramChannels 미러). corroboration은 채널 다양성에서 나온다. */
export const GEO_RISK_CHANNELS = [
  "OSINTdefender", "warfareanalysis", "GeoPWatch", "IDFofficial",
  "AbuAliExpress", "rnintel", "RocketAlert", "Alertisrael",
];

/** t.me/s/<channel> HTML에서 최근 메시지 텍스트 + datetime 추출. */
function parseChannel(html: string, channel: string): AlertInput[] {
  const out: AlertInput[] = [];
  const blocks = html.split("tgme_widget_message_text");
  for (let i = 1; i < Math.min(blocks.length, 8); i++) {
    const b = blocks[i];
    const tm = b.match(/^[^>]*>(.*?)<\/div>/s);
    if (!tm) continue;
    const text = tm[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 20) continue;
    const dm = b.match(/datetime="([^"]+)"/);
    const receivedAt = dm ? dm[1] : new Date().toISOString();
    // id = channel/hash(text) 근사 (post id 파싱 대신 안정 키)
    const id = `${channel}/${receivedAt}`;
    out.push({ id, channelUsername: channel, text: text.slice(0, 500), receivedAt });
  }
  return out;
}

/** 여러 채널에서 최근 메시지(채널당 최대 8개) 수집. cursor 필터 없음(D-GRF11 — 위 헤더 참조). */
export async function fetchTelegramAlerts(
  channels: string[] = GEO_RISK_CHANNELS,
): Promise<AlertInput[]> {
  const all: AlertInput[] = [];
  await Promise.all(
    channels.map(async (ch) => {
      try {
        const r = await fetch(`${PREVIEW_BASE}${ch}`, { signal: AbortSignal.timeout(15000) });
        if (!r.ok) return;
        const html = await r.text();
        all.push(...parseChannel(html, ch));
      } catch {
        /* 채널 하나 실패는 무시 — 나머지로 진행 */
      }
    }),
  );
  return all;
}
