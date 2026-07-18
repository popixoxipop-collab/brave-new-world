/**
 * geo-risk-desk 라이브 Telegram fetch — t.me/s 공개 미리보기 스크래핑 → AlertInput[].
 *
 * D6: telegram_alerts D1를 경유하지 않고 라우터 진입점이 직접 t.me에서 최근 메시지를 가져온다
 *   (Tier 1: cron worker의 telegram_alerts 파이프라인이 아직 우리 라우터에 안 붙어서 — 붙으면
 *   fetchAlertsSince를 D1 조회로 교체). API 키 불필요(공개 미리보기), Cloudflare Worker fetch 호환.
 * 채널 목록은 geowatch cron-ingest의 telegramChannels와 동일 지정학 OSINT 집합.
 * 라이선스: t.me 공개 임베드(licensing/telegramOsintPolicy 참조) — 파생 분석물만 표시.
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

/** 여러 채널에서 최근 메시지 수집. cursor 이후만(received_at > cursor) 필터. */
export async function fetchTelegramAlerts(
  cursor: string | null,
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
  const filtered = cursor ? all.filter((a) => a.receivedAt > cursor) : all;
  return filtered;
}
