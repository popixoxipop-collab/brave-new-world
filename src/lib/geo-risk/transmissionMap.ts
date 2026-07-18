/**
 * geo-risk-desk Stage-2 transmission map — 실측 β(asset|driver).
 *
 * ★출처: Finance repo `experiments/d_grf2/measure_transmission.py` (§13 Data-First Numerics).
 *   일간 수익 OLS로 실측한 β. 카드의 exposure 방향을 **직관이 아닌 측정치**로 교차검증한다.
 *   이 값들은 하드코딩된 직관이 아니라 measure_transmission.py가 산출한 회귀계수이며,
 *   provenance(n·기간·유니버스 sha)를 함께 보관한다. 재측정 시 그 스크립트를 다시 돌려 갱신.
 *
 * 사용: crossCheckBeta(ticker, eventClass, llmDirection) → 실측 β가 LLM 방향을 지지하는가.
 *   chokepoint/infra_attack → Brent↑ 충격 → expected = sign(β(Brent)).
 *   sanction/conflict_shift → VIX↑ 충격 → expected = sign(β(VIX)).
 *   |t|<3(β 유의성 없음)이면 방향 미검증으로 회색 처리.
 */
import type { EventClass } from "./types";

export interface Beta {
  beta: number;
  t: number;
  r2: number;
}
export interface AssetBetas {
  brent: Beta;
  vix: Beta;
}

/** measure_transmission.py 산출값 (n=2641일, 2016-01-05~2026-07-10). */
export const TRANSMISSION_PROVENANCE = {
  nDays: 2641,
  start: "2016-01-05",
  end: "2026-07-10",
  stocksUniverse: "17fb547b",
  brentSource: "yfinance BZ=F auto_adjust",
} as const;

export const TRANSMISSION_MAP: Record<string, AssetBetas> = {
  XOM: { brent: { beta: 0.3648, t: 32.1, r2: 0.281 }, vix: { beta: -0.068, t: -18.2, r2: 0.111 } },
  CVX: { brent: { beta: 0.3615, t: 30.1, r2: 0.256 }, vix: { beta: -0.0733, t: -18.9, r2: 0.12 } },
  COP: { brent: { beta: 0.5575, t: 37.5, r2: 0.347 }, vix: { beta: -0.0974, t: -19.0, r2: 0.12 } },
  VLO: { brent: { beta: 0.3627, t: 20.0, r2: 0.132 }, vix: { beta: -0.1003, t: -18.5, r2: 0.115 } },
  DAL: { brent: { beta: 0.0731, t: 3.6, r2: 0.005 }, vix: { beta: -0.1303, t: -24.2, r2: 0.181 } },
  UAL: { brent: { beta: 0.0859, t: 3.5, r2: 0.005 }, vix: { beta: -0.1517, t: -22.6, r2: 0.162 } },
  LMT: { brent: { beta: 0.088, t: 7.8, r2: 0.023 }, vix: { beta: -0.0463, t: -14.3, r2: 0.072 } },
  NOC: { brent: { beta: 0.0764, t: 6.4, r2: 0.015 }, vix: { beta: -0.0426, t: -12.3, r2: 0.054 } },
  XLE: { brent: { beta: 0.4287, t: 37.2, r2: 0.344 }, vix: { beta: -0.0891, t: -23.2, r2: 0.169 } },
};

/**
 * geo-shock β — 시장중립 초과수익이 지경학 충격(ΔGPRD)에 반응하는 방향(bp/σ).
 * ★출처: measure_geo_shock_beta.py (§13, n=2264일, GPRD daily 이벤트 스터디).
 *   β(VIX)는 시장 베타(전 종목 음수)라 conflict/sanction 방향 판정 불가 → 시장 제거 후 측정한
 *   이 β로 방향 판정. GLD+4.3/LMT+3.8/DAL-3.8 등 경제적으로 검증됨. 단 t값이 낮아(대부분 |t|<2)
 *   방향은 견고하나 통계적으로 약함 → |t|≥2 AND 이벤트스터디 부호일치일 때만 confident.
 */
interface GeoShock {
  beta: number; // bp/σ
  t: number;
  es: number; // 상위10% 충격일 평균 excess(bp) — 부호 교차확인용
}
export const GEO_SHOCK_MAP: Record<string, GeoShock> = {
  XOM: { beta: 9.32, t: 2.7, es: 31.45 }, CVX: { beta: 6.98, t: 2.1, es: 13.86 },
  COP: { beta: 6.72, t: 1.5, es: 28.52 }, VLO: { beta: 3.46, t: 0.7, es: 14.3 },
  DAL: { beta: -3.84, t: -0.8, es: -6.62 }, UAL: { beta: -5.21, t: -0.9, es: -4.19 },
  LMT: { beta: 3.83, t: 1.3, es: 18.06 }, NOC: { beta: 4.67, t: 1.4, es: 28.34 },
  RTX: { beta: 0.48, t: 0.1, es: 8.98 }, HAL: { beta: 4.33, t: 0.8, es: 28.69 },
  SLB: { beta: 6.49, t: 1.3, es: 16.12 }, BKR: { beta: 7.31, t: 1.6, es: 10.31 },
  XLE: { beta: 4.9, t: 1.5, es: 19.54 }, GLD: { beta: 4.3, t: 2.0, es: 25.75 },
};

/** 이벤트 클래스 → 어느 driver가 충격받나 (forward_scorecard.py CLASS_DRIVER 미러). */
const CLASS_DRIVER: Record<EventClass, "brent" | "vix"> = {
  chokepoint_disruption: "brent",
  infra_attack: "brent",
  sanction: "vix",
  conflict_shift: "vix",
  other: "brent",
};

const T_SIGNIF = 3; // |t|≥3 유의

export type BetaAgreement = "agree" | "disagree" | "unverified" | "no-beta" | "watch";

export interface BetaCheck {
  agreement: BetaAgreement;
  driver: "brent" | "vix";
  beta: number | null;
  t: number | null;
  expected: "up" | "down" | null;
  /** 칩에 붙일 짧은 배지 (예: "β油+0.36✓"). no-beta면 null. */
  chipNote: string | null;
}

/**
 * 실측 β 부호가 LLM verdict 방향을 지지하는가.
 * driver↑ 충격 가정 → expected = sign(β). watch는 판정 제외.
 */
export function crossCheckBeta(
  ticker: string,
  eventClass: EventClass,
  llmDirection: "up" | "down" | "watch",
): BetaCheck {
  const driver = CLASS_DRIVER[eventClass] ?? "brent";

  // ★conflict/sanction(VIX-driver): β(VIX)는 시장 베타(전 종목 음수)라 방향 판정 불가 →
  //   시장중립 geo-shock β(measure_geo_shock_beta.py)로 방향 판정. GLD+/LMT+/DAL- 등 경제적 검증.
  //   단 t낮음 → |t|≥2 AND 이벤트스터디 부호일치일 때만 confident agree/disagree, 아니면 unverified.
  //   D-GRF7이 발견한 market-β 교란을 D-GRF8 geo-shock β로 해소.
  //   ★ TRANSMISSION_MAP보다 먼저 조회 — RTX/HAL 등 geo-shock 맵에만 있는 방산·서비스주가
  //     Brent 맵 부재로 no-beta에 걸리지 않게(배선 순서 버그 수정).
  if (driver === "vix") {
    const gs = GEO_SHOCK_MAP[ticker.toUpperCase()];
    if (!gs) {
      return { agreement: "no-beta", driver, beta: null, t: null, expected: null, chipNote: null };
    }
    const gExpected: "up" | "down" = gs.beta > 0 ? "up" : "down";
    const gBetaStr = `${gs.beta >= 0 ? "+" : ""}${gs.beta.toFixed(1)}`;
    const confident = Math.abs(gs.t) >= 2 && Math.sign(gs.beta) === Math.sign(gs.es);
    if (llmDirection === "watch") {
      return { agreement: "watch", driver, beta: gs.beta, t: gs.t, expected: gExpected, chipNote: `β地${gBetaStr}` };
    }
    if (!confident) {
      // 방향은 경제적으로 견고하나 통계적으로 약함 → 미검증(정보용 magnitude만).
      return { agreement: "unverified", driver, beta: gs.beta, t: gs.t, expected: gExpected, chipNote: `β地${gBetaStr}~` };
    }
    const agree = llmDirection === gExpected;
    return {
      agreement: agree ? "agree" : "disagree",
      driver, beta: gs.beta, t: gs.t, expected: gExpected,
      chipNote: `β地${gBetaStr}${agree ? "✓" : "⚠"}`,
    };
  }

  // chokepoint/infra_attack(Brent-driver): 유가 전파 β로 방향 판정.
  const a = TRANSMISSION_MAP[ticker.toUpperCase()];
  if (!a) {
    return { agreement: "no-beta", driver, beta: null, t: null, expected: null, chipNote: null };
  }
  const { beta, t } = a[driver];
  const expected: "up" | "down" = beta > 0 ? "up" : "down";
  const glyph = driver === "brent" ? "油" : "VIX";
  const betaStr = `${beta >= 0 ? "+" : ""}${beta.toFixed(2)}`;

  if (llmDirection === "watch") {
    return { agreement: "watch", driver, beta, t, expected, chipNote: `β${glyph}${betaStr}` };
  }
  if (Math.abs(t) < T_SIGNIF) {
    // β 약함 — 방향 미검증(회색). 물음표로 표기.
    return { agreement: "unverified", driver, beta, t, expected, chipNote: `β${glyph}${betaStr}?` };
  }
  const agree = llmDirection === expected;
  return {
    agreement: agree ? "agree" : "disagree",
    driver,
    beta,
    t,
    expected,
    chipNote: `β${glyph}${betaStr}${agree ? "✓" : "⚠"}`,
  };
}
