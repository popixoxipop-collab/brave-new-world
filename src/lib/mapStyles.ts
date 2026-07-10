import type { MapStyleMode } from "@/lib/layerPrefs";
import {
  CYBER_WAR_ROOM_THEME,
  cyberCoastlineColor,
} from "@/lib/cyberWarRoomTheme";

/** 로컬 우선 — `npm run textures:fetch` 로 public/textures 에 저장 */
const TEXTURE_BY_MODE: Record<
  MapStyleMode,
  { globeImageUrl: string; bumpImageUrl: string | null }
> = {
  night: {
    globeImageUrl: "/textures/earth-night.jpg",
    bumpImageUrl: null,
  },
  satellite: {
    globeImageUrl: "/textures/earth-blue-marble.jpg",
    bumpImageUrl: null,
  },
  topo: {
    globeImageUrl: "/textures/earth-etopo-topo.jpg",
    bumpImageUrl: "/textures/earth-topology.png",
  },
};

/** 로컬 텍스처 없을 때 CDN 폴백 */
export const TEXTURE_CDN_FALLBACK: Record<MapStyleMode, string> = {
  night: "https://unpkg.com/three-globe/example/img/earth-night.jpg",
  satellite: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  topo: "https://unpkg.com/three-globe/example/img/earth-water.png",
};

export type GlobeTextureConfig = {
  /** false면 JPG 텍스처 베이스맵, 국가 폴리곤은 투명(클릭용) */
  vectorBase: boolean;
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

export function getGlobeTextures(mode: MapStyleMode): GlobeTextureConfig {
  const { globe, polygon } = CYBER_WAR_ROOM_THEME;
  const textures = TEXTURE_BY_MODE[mode] ?? TEXTURE_BY_MODE.night;

  return {
    vectorBase: false,
    globeImageUrl: textures.globeImageUrl,
    bumpImageUrl: textures.bumpImageUrl,
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
