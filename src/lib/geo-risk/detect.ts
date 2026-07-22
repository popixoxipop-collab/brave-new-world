/**
 * geo-risk-desk 이벤트 감지 — telegram 최근 메시지 → 2-source 집계 → 승격 이벤트.
 *
 * D6: geowatch 원본 스트림은 upsert 덮어쓰기라 first-seen을 못 잡는다. Telegram이 유일한 소스.
 * D-GRF11(2026-07-20): 이전엔 cursor(마지막 처리 시각) 이후 알림만 받았으나, 전역 cursor가
 *   한 사이클의 무관 버킷 승격으로 전진하면 같은 사이클의 미승격 알림이 다음 사이클엔 걸러져
 *   영구 유실되는 버그가 있었다(재현: firstSeenAt.audit.test.ts). 지금은 매 사이클 채널당
 *   최근 8개 전체를 받아 매번 처음부터 버킷팅한다 — 비용 통제는 router.ts의 이미-analyzed 스킵.
 * 2-source 게이트(죽음의 문제 ①): 같은 (eventClass, geography) 버킷을 뒷받침한 **서로 다른
 *   채널 수**를 corroborationCount로 집계. 단일 채널(=단일 소스)은 severity가 안 오르고,
 *   shouldPromote가 걸러 full 분석으로 안 간다. Telegram 허위정보 조작 벡터를 막는다.
 * WHY 버킷=(class,geo): 텍스트 유사도 대신 값싼 결정론적 그룹핑. 같은 초크포인트에 대한
 *   같은 종류 사건은 한 이벤트로 병합. COST: 표현 다르면 놓침(예: 다른 지명 표기).
 *   EXIT: 임베딩 유사도 클러스터링(Tier 2)로 교체.
 * D-GRF11 발견2 수정(2026-07-23): first_seen_at을 nowIso(처리시각)가 아니라 rep.receivedAt
 *   (버킷 내 실제 최이른 메시지 시각)으로 스탬프한다. WHY: "언제 처음 관측됐나"를 문자 그대로
 *   지키는 값은 rep.receivedAt뿐 — nowIso는 cron이 그 사이클을 돈 시각일 뿐이라 최대 cron
 *   주기(~10분)만큼 체계적으로 늦다. rep는 이미 계산돼 sourceRef/summary에 쓰이므로 추가 비용
 *   없음. COST: 없음(append-only 보호로 기존 행엔 영향 없음 — d1.ts upsertRiskEvent가 재관측
 *   시 first_seen_at을 안 건드림, D-GRF11 발견1 수정에서 확정). EXIT: 되돌리려면 아래 한 줄만
 *   rep.receivedAt→nowIso로 되돌리면 됨(다른 로직 의존 없음).
 */
import type { RiskEvent } from "./types";
import { classifyText, shouldPromote } from "./classify";

/** telegram_alerts 행의 최소 형태 (drizzle TelegramAlertRow 서브셋). */
export interface AlertInput {
  id: string;
  channelUsername: string;
  text: string;
  receivedAt: string;
}

/** 알림들을 (class, geography) 버킷으로 묶고, 각 버킷을 하나의 RiskEvent로.
 * @param alerts 채널당 최근 8개 telegram 메시지 (호출자가 스크래핑/D1에서 조회, cursor 필터 없음)
 */
export function detectEvents(alerts: AlertInput[]): RiskEvent[] {
  // 1차 분류 (corr=1로) 후 버킷팅
  const buckets = new Map<string, { alerts: AlertInput[]; channels: Set<string> }>();
  for (const a of alerts) {
    const c = classifyText(a.text, 1);
    if (c.eventClass === "other") continue; // 관심 없는 건 버킷 안 만듦
    const key = `${c.eventClass}|${c.geography ?? "-"}`;
    let b = buckets.get(key);
    if (!b) {
      b = { alerts: [], channels: new Set() };
      buckets.set(key, b);
    }
    b.alerts.push(a);
    b.channels.add(a.channelUsername);
  }

  const events: RiskEvent[] = [];
  for (const [key, b] of buckets) {
    const corroboration = b.channels.size; // ★ 서로 다른 채널 수 = 독립 소스 수
    // 버킷 대표 = 가장 이른 알림 (first-seen)
    const rep = b.alerts.reduce((a, x) => (x.receivedAt < a.receivedAt ? x : a));
    // corroboration 반영해 재분류 (severity 상향 가능)
    const c = classifyText(rep.text, corroboration);
    if (!shouldPromote(c)) continue; // 2-source 게이트: 단일소스+약신호는 탈락

    events.push({
      id: `telegram:${key}:${rep.receivedAt.slice(0, 10)}`, // class|geo|날짜 로 dedup
      source: "telegram",
      sourceRef: rep.id,
      eventClass: c.eventClass,
      geography: c.geography,
      severity: c.severity,
      summary: rep.text.slice(0, 500),
      lat: c.lat,
      lon: c.lon,
      corroborationCount: corroboration,
      firstSeenAt: rep.receivedAt, // ★실제 최이른 관측시각(D-GRF11 발견2 수정) — 처리시각 아님
      status: "detected",
    });
  }
  return events;
}
