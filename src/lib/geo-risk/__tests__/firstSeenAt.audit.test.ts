import { describe, expect, it } from "vitest";
import { detectEvents, type AlertInput } from "../detect";
import { runRouterCycle, type RouterDeps } from "../router";
import type { RiskEvent, ExposureAnalysis } from "../types";

/**
 * Layer A 정직성 감사 — "first_seen_at이 정직하게 쌓이는가"를 코드로 검증(가정 아님, 재현).
 * D-GRF11(2026-07-20): H3(커서 유실 버그) 수정(router.ts/d1.ts/telegramFetch.ts).
 * D-GRF11 발견2(2026-07-23): H2(처리시각≠관측시각)도 수정(detect.ts — rep.receivedAt 사용).
 * 아래는 "버그가 있었다"가 아니라 "버그가 고쳐졌다"를 증명한다.
 */

// H1(CONFIRMED): 재관측시 first_seen_at·status 보존은 d1.ts upsertRiskEvent의 onConflictDoUpdate
// set절에 둘 다 미포함으로 정적 보장되고, 로컬 D1에 실 SQL로 재관측을 재현해 E2E 확인 완료
// (2026-07-20, wrangler d1 execute — d1.ts는 getDb() 라이브 바인딩 의존이라 vitest 유닛테스트
// 불가, SQL 직접 실행이 가장 권위 있는 검증). 아래 라우터 레벨 테스트는 같은 계약을 스텁으로 재확인.

describe("D-GRF11 발견2 FIX 검증: firstSeenAt은 이제 실제 최초 관측시각(rep.receivedAt)", () => {
  it("가장 이른 메시지의 receivedAt이 그대로 firstSeenAt에 찍힌다(처리시각 아님)", () => {
    const trueEarliest = "2026-07-18T14:20:00.000Z"; // 실제 첫 메시지 시각
    const laterAlert = "2026-07-18T14:24:00.000Z";

    const alerts: AlertInput[] = [
      { id: "A/1", channelUsername: "A", text: "explosion at oil terminal reported", receivedAt: trueEarliest },
      { id: "B/1", channelUsername: "B", text: "explosion confirmed at terminal site", receivedAt: laterAlert },
    ];
    const events = detectEvents(alerts); // ★nowIso 파라미터 자체가 제거됨(detect.ts)
    expect(events).toHaveLength(1);
    expect(events[0].sourceRef).toBe("A/1"); // 버킷 대표(rep) = 가장 이른 알림
    // firstSeenAt이 이제 rep.receivedAt(진짜 첫 관측)과 정확히 일치 — 처리시각이 아님.
    expect(events[0].firstSeenAt).toBe(trueEarliest);
  });

  it("최초 승격 이후 재관측 시, 창이 변해 새 rep가 더 이른/늦은 값이어도 append-only가 원래 값을 지킨다", async () => {
    const { store, deps } = makeStore();
    // 사이클1: A(14:20)+B(14:24) 두 채널이 강신호로 즉시 L3 승격 → firstSeenAt=A.receivedAt=14:20
    const cycle1: AlertInput[] = [
      { id: "A/1", channelUsername: "A", text: "explosion at oil terminal reported", receivedAt: "2026-07-18T14:20:00.000Z" },
      { id: "B/1", channelUsername: "B", text: "explosion confirmed at terminal site", receivedAt: "2026-07-18T14:24:00.000Z" },
    ];
    await runRouterCycle(deps("2026-07-18T14:30:00.000Z", cycle1));
    const firstSeen1 = [...store.values()][0].firstSeenAt;
    expect(firstSeen1).toBe("2026-07-18T14:20:00.000Z");

    // 사이클2: A가 last-8 창에서 아예 빠지고 C(14:26, 더 늦은 새 메시지)만 남음 —
    // 이 사이클의 rep는 B(14:24)가 되어 신규 삽입이었다면 firstSeenAt이 바뀌었을 것.
    // 하지만 이미 존재하는 이벤트라 upsertEvent가 firstSeenAt을 안 건드려야 한다(append-only).
    const cycle2: AlertInput[] = [
      { id: "B/1", channelUsername: "B", text: "explosion confirmed at terminal site", receivedAt: "2026-07-18T14:24:00.000Z" },
      { id: "C/1", channelUsername: "C", text: "explosion aftermath reported at terminal", receivedAt: "2026-07-18T14:26:00.000Z" },
    ];
    await runRouterCycle(deps("2026-07-18T14:40:00.000Z", cycle2));
    expect([...store.values()][0].firstSeenAt).toBe(firstSeen1); // 14:20 그대로 — B(14:24)로 안 밀림
  });
});

/** 인메모리 D1 스텁 — d1.ts의 실제 의미론(append-only firstSeenAt·status)을 그대로 구현. */
function makeStore() {
  const store = new Map<string, RiskEvent>();
  const analyses: Array<{ eventId: string; a: ExposureAnalysis }> = [];
  return {
    store,
    analyses,
    deps: (nowIso: string, alertsThisCycle: AlertInput[]): RouterDeps => ({
      fetchAlerts: async () => alertsThisCycle, // D-GRF11: cursor 필터 없음, 매 사이클 전체 재수집
      upsertEvent: async (ev) => {
        const existing = store.get(ev.id);
        // upsertRiskEvent(d1.ts)와 동일 의미론: firstSeenAt·status는 기존값 유지
        store.set(ev.id, existing ? { ...ev, firstSeenAt: existing.firstSeenAt, status: existing.status } : ev);
      },
      getEventStatus: async (id) => store.get(id)?.status ?? null,
      saveAnalysis: async (eventId, a) => {
        analyses.push({ eventId, a });
        const e = store.get(eventId);
        if (e) store.set(eventId, { ...e, status: "analyzed" });
      },
      callClaude: async () => ({
        ok: true,
        text: JSON.stringify({ exposures: [{ ticker: "XOM", direction: "watch", rationale: "x", verified: false }], portfolioDelta: null }),
        model: "test",
      }),
      portfolio: null,
      apiKey: "",
      nowIso,
    }),
  };
}

describe("D-GRF11 FIX 검증: 전역 cursor 제거 후 2-source corroboration이 실제로 발동한다", () => {
  it("사이클1 무관 강신호 버킷 승격 이후에도, 사이클2에서 진짜 2번째 독립소스가 첫 메시지와 합쳐져 승격된다", async () => {
    const { store, deps } = makeStore();

    // 사이클1(14:30): 채널C가 강신호(explosion, infra_attack) 단일소스로 즉시 L2 승격.
    //   동시에 채널A가 conflict_shift 약신호(강키워드 없음) 단일소스 — 이번 사이클엔 승격 실패.
    const cycle1Alerts: AlertInput[] = [
      { id: "C/1", channelUsername: "C", text: "explosion at oil terminal near Rotterdam", receivedAt: "2026-07-18T14:20:00.000Z" },
      { id: "A/1", channelUsername: "A", text: "reports of troop movement near the front line", receivedAt: "2026-07-18T14:21:00.000Z" },
    ];
    const r1 = await runRouterCycle(deps("2026-07-18T14:30:05.000Z", cycle1Alerts));
    expect(r1.detected).toBe(1); // infra_attack만 승격(신규)
    expect(store.size).toBe(1);
    expect([...store.values()][0].eventClass).toBe("infra_attack");

    // 사이클2(14:40): A/1이 여전히 t.me 최근 8개 창에 남아 재스크랩되고(cursor 없음),
    //   채널B가 같은 conflict_shift 사건의 진짜 2번째 독립소스로 합류.
    const cycle2Alerts: AlertInput[] = [
      { id: "C/1", channelUsername: "C", text: "explosion at oil terminal near Rotterdam", receivedAt: "2026-07-18T14:20:00.000Z" }, // 여전히 최근 8개
      { id: "A/1", channelUsername: "A", text: "reports of troop movement near the front line", receivedAt: "2026-07-18T14:21:00.000Z" },
      { id: "B/1", channelUsername: "B", text: "front line movement now confirmed by second source", receivedAt: "2026-07-18T14:35:00.000Z" },
    ];
    const r2 = await runRouterCycle(deps("2026-07-18T14:40:00.000Z", cycle2Alerts));

    // ★수정 검증: conflict_shift가 이제 A+B 2-source로 승격된다(수정 전엔 영원히 미생성이었음).
    const conflictEvent = [...store.values()].find((e) => e.eventClass === "conflict_shift");
    expect(conflictEvent).toBeDefined();
    expect(conflictEvent!.corroborationCount).toBe(2);
    expect(conflictEvent!.severity).toBe("L2"); // multiSource(corroboration>=2) → L2
    expect(r2.detected).toBe(1); // conflict_shift가 이번 사이클에 신규 승격
    expect(store.size).toBe(2); // infra_attack + conflict_shift

    // infra_attack은 재관측됐지만(reconfirmed) LLM 재호출 없이 기존 판정 유지
    expect(r2.reconfirmed).toBe(1);
  });

  it("이미 analyzed된 이벤트는 재관측돼도 status가 detected로 퇴행하지 않는다(카드/Finance 조회 유지)", async () => {
    const { store, deps } = makeStore();
    const alerts: AlertInput[] = [
      { id: "C/1", channelUsername: "C", text: "explosion at oil terminal near Rotterdam", receivedAt: "2026-07-18T14:20:00.000Z" },
    ];
    await runRouterCycle(deps("2026-07-18T14:30:00.000Z", alerts));
    expect([...store.values()][0].status).toBe("analyzed");

    // 같은 메시지가 다음 사이클에도 여전히 보임(last-8 창) — 재감지되지만 status는 analyzed 유지.
    const r2 = await runRouterCycle(deps("2026-07-18T14:40:00.000Z", alerts));
    expect([...store.values()][0].status).toBe("analyzed"); // detected로 퇴행 안 함
    expect(r2.analyzed).toBe(0); // LLM 재호출 없음(비용 통제)
    expect(r2.reconfirmed).toBe(1);
  });

  it("LLM 호출 실패로 미분석 상태(status=detected)로 남은 이벤트는 다음 사이클에 자동 재시도된다", async () => {
    const { store, analyses, deps } = makeStore();
    const alerts: AlertInput[] = [
      { id: "C/1", channelUsername: "C", text: "explosion at oil terminal near Rotterdam", receivedAt: "2026-07-18T14:20:00.000Z" },
    ];
    const d = deps("2026-07-18T14:30:00.000Z", alerts);
    // 첫 호출은 실패(빈 exposures)로 흉내 — saveAnalysis가 안 불려 status="detected"로 남음
    const failingDeps: RouterDeps = { ...d, callClaude: async () => ({ ok: true, text: "{}", model: "test" }) };
    await runRouterCycle(failingDeps);
    expect([...store.values()][0].status).toBe("detected");
    expect(analyses).toHaveLength(0);

    // 다음 사이클: 정상 callClaude로 재시도 — priorStatus="detected"는 skip 대상이 아니므로 재분석.
    const r2 = await runRouterCycle(deps("2026-07-18T14:40:00.000Z", alerts));
    expect(r2.analyzed).toBe(1);
    expect([...store.values()][0].status).toBe("analyzed");
  });
});
