import type { NeptunConfidence, NeptunThreat, NeptunThreatType } from "@/lib/neptun";
import { translateTextToKorean } from "@/lib/koreanTranslate";

/** 지도·메뉴용 한글 위협 유형 (영문 레퍼런스 제거) */
export const NEPTUN_TYPE_LABEL_KO: Record<NeptunThreatType, string> = {
  uav: "드론 (샤헤드)",
  recon: "정찰 드론",
  missile: "순항 미사일",
  ballistic: "탄도 미사일",
  kab: "유도폭탄",
  mig31k: "전투기 미사일",
  unknown: "공중 위협",
};

export const NEPTUN_CONFIDENCE_LABEL_KO: Record<NeptunConfidence, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

export function neptunTypeLabel(type: string): string {
  return NEPTUN_TYPE_LABEL_KO[type as NeptunThreatType] ?? NEPTUN_TYPE_LABEL_KO.unknown;
}

export function neptunConfidenceLabel(level: NeptunConfidence): string {
  return NEPTUN_CONFIDENCE_LABEL_KO[level] ?? level;
}

export async function localizeNeptunThreatCopy(
  threat: Pick<NeptunThreat, "title" | "region" | "district" | "locality" | "explanationShort">,
  enabled: boolean,
): Promise<{
  title: string;
  location: string;
  explanation: string | null;
}> {
  const location = [threat.locality, threat.district, threat.region].filter(Boolean).join(" · ");
  if (!enabled) {
    return {
      title: threat.title || neptunTypeLabel("unknown"),
      location,
      explanation: threat.explanationShort ?? null,
    };
  }

  const [title, loc, explanation] = await Promise.all([
    threat.title ? translateTextToKorean(threat.title) : Promise.resolve(""),
    location ? translateTextToKorean(location) : Promise.resolve(""),
    threat.explanationShort
      ? translateTextToKorean(threat.explanationShort)
      : Promise.resolve(null),
  ]);

  return {
    title: title || threat.title,
    location: loc || location,
    explanation: explanation ?? threat.explanationShort ?? null,
  };
}

export async function localizeNeptunAlertName(name: string, enabled: boolean): Promise<string> {
  if (!enabled || !name.trim()) return name;
  return translateTextToKorean(name);
}
