import { getGlobeLod } from "@/lib/globeLod";
import { isVisibleAtAltitude, type ScoredEvent } from "@/data/eventTiers";

export type HeatmapPoint = { lat: number; lng: number; weight: number };

export type TensionHeatmapLayer = {
  id: string;
  tier: "war" | "diplomatic";
  points: HeatmapPoint[];
  bandwidth: number;
  colorSaturation: number;
};

function getHeatmapWeight(event: ScoredEvent): number {
  const tensionPart = event.tensionScore / 100;
  const scopeBoost =
    event.greatPowerScope === "rivalry" ? 0.42 : event.greatPowerScope === "intervention" ? 0.24 : 0;
  return 0.22 + tensionPart * 0.52 + scopeBoost;
}

function getBandwidth(altitude: number, tier: "war" | "diplomatic"): number {
  const base = tier === "war" ? 1.5 : 1.85;
  const { tier: lodTier } = getGlobeLod(altitude);
  if (lodTier === "global") return base * 2.1;
  if (lodTier === "continent") return base * 1.5;
  if (lodTier === "regional") return base * 1.18;
  return base;
}

export function warHeatmapColor(t: number): string {
  const alpha = Math.min(0.7, Math.pow(Math.max(0, t), 1.22) * 0.74);
  return `rgba(239, 68, 68, ${alpha})`;
}

export function diplomaticHeatmapColor(t: number): string {
  const alpha = Math.min(0.64, Math.pow(Math.max(0, t), 1.18) * 0.68);
  return `rgba(251, 146, 60, ${alpha})`;
}

export function buildTensionHeatmaps(
  events: ScoredEvent[],
  options: { showWar: boolean; showDiplomatic: boolean; altitude: number },
): TensionHeatmapLayer[] {
  const { showWar, showDiplomatic, altitude } = options;
  const layers: TensionHeatmapLayer[] = [];

  const visible = events.filter((event) =>
    isVisibleAtAltitude(event, event.greatPowerScope, altitude),
  );

  if (showWar) {
    const warEvents = visible.filter((event) => event.eventTier === "war");
    if (warEvents.length > 0) {
      layers.push({
        id: "war-glow",
        tier: "war",
        points: warEvents.map((event) => ({
          lat: event.lat,
          lng: event.lng,
          weight: getHeatmapWeight(event),
        })),
        bandwidth: getBandwidth(altitude, "war"),
        colorSaturation: 1.32,
      });
    }
  }

  if (showDiplomatic) {
    const diplomaticEvents = visible.filter((event) => event.eventTier === "diplomatic");
    if (diplomaticEvents.length > 0) {
      layers.push({
        id: "diplomatic-glow",
        tier: "diplomatic",
        points: diplomaticEvents.map((event) => ({
          lat: event.lat,
          lng: event.lng,
          weight: getHeatmapWeight(event),
        })),
        bandwidth: getBandwidth(altitude, "diplomatic"),
        colorSaturation: 1.48,
      });
    }
  }

  return layers;
}
