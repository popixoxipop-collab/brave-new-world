/**
 * AIS ship type → 지정학(군) / 지경학(민) 분류.
 * ITU-R M.1371 ship and cargo type; MarineTraffic generic: 2/4/6/7/8.
 */

export type AisVesselCategory = "military" | "commercial" | "other";

export type AisClassFilter = "military" | "commercial" | "all";

const MILITARY_NAME =
  /\b(USS|HMS|HMAS|HMCS|HNLMS|HDMS|HSWMS|FS\s|FGS|ITS\s|ORP\s|ROKS|INS\s|JS\s|KRI\s|BRP\s|BNS\s|PLAN|PLANS|WARSHIP|NAVAL|DESTROYER|FRIGATE|CORVETTE|SUBMARINE|CARRIER|CVN)\b/i;

/** AIS Type 35 = Military ops; 55 = Law enforcement (군/치안으로 지정학에 포함) */
export function aisGenericClass(shipType: number | null | undefined): number | null {
  if (shipType == null || !Number.isFinite(shipType)) return null;
  return Math.floor(shipType / 10);
}

export function classifyAisVessel(input: {
  shipType?: number | null;
  shipName?: string | null;
}): AisVesselCategory {
  const type = input.shipType ?? null;
  if (type === 35 || type === 55) return "military";
  if (input.shipName && MILITARY_NAME.test(input.shipName)) return "military";

  const g = aisGenericClass(type);
  if (g === null) return "other";

  // 2 Fishing · 4 HSC · 6 Passenger · 7 Cargo · 8 Tanker
  if (g === 2 || g === 4 || g === 6 || g === 7 || g === 8) return "commercial";
  // 3x special craft except 35/55 already handled
  if (g === 3) return "other";
  // 9 Other / 0–1 reserved → other
  return "other";
}

export function aisShipTypeLabel(shipType: number | null | undefined): string | null {
  if (shipType == null || !Number.isFinite(shipType)) return null;
  const labels: Record<number, string> = {
    30: "Fishing",
    35: "Military",
    36: "Sailing",
    37: "Pleasure",
    40: "HSC",
    50: "Pilot",
    51: "SAR",
    52: "Tug",
    53: "Port tender",
    55: "Law enforcement",
    60: "Passenger",
    70: "Cargo",
    80: "Tanker",
    90: "Other",
  };
  if (labels[shipType]) return labels[shipType];
  const g = Math.floor(shipType / 10);
  const generic: Record<number, string> = {
    2: "Fishing",
    3: "Special",
    4: "HSC",
    5: "Special",
    6: "Passenger",
    7: "Cargo",
    8: "Tanker",
    9: "Other",
  };
  return generic[g] ?? `Type ${shipType}`;
}

/** 지정학: 군함만. 지경학: 민간(화물·탱커·여객 등). unknown은 민간 다수로 간주해 경제에만 포함. */
export function matchesAisClassFilter(
  category: AisVesselCategory,
  filter: AisClassFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "military") return category === "military";
  // commercial: include other (대부분 민간 AIS) so the economy map fills up
  return category === "commercial" || category === "other";
}

/** 민간 AIS — 함종별 색 (화물/탱커/여객/어선/고속선/기타) */
export function aisCommercialPointColor(shipType: number | null | undefined): string {
  if (shipType == null || !Number.isFinite(shipType)) return "rgba(148, 163, 184, 0.88)";
  if (shipType === 35 || shipType === 55) return "rgba(52, 211, 153, 0.92)";
  const g = Math.floor(shipType / 10);
  switch (g) {
    case 8:
      return "rgba(251, 146, 60, 0.92)"; // Tanker
    case 7:
      return "rgba(56, 189, 248, 0.92)"; // Cargo
    case 6:
      return "rgba(244, 114, 182, 0.92)"; // Passenger
    case 2:
      return "rgba(52, 211, 153, 0.9)"; // Fishing
    case 4:
      return "rgba(167, 139, 250, 0.92)"; // HSC
    case 3:
      return "rgba(250, 204, 21, 0.88)"; // Special
    default:
      return "rgba(125, 211, 252, 0.88)";
  }
}

export function parseAisClassFilter(raw: string | null): AisClassFilter {
  if (raw === "military" || raw === "commercial" || raw === "all") return raw;
  return "all";
}
