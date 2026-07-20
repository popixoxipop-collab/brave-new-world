import { describe, expect, it } from "vitest";
import { detectEvents, type AlertInput } from "../detect";
import { runRouterCycle, type RouterDeps } from "../router";
import type { RiskEvent, ExposureAnalysis } from "../types";

/**
 * Layer A 정직성 감사 — "first_seen_at이 정직하게 쌓이는가"를 코드로 검증(가정 아님, 재현).
 * D-GRF11: 이 테스트가 실제로 두 가설을 재현/반증한다. 읽고 추론만 한 게 아니라 돌려서 확인.
 */

// ── H1: 재관측 시 first_seen_at 보존 여부는 d1.ts upsertRiskEvent의 onConflictDoUpdate set절로
//    이미 정적 확인됨(firstSeenAt 미포함 → Drizzle이 갱신 안 함). 여기선 detectEvents가 만드는
//    RiskEvent 자체의 정직성(H2)과 커서 상호작용(H3)을 동적으로 검증한다.

describe("H2: firstSeenAt은 실제 최초 관측시각(rep.receivedAt)이 아니라 처리시각(nowIso)", () => {
  it("가장 이른 메시지보다 firstSeenAt이 늦게 찍힌다(처리 지연만큼 부정확)", () => {
    const trueEarliest = "2026-07-18T14:20:00.000Z"; // 실제 첫 메시지 시각
    const laterAlert = "2026-07-18T14:24:00.000Z";
    const cronProcessedAt = "2026-07-18T14:30:05.000Z"; // cron이 실제로 도는 시각(10분 주기)

    const alerts: AlertInput[] = [
      { id: "A/1", channelUsername: "A", text: "explosion at oil terminal reported", receivedAt: trueEarliest },
      { id: "B/1", channelUsername: "B", text: "explosion confirmed at terminal site", receivedAt: laterAlert },
    ];
    const events = detectEvents(alerts, cronProcessedAt);
    expect(events).toHaveLength(1);
    // 버킷 대표(rep)는 가장 이른 알림이어야 하고(sourceRef로 확인),
    expect(events[0].sourceRef).toBe("A/1");
    // 그런데 firstSeenAt은 rep.receivedAt(실제 첫 관측)이 아니라 cronProcessedAt(처리시각)이다.
    expect(events[0].firstSeenAt).toBe(cronProcessedAt);
    expect(events[0].firstSeenAt).not.toBe(trueEarliest);
    // 처리 지연 = 약 10분(605초). Layer C(lead-lag) 테스트에 이 만큼의 조직적 편향이 들어간다.
    const lagMs = new Date(cronProcessedAt).getTime() - new Date(trueEarliest).getTime();
    expect(lagMs).toBe(10 * 60 * 1000 + 5000);
  });
});

describe("H3: 전역 커서가 미승격 약신호 단일소스 알림을 영구 유실시킬 수 있다", () => {
  it("사이클1에서 강신호(무관 버킷) 승격 → 커서 전진 → 사이클2에서 약신호 첫 메시지가 커서 밖으로 밀려나 재관측 불가", async () => {
    // D1을 인메모리로 흉내내는 최소 스텁 (append-only 의미론 그대로 구현)
    const store = new Map<string, RiskEvent>();
    const analyses: Array<{ eventId: string; a: ExposureAnalysis }> = [];
    const deps = (nowIso: string, alertsThisCycle: AlertInput[]): RouterDeps => ({
      readCursor: async () => {
        const all = [...store.values()];
        if (all.length === 0) return null;
        return all.reduce((mx, e) => (e.firstSeenAt > mx ? e.firstSeenAt : mx), all[0].firstSeenAt);
      },
      fetchAlertsSince: async (cursor) =>
        cursor ? alertsThisCycle.filter((a) => a.receivedAt > cursor) : alertsThisCycle,
      upsertEvent: async (ev) => {
        const existing = store.get(ev.id);
        // upsertRiskEvent와 동일 의미론: firstSeenAt은 최초값 유지
        store.set(ev.id, existing ? { ...ev, firstSeenAt: existing.firstSeenAt } : ev);
      },
      saveAnalysis: async (eventId, a) => {
        analyses.push({ eventId, a });
      },
      callClaude: async () => ({
        ok: true,
        text: JSON.stringify({ exposures: [{ ticker: "XOM", direction: "watch", rationale: "x", verified: false }], portfolioDelta: null }),
        model: "test",
      }),
      portfolio: null,
      apiKey: "",
      nowIso,
    });

    // 사이클1(14:30): 채널C가 강신호(explosion, infra_attack) 단일소스로 즉시 L2 승격.
    //   동시에 채널A가 conflict_shift 약신호(강키워드 없음) 단일소스 — 승격 실패, 저장 안 됨.
    const cycle1Alerts: AlertInput[] = [
      { id: "C/1", channelUsername: "C", text: "explosion at oil terminal near Rotterdam", receivedAt: "2026-07-18T14:20:00.000Z" },
      { id: "A/1", channelUsername: "A", text: "reports of troop movement near the front line", receivedAt: "2026-07-18T14:21:00.000Z" },
    ];
    const r1 = await runRouterCycle(deps("2026-07-18T14:30:05.000Z", cycle1Alerts));
    expect(r1.detected).toBe(1); // infra_attack만 감지(conflict_shift 약신호는 버킷은 만들되 shouldPromote 탈락)
    expect(store.size).toBe(1);
    expect([...store.values()][0].eventClass).toBe("infra_attack");

    // 사이클2(14:40): 채널B가 같은 conflict_shift 사건의 진짜 2번째 독립소스로 확증 메시지 발행.
    //   A/1(14:21)은 여전히 t.me 최근 메시지 창에 남아있어 다시 스크랩되지만,
    //   cursor=14:30:05(사이클1 강신호 승격 시각)보다 이르므로 fetchAlertsSince가 걸러버린다.
    const cycle2Alerts: AlertInput[] = [
      { id: "A/1", channelUsername: "A", text: "reports of troop movement near the front line", receivedAt: "2026-07-18T14:21:00.000Z" }, // 재스크랩(여전히 최근 8개 안)
      { id: "B/1", channelUsername: "B", text: "front line movement now confirmed by second source", receivedAt: "2026-07-18T14:35:00.000Z" },
    ];
    const cursorBefore = await deps("2026-07-18T14:40:00.000Z", []).readCursor();
    expect(cursorBefore).toBe("2026-07-18T14:30:05.000Z");
    // A/1의 receivedAt(14:21)이 cursor(14:30:05)보다 이르므로 다음 fetch에서 실제로 걸러진다.
    expect("2026-07-18T14:21:00.000Z" > cursorBefore!).toBe(false);

    const r2 = await runRouterCycle(deps("2026-07-18T14:40:00.000Z", cycle2Alerts));
    // B/1 혼자만 살아남아 새 버킷(corroboration=1, 약신호)을 이루고 — 여전히 승격 실패.
    expect(r2.detected).toBe(0);
    expect(store.size).toBe(1); // conflict_shift 이벤트는 끝내 한 번도 생성되지 않음

    // 결론: A와 B 두 독립 채널이 실제로 같은 사건을 확증했음에도, 전역 커서가 A/1을 사이클2에서
    // 미리 걷어내 detectEvents가 둘을 한 번도 같은 alerts 배열에서 함께 보지 못했다.
    // 2-source corroboration 게이트가 "이론상 설계"와 달리 실제로 발동하지 않는 실패 모드.
  });
});
