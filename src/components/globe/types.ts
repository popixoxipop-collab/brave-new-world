import type {
  AisVessel,
  ConflictEvent,
  ConflictZoneFeature,
  CountryFeature,
  DisputeArea,
  MilitaryAircraft,
  UkraineControlZone,
  UsCarrier,
} from "@/data/geoTypes";
import type { NeptunLiveThreat } from "@/lib/neptun";

export type Selection =
  | { kind: "event"; item: ConflictEvent }
  | { kind: "dispute"; item: DisputeArea }
  | { kind: "conflict-zone"; item: ConflictZoneFeature }
  | { kind: "country"; item: CountryFeature }
  | { kind: "ais"; item: AisVessel }
  | {
      kind: "mil";
      item: MilitaryAircraft;
      /** 지경학 민간 운항 vs 지정학 군용 */
      traffic?: "military" | "civil";
    }
  | { kind: "ukraine-control"; item: UkraineControlZone }
  | { kind: "us-carrier"; item: UsCarrier }
  | { kind: "neptun-threat"; item: NeptunLiveThreat };

export type AnalysisSelection = Exclude<Selection, { kind: "neptun-threat" }>;
