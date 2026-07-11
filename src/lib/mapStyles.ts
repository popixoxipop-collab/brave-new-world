import {
  CYBER_WAR_ROOM_THEME,
  cyberCoastlineColor,
} from "@/lib/cyberWarRoomTheme";
import { getMapLibreStyleUrl } from "@/lib/mapLibreBasemap";

export type GlobeTextureConfig = {
  /** true면 MapLibre 벡터 글로브 단일 렌더 */
  vectorBase: boolean;
  mapStyleUrl: string;
  globeImageUrl: string | null;
  bumpImageUrl: string | null;
  backgroundColor: string;
  oceanColor: string;
  landFillColor: string;
  coastlineColor: string;
  borderColor: string;
  conflictZoneFill: string;
  borderStrokeWidth: number;
  countryColors: Record<string, string>;
};

export function getGlobeTextures(): GlobeTextureConfig {
  const { globe, polygon } = CYBER_WAR_ROOM_THEME;

  return {
    vectorBase: true,
    mapStyleUrl: getMapLibreStyleUrl(),
    globeImageUrl: null,
    bumpImageUrl: null,
    backgroundColor: globe.backgroundColor,
    oceanColor: globe.oceanColor,
    landFillColor: polygon.defaultFill,
    coastlineColor: cyberCoastlineColor(),
    borderColor: polygon.strokeColor,
    conflictZoneFill: polygon.conflictZoneFill,
    borderStrokeWidth: polygon.strokeWidth,
    countryColors: {},
  };
}
