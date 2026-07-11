import type { MutableRefObject, RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { clampGlobeAltitude } from "@/lib/globeCamera";
import { globeViewToMapLibre, mapLibreZoomToAltitude } from "@/lib/mapLibreBasemap";

export type GlobePointOfView = {
  lat: number;
  lng: number;
  altitude: number;
};

export type MapGlobeControls = {
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  addEventListener: (type: "change", listener: () => void) => void;
  removeEventListener: (type: "change", listener: () => void) => void;
};

export type MapGlobeMethods = {
  pointOfView: (pov?: GlobePointOfView, durationMs?: number) => GlobePointOfView;
  toGlobeCoords: (x: number, y: number) => { lat: number; lng: number } | null;
  controls: () => MapGlobeControls;
  renderer: () => { domElement: HTMLCanvasElement | null };
};

type ChangeListener = () => void;

export function createMapGlobeMethods(
  mapRef: RefObject<MapRef | null>,
  changeListenersRef: MutableRefObject<Set<ChangeListener>>,
): MapGlobeMethods {
  const readPov = (): GlobePointOfView => {
    const map = mapRef.current?.getMap();
    if (!map) return { lat: 25, lng: 105, altitude: 2.25 };
    const center = map.getCenter();
    return {
      lat: center.lat,
      lng: center.lng,
      altitude: mapLibreZoomToAltitude(map.getZoom()),
    };
  };

  return {
    pointOfView(pov, durationMs = 0) {
      const map = mapRef.current?.getMap();
      if (!map) return readPov();

      if (!pov) return readPov();

      const alt = clampGlobeAltitude(pov.altitude);
      const camera = globeViewToMapLibre({ lat: pov.lat, lng: pov.lng, altitude: alt });

      if (durationMs > 0) {
        map.easeTo({
          center: [camera.longitude, camera.latitude],
          zoom: camera.zoom,
          pitch: camera.pitch,
          bearing: camera.bearing,
          duration: durationMs,
        });
      } else {
        map.jumpTo({
          center: [camera.longitude, camera.latitude],
          zoom: camera.zoom,
          pitch: camera.pitch,
          bearing: camera.bearing,
        });
      }

      return { lat: pov.lat, lng: pov.lng, altitude: alt };
    },

    toGlobeCoords(x, y) {
      const map = mapRef.current?.getMap();
      if (!map) return null;
      const lngLat = map.unproject([x, y]);
      if (!Number.isFinite(lngLat.lat) || !Number.isFinite(lngLat.lng)) return null;
      return { lat: lngLat.lat, lng: lngLat.lng };
    },

    controls() {
      return {
        enableDamping: true,
        dampingFactor: 0.08,
        minDistance: 0,
        maxDistance: 720,
        autoRotate: false,
        autoRotateSpeed: 0.18,
        addEventListener(type, listener) {
          if (type === "change") changeListenersRef.current.add(listener);
        },
        removeEventListener(type, listener) {
          if (type === "change") changeListenersRef.current.delete(listener);
        },
      };
    },

    renderer() {
      const canvas = mapRef.current?.getCanvas() ?? null;
      return { domElement: canvas };
    },
  };
}
