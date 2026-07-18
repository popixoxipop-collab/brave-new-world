import { describe, expect, it } from "vitest";
import { toBrief } from "../adapter";
import type { ExposureAnalysis, RiskEvent } from "../types";

/**
 * Stage-2 β 교차검증이 카드(EconInsightBrief)에 배선됐는지 검증.
 * Hormuz(chokepoint→Brent↑) verdict로 실측 β 부호 대비 일치/불일치가 칩·본문에 나오는지 확인.
 */
const HORMUZ_EVENT: RiskEvent = {
  id: "test-hormuz",
  source: "telegram",
  sourceRef: "test",
  eventClass: "chokepoint_disruption",
  geography: "Hormuz",
  severity: "L3",
  summary: "Tanker traffic disrupted near Strait of Hormuz.",
  lat: 26.5,
  lon: 56.2,
  corroborationCount: 3,
  firstSeenAt: "2026-07-18T00:00:00Z",
  status: "analyzed",
};

const HORMUZ_ANALYSIS: ExposureAnalysis = {
  exposures: [
    { ticker: "XOM", direction: "up", rationale: "oil beneficiary", verified: false },
    { ticker: "VLO", direction: "down", rationale: "fuel cost squeezes refiner", verified: false },
    { ticker: "DAL", direction: "down", rationale: "jet fuel cost up", verified: false },
    { ticker: "LMT", direction: "up", rationale: "defense premium", verified: false },
    { ticker: "NOC", direction: "up", rationale: "defense premium", verified: false },
  ],
  portfolioDelta: null,
  verified: false,
  model: "stepfun-ai/step-3.5-flash",
};

describe("toBrief Stage-2 β cross-check", () => {
  const brief = toBrief(HORMUZ_EVENT, HORMUZ_ANALYSIS, null);
  const bySym = new Map(brief.marketLinks.map((m) => [m.symbol, m]));

  it("attaches a measured-β chip note to every exposure with a known β", () => {
    for (const sym of ["XOM", "VLO", "DAL", "LMT", "NOC"]) {
      expect(bySym.get(sym)?.note, `${sym} note`).toBeTruthy();
      expect(bySym.get(sym)?.note).toContain("β");
    }
  });

  it("marks XOM/LMT/NOC as agreeing with measured β (Brent+)", () => {
    for (const sym of ["XOM", "LMT", "NOC"]) {
      expect(bySym.get(sym)?.betaFlag, `${sym} flag`).toBe("agree");
      expect(bySym.get(sym)?.note).toContain("✓");
    }
  });

  it("flags VLO and DAL as disagreeing — LLM 'down' contradicts β(Brent)>0", () => {
    for (const sym of ["VLO", "DAL"]) {
      expect(bySym.get(sym)?.betaFlag, `${sym} flag`).toBe("disagree");
      expect(bySym.get(sym)?.note).toContain("⚠");
    }
  });

  it("body carries the β cross-check section with provenance and the disagreement warning", () => {
    const body = brief.paragraphs.join("\n");
    expect(body).toContain("실측 β 교차검증");
    expect(body).toContain("n=2641일");
    expect(body).toContain("§13");
    // 불일치 경고에 VLO, DAL 명시
    expect(body).toMatch(/VLO.*DAL|DAL.*VLO/);
  });
});

/**
 * ★market-β 교란(2026-07-18 로컬 실관측): conflict_shift/sanction은 driver=VIX인데 β(VIX)는
 * 전 종목 음수(시장 베타)라 up/down 방향을 판정 못 한다. raw로 쓰면 모든 up이 무조건 disagree로
 * 오판정 → VIX-driver는 unverified로 두고 방향 판정 안 함(chokepoint=Brent만 판정).
 */
const CONFLICT_EVENT: RiskEvent = { ...HORMUZ_EVENT, id: "test-conflict", eventClass: "conflict_shift" };
const CONFLICT_ANALYSIS: ExposureAnalysis = {
  exposures: [
    { ticker: "XOM", direction: "up", rationale: "conflict premium", verified: false },
    { ticker: "LMT", direction: "up", rationale: "defense premium", verified: false },
  ],
  portfolioDelta: null,
  verified: false,
  model: "stepfun-ai/step-3.5-flash",
};

describe("toBrief VIX-driver events are market-β confounded (not disagree)", () => {
  const brief = toBrief(CONFLICT_EVENT, CONFLICT_ANALYSIS, null);
  const bySym = new Map(brief.marketLinks.map((m) => [m.symbol, m]));

  it("flags conflict_shift exposures as unverified, never disagree", () => {
    for (const sym of ["XOM", "LMT"]) {
      expect(bySym.get(sym)?.betaFlag, `${sym}`).toBe("unverified");
      expect(bySym.get(sym)?.note).toContain("~"); // 정보용 magnitude 표기
    }
  });

  it("explains market-β confounding in the body, not a false contradiction", () => {
    const body = brief.paragraphs.join("\n");
    expect(body).toContain("시장β 교란");
    // 불일치 경고는 나오지 않아야(오판정 방지)
    expect(body).not.toMatch(/LLM 판정 방향이 실측 β 부호와 반대/);
  });
});
