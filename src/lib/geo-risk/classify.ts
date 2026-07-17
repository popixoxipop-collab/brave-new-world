/**
 * geo-risk-desk 이벤트 분류기 — Telegram/뉴스 텍스트를 구조화 이벤트로.
 *
 * D6: 초기 버전은 결정론적 키워드 룰(감사 가능·무비용·저지연). Claude 분류로 승격은
 * event volume이 룰의 정밀도를 넘어설 때(Tier 2 2단 퍼널). 지금은 룰이 first-pass 게이트다.
 * WHY 룰 우선: 하루 수백 이벤트에 전부 LLM을 태우면 비용·지연 폭발(죽음의 문제 ③). 룰로
 *   먼저 걸러 L2+만 Claude로 보낸다. COST: 신조어/우회 표현 놓침. EXIT: Haiku 분류로 교체.
 */
import type { Classification, EventClass, Severity } from "./types";

/** 알려진 초크포인트/분쟁지 → 좌표 (지도 pin용). 소문자 키. */
const GEO_COORDS: Record<string, { geography: string; lat: number; lon: number }> = {
  hormuz: { geography: "Strait of Hormuz", lat: 26.57, lon: 56.25 },
  "bab el-mandeb": { geography: "Bab el-Mandeb", lat: 12.58, lon: 43.33 },
  "bab-el-mandeb": { geography: "Bab el-Mandeb", lat: 12.58, lon: 43.33 },
  suez: { geography: "Suez Canal", lat: 30.42, lon: 32.35 },
  malacca: { geography: "Strait of Malacca", lat: 2.5, lon: 101.0 },
  "taiwan strait": { geography: "Taiwan Strait", lat: 24.0, lon: 119.5 },
  "red sea": { geography: "Red Sea", lat: 20.0, lon: 38.0 },
  bosphorus: { geography: "Bosphorus", lat: 41.12, lon: 29.07 },
  panama: { geography: "Panama Canal", lat: 9.08, lon: -79.68 },
};

/** event_class → 키워드. 순서 = 우선순위(먼저 매칭되는 클래스 채택). */
const CLASS_KEYWORDS: Array<{ cls: EventClass; kw: string[] }> = [
  {
    cls: "chokepoint_disruption",
    kw: ["hormuz", "strait", "suez", "bab el-mandeb", "bab-el-mandeb", "malacca",
         "taiwan strait", "red sea", "bosphorus", "canal", "blockade", "blockaded",
         "transit halt", "shipping lane", "chokepoint"],
  },
  {
    cls: "sanction",
    kw: ["sanction", "sanctioned", "ofac", "sdn list", "designation", "designated",
         "embargo", "frozen assets", "asset freeze", "export control", "blacklist"],
  },
  {
    cls: "infra_attack",
    kw: ["pipeline", "refinery", "oil terminal", "lng terminal", "power plant",
         "substation", "undersea cable", "port strike", "drone strike", "missile strike",
         "sabotage", "explosion at"],
  },
  {
    cls: "conflict_shift",
    kw: ["offensive", "captured", "seized", "front line", "frontline", "breakthrough",
         "counteroffensive", "advance on", "retreat", "encircled", "airstrike", "shelling"],
  },
];

/** 강신호(단일 언급으로도 L2) — 즉각적 시장 영향 키워드. */
const STRONG_SIGNAL = [
  "blockade", "blockaded", "closed", "halt", "explosion", "attack", "strike",
  "seized", "sanction", "embargo", "war", "invasion",
];

/**
 * 텍스트를 분류한다. 어떤 클래스에도 안 걸리면 eventClass="other".
 * @param corroborationCount 같은 사건을 뒷받침한 독립 소스 수 (2-source 게이트 입력).
 */
export function classifyText(text: string, corroborationCount = 1): Classification {
  const lower = text.toLowerCase();
  const matched: string[] = [];

  let eventClass: EventClass = "other";
  for (const { cls, kw } of CLASS_KEYWORDS) {
    const hits = kw.filter((k) => lower.includes(k));
    if (hits.length > 0) {
      eventClass = cls;
      matched.push(...hits);
      break; // 우선순위 순 — 첫 매칭 클래스 채택
    }
  }

  // 지리 매칭 (초크포인트 좌표)
  let geography: string | null = null;
  let lat: number | null = null;
  let lon: number | null = null;
  for (const [key, geo] of Object.entries(GEO_COORDS)) {
    if (lower.includes(key)) {
      geography = geo.geography;
      lat = geo.lat;
      lon = geo.lon;
      if (!matched.includes(key)) matched.push(key);
      break;
    }
  }

  // severity: 강신호 존재 or 다중 소스면 L2, 강신호+다중이면 L3
  const hasStrong = STRONG_SIGNAL.some((k) => lower.includes(k));
  const multiSource = corroborationCount >= 2;
  let severity: Severity = "L1";
  if (hasStrong && multiSource) severity = "L3";
  else if (hasStrong || multiSource) severity = "L2";

  return { eventClass, geography, severity, lat, lon, matchedKeywords: matched };
}

/** L2 이상이고 관심 클래스면 full 분석 승격 대상. */
export function shouldPromote(c: Classification): boolean {
  return c.severity !== "L1" && c.eventClass !== "other";
}
