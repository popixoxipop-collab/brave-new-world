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
