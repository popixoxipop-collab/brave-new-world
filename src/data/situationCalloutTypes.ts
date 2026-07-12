import type { CombatTheaterId } from "@/lib/theaterCombat";

/** 전장 상황 콜아웃 — 우크라 ISW형 / IRONSIGHT형 공용 */
export type SituationCalloutSide = "blue" | "red" | "neutral";

export type SituationCallout = {
  id: string;
  theater: CombatTheaterId;
  lat: number;
  lng: number;
  title: string;
  body: string;
  side: SituationCalloutSide;
};

export const SITUATION_CALLOUT_ACCENT: Record<
  SituationCalloutSide,
  { border: string; bg: string; title: string }
> = {
  blue: { border: "rgba(96,165,250,0.85)", bg: "rgba(15,23,42,0.92)", title: "#93c5fd" },
  red: { border: "rgba(248,113,113,0.85)", bg: "rgba(15,23,42,0.92)", title: "#fca5a5" },
  neutral: { border: "rgba(251,191,36,0.85)", bg: "rgba(15,23,42,0.92)", title: "#fde68a" },
};
