/**
 * geo-risk-desk 이벤트 감지 — telegram_alerts diff → 2-source 집계 → 승격 이벤트.
 *
 * D6: geowatch 원본 스트림은 upsert 덮어쓰기라 first-seen을 못 잡는다. Telegram만
 *   received_at으로 cursor-diffable하므로 여기가 유일한 소스. cursor = 마지막 처리 시각.
 * 2-source 게이트(죽음의 문제 ①): 같은 (eventClass, geography) 버킷을 뒷받침한 **서로 다른
 *   채널 수**를 corroborationCount로 집계. 단일 채널(=단일 소스)은 severity가 안 오르고,
 *   shouldPromote가 걸러 full 분석으로 안 간다. Telegram 허위정보 조작 벡터를 막는다.
 * WHY 버킷=(class,geo): 텍스트 유사도 대신 값싼 결정론적 그룹핑. 같은 초크포인트에 대한
 *   같은 종류 사건은 한 이벤트로 병합. COST: 표현 다르면 놓침(예: 다른 지명 표기).
 *   EXIT: 임베딩 유사도 클러스터링(Tier 2)로 교체.
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

/**
 * cursor 이후 알림들을 (class, geography) 버킷으로 묶고, 각 버킷을 하나의 RiskEvent로.
 * @param alerts received_at > cursor 인 telegram_alerts 행들 (호출자가 D1에서 조회)
 * @param nowIso first_seen_at 스탬프 (호출자가 주입 — 결정론/테스트 위해)
 */
export function detectEvents(alerts: AlertInput[], nowIso: string): RiskEvent[] {
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
      firstSeenAt: nowIso,
      status: "detected",
    });
  }
  return events;
}
