"use client";

import {
  forwardRef,
  startTransition,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { globeViewToMapLibre, mapLibreZoomToAltitude } from "@/lib/mapLibreBasemap";
import { createMapGlobeMethods, type MapGlobeMethods } from "@/lib/mapGlobeRef";
import {
  asFn,
  buildHeatmapGeoJson,
  buildLabelsGeoJson,
  buildPathsGeoJson,
  buildPointsGeoJson,
  buildPolygonsGeoJson,
  buildRingsGeoJson,
} from "@/lib/mapGlobeLayers";

/**
 * GlobeLayerProps(Record)와 intersection하면 index signature가 콜백을 unknown으로 넓힙니다.
 * 명시 필드 + [key: string]: unknown 으로 레이어 props는 허용하고 콜백 시그니처를 유지합니다.
 */
export interface MapGlobeViewProps {
  mapStyleUrl: string;
  backgroundColor?: string;
  onGlobeReady?: () => void;
  /** 빈 바다·지도 위 커서 좌표 (해역명 툴팁 등) */
  onGlobeMouseMove?: (coords: { lat: number; lng: number } | null) => void;
  /** MapLibre feature picking 대상 — VIINA 근접 줌에서 폴리곤 제외 등 */
  interactiveLayerIds?: readonly string[];
  [key: string]: unknown;
}

const INTERACTIVE_LAYERS = [
  "map-points",
  "map-paths",
  "map-polygons-fill",
  "map-rings",
  "ukraine-macro-fill",
  "ukraine-micro-fill",
  "ukraine-micro-defense",
  "ukraine-micro-combat-circle",
] as const;

export const MapGlobeView = forwardRef<MapGlobeMethods, MapGlobeViewProps>(function MapGlobeView(
  props,
  ref,
) {
  const { mapStyleUrl, backgroundColor = "#02040a" } = props;
  const onGlobeReady = props.onGlobeReady as (() => void) | undefined;
  const onGlobeMouseMove = props.onGlobeMouseMove as
    | ((coords: { lat: number; lng: number } | null) => void)
    | undefined;

  const mapRef = useRef<MapRef>(null);
  const changeListenersRef = useRef(new Set<() => void>());
  const readyRef = useRef(false);
  const onGlobeReadyRef = useRef<(() => void) | undefined>(onGlobeReady);
  const onGlobeMouseMoveRef = useRef<
    ((coords: { lat: number; lng: number } | null) => void) | undefined
  >(onGlobeMouseMove);
  const [mapZoom, setMapZoom] = useState(2);
  const [mapLoaded, setMapLoaded] = useState(false);
  /** onMove는 프레임마다 오므로 zoom→GeoJSON 재빌드는 idle 시에만 */
  const mapZoomRef = useRef(2);
  const lastZoomPublishAtRef = useRef(0);
  const pendingZoomPublishRef = useRef<number | null>(null);
  const moveIdleTimerRef = useRef<number | null>(null);
  const movingRef = useRef(false);

  useEffect(() => {
    onGlobeReadyRef.current = onGlobeReady;
  }, [onGlobeReady]);

  useEffect(() => {
    onGlobeMouseMoveRef.current = onGlobeMouseMove;
  }, [onGlobeMouseMove]);

  const methods = useMemo(
    () => createMapGlobeMethods(mapRef, changeListenersRef),
    [],
  );

  useImperativeHandle(ref, () => methods, [methods]);

  const pointsData = useMemo(() => (props.pointsData as unknown[]) ?? [], [props.pointsData]);
  const pathsData = useMemo(() => (props.pathsData as unknown[]) ?? [], [props.pathsData]);
  const [deferredPathsData, setDeferredPathsData] = useState(pathsData);

  useEffect(() => {
    if (pathsData.length < 64) {
      setDeferredPathsData(pathsData);
      return;
    }
    let cancelled = false;
    const raf = window.requestAnimationFrame(() => {
      if (cancelled) return;
      startTransition(() => {
        if (!cancelled) setDeferredPathsData(pathsData);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [pathsData]);

  const polygonsData = useMemo(
    () => (props.polygonsData as { geometry: unknown }[]) ?? [],
    [props.polygonsData],
  );
  const ringsData = useMemo(() => (props.ringsData as unknown[]) ?? [], [props.ringsData]);
  const labelsData = useMemo(() => (props.labelsData as unknown[]) ?? [], [props.labelsData]);
  const htmlElementsData = useMemo(
    () => (props.htmlElementsData as unknown[]) ?? [],
    [props.htmlElementsData],
  );
  const heatmapsData = useMemo(
    () =>
      (props.heatmapsData as {
        points: { lat: number; lng: number; weight: number }[];
        tier: string;
        bandwidth?: number;
        colorSaturation?: number;
      }[]) ?? [],
    [props.heatmapsData],
  );

  const emptyUkraineFc = useMemo<GeoJSON.FeatureCollection>(
    () => ({ type: "FeatureCollection", features: [] }),
    [],
  );
  const ukraineMacroGeoJson = useMemo(() => {
    const raw = props.ukraineMacroGeoJson as GeoJSON.FeatureCollection | undefined;
    return raw?.type === "FeatureCollection" ? raw : emptyUkraineFc;
  }, [emptyUkraineFc, props.ukraineMacroGeoJson]);
  const ukraineMicroGeoJson = useMemo(() => {
    const raw = props.ukraineMicroGeoJson as GeoJSON.FeatureCollection | undefined;
    return raw?.type === "FeatureCollection" ? raw : emptyUkraineFc;
  }, [emptyUkraineFc, props.ukraineMicroGeoJson]);

  const interactiveLayerIds = useMemo(() => {
    const fromProps = props.interactiveLayerIds;
    if (Array.isArray(fromProps) && fromProps.length > 0) {
      return [...fromProps];
    }
    return [...INTERACTIVE_LAYERS];
  }, [props.interactiveLayerIds]);

  const pointLat = asFn<unknown, number>(props.pointLat, () => 0);
  const pointLng = asFn<unknown, number>(props.pointLng, () => 0);
  const pointColor = asFn<unknown, string>(props.pointColor, () => "rgba(148,163,184,0.8)");
  const pointRadius = asFn<unknown, number>(props.pointRadius, () => 0.15);

  const pathPoints = asFn<unknown, { lat: number; lng: number; alt?: number }[]>(
    props.pathPoints,
    () => [],
  );
  const pathColor = asFn<unknown, string>(props.pathColor, () => "rgba(148,163,184,0.6)");
  const pathStroke = asFn<unknown, number>(props.pathStroke, () => 0.5);
  const pathDashLength = asFn<unknown, number>(props.pathDashLength, () => 0);
  const pathDashGap = asFn<unknown, number>(props.pathDashGap, () => 0);

  const polygonGeoJsonGeometry = asFn<unknown, GeoJSON.Geometry>(
    props.polygonGeoJsonGeometry,
    () => ({ type: "Polygon", coordinates: [] }),
  );
  const polygonCapColor = asFn<unknown, string>(props.polygonCapColor, () => "rgba(0,0,0,0)");
  const polygonStrokeColor = asFn<unknown, string>(props.polygonStrokeColor, () => "rgba(0,0,0,0)");
  const polygonFillOpacity = asFn<unknown, number>(props.polygonFillOpacity, () => 0.72);

  const ringLat = asFn<unknown, number>(props.ringLat, () => 0);
  const ringLng = asFn<unknown, number>(props.ringLng, () => 0);
  const ringColor = asFn<unknown, string>(props.ringColor, () => "rgba(250,204,21,0.45)");
  const ringMaxRadius = asFn<unknown, number>(props.ringMaxRadius, () => 1);

  const labelLat = asFn<unknown, number>(props.labelLat, () => 0);
  const labelLng = asFn<unknown, number>(props.labelLng, () => 0);
  const labelText = asFn<unknown, string>(props.labelText, () => "");
  const labelSize = asFn<unknown, number>(props.labelSize, () => 0.5);
  const labelColor = asFn<unknown, string>(props.labelColor, () => "rgba(226,232,240,0.9)");
  const labelDotRadius = asFn<unknown, number>(props.labelDotRadius, () => 0.08);

  const htmlLat = asFn<unknown, number>(props.htmlLat, () => 0);
  const htmlLng = asFn<unknown, number>(props.htmlLng, () => 0);
  const htmlElement = props.htmlElement as ((item: unknown) => HTMLElement) | undefined;
  const htmlRotation = asFn<unknown, number>(props.htmlRotation, () => 0);
  const htmlRotationAlignment = asFn<unknown, "map" | "viewport" | "auto">(
    props.htmlRotationAlignment,
    () => "viewport",
  );

  const onPointClick = props.onPointClick as ((item: unknown) => void) | undefined;
  const onPointHover = props.onPointHover as ((item: unknown | null) => void) | undefined;
  const onPathClick = props.onPathClick as ((item: unknown) => void) | undefined;
  const onPathHover = props.onPathHover as ((item: unknown | null) => void) | undefined;
  const onPolygonClick = props.onPolygonClick as ((item: unknown) => void) | undefined;
  const onPolygonHover = props.onPolygonHover as ((item: unknown | null) => void) | undefined;
  const onGlobeClick = props.onGlobeClick as
    | ((coords: { lat: number; lng: number }) => void)
    | undefined;

  /** inline accessor props는 매 렌더 새 참조 → GeoJSON deps에서 제외하고 ref로만 읽음 */
  const accessorsRef = useRef({
    pointLat,
    pointLng,
    pointColor,
    pointRadius,
    pathPoints,
    pathColor,
    pathStroke,
    pathDashLength,
    pathDashGap,
    polygonGeoJsonGeometry,
    polygonCapColor,
    polygonStrokeColor,
    polygonFillOpacity,
    ringLat,
    ringLng,
    ringColor,
    ringMaxRadius,
    labelLat,
    labelLng,
    labelText,
    labelSize,
    labelColor,
    labelDotRadius,
  });
  accessorsRef.current = {
    pointLat,
    pointLng,
    pointColor,
    pointRadius,
    pathPoints,
    pathColor,
    pathStroke,
    pathDashLength,
    pathDashGap,
    polygonGeoJsonGeometry,
    polygonCapColor,
    polygonStrokeColor,
    polygonFillOpacity,
    ringLat,
    ringLng,
    ringColor,
    ringMaxRadius,
    labelLat,
    labelLng,
    labelText,
    labelSize,
    labelColor,
    labelDotRadius,
  };

  const pointsGeoJson = useMemo(() => {
    const a = accessorsRef.current;
    return buildPointsGeoJson(
      pointsData,
      { lat: a.pointLat, lng: a.pointLng, color: a.pointColor, radius: a.pointRadius },
      mapZoom,
    );
  }, [mapZoom, pointsData]);

  const pathsGeoJson = useMemo(() => {
    const a = accessorsRef.current;
    return buildPathsGeoJson(
      deferredPathsData,
      {
        points: a.pathPoints,
        color: a.pathColor,
        stroke: a.pathStroke,
        dashLength: a.pathDashLength,
        dashGap: a.pathDashGap,
      },
      mapZoom,
    );
  }, [mapZoom, deferredPathsData]);

  const polygonsGeoJson = useMemo(() => {
    const a = accessorsRef.current;
    return buildPolygonsGeoJson(polygonsData, {
      geometry: a.polygonGeoJsonGeometry,
      fillColor: a.polygonCapColor,
      strokeColor: a.polygonStrokeColor,
      fillOpacity: a.polygonFillOpacity,
    });
  }, [polygonsData]);

  const ringsGeoJson = useMemo(() => {
    const a = accessorsRef.current;
    return buildRingsGeoJson(
      ringsData,
      { lat: a.ringLat, lng: a.ringLng, color: a.ringColor, maxRadius: a.ringMaxRadius },
      mapZoom,
    );
  }, [mapZoom, ringsData]);

  const labelsGeoJson = useMemo(() => {
    const a = accessorsRef.current;
    return buildLabelsGeoJson(
      labelsData,
      {
        lat: a.labelLat,
        lng: a.labelLng,
        text: a.labelText,
        size: a.labelSize,
        color: a.labelColor,
        dotRadius: a.labelDotRadius,
      },
      mapZoom,
    );
  }, [labelsData, mapZoom]);

  const heatmapCollections = useMemo(() => buildHeatmapGeoJson(heatmapsData), [heatmapsData]);

  const notifyChange = useCallback(() => {
    changeListenersRef.current.forEach((listener) => listener());
  }, []);

  const publishZoom = useCallback((zoom: number, force = false) => {
    mapZoomRef.current = zoom;
    const now = performance.now();
    const ZOOM_PUBLISH_MS = 150;
    if (!force && now - lastZoomPublishAtRef.current < ZOOM_PUBLISH_MS) {
      if (pendingZoomPublishRef.current == null) {
        pendingZoomPublishRef.current = window.setTimeout(() => {
          pendingZoomPublishRef.current = null;
          lastZoomPublishAtRef.current = performance.now();
          setMapZoom(mapZoomRef.current);
        }, ZOOM_PUBLISH_MS);
      }
      return;
    }
    if (pendingZoomPublishRef.current != null) {
      window.clearTimeout(pendingZoomPublishRef.current);
      pendingZoomPublishRef.current = null;
    }
    lastZoomPublishAtRef.current = now;
    setMapZoom(zoom);
  }, []);

  const handleMove = useCallback(
    (event: { viewState: { zoom: number } }) => {
      mapZoomRef.current = event.viewState.zoom;
      movingRef.current = true;
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
      }
      // GeoJSON zoom은 idle 후 1회 — notify는 idle 타이머 리셋용으로 매 프레임 유지(setState 없음)
      moveIdleTimerRef.current = window.setTimeout(() => {
        movingRef.current = false;
        publishZoom(mapZoomRef.current, true);
      }, 420);
      notifyChange();
    },
    [notifyChange, publishZoom],
  );

  useEffect(() => {
    return () => {
      if (pendingZoomPublishRef.current != null) {
        window.clearTimeout(pendingZoomPublishRef.current);
      }
      if (moveIdleTimerRef.current != null) {
        window.clearTimeout(moveIdleTimerRef.current);
      }
    };
  }, []);

  const emitGlobeReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onGlobeReadyRef.current?.();
    notifyChange();
  }, [notifyChange]);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setProjection({ type: "globe" });
    publishZoom(map.getZoom(), true);
    setMapLoaded(true);

    if (map.isStyleLoaded()) {
      emitGlobeReady();
      return;
    }

    map.once("idle", emitGlobeReady);
  }, [emitGlobeReady, publishZoom]);

  const resolveFeature = useCallback(
    (layerId: string, index: number) => {
      if (layerId === "map-points") return pointsData[index] ?? null;
      if (layerId === "map-paths") return deferredPathsData[index] ?? null;
      if (layerId === "map-polygons-fill") return polygonsData[index] ?? null;
      if (layerId === "map-rings") return ringsData[index] ?? null;
      return null;
    },
    [deferredPathsData, pointsData, polygonsData, ringsData],
  );

  const handleMapClick = useCallback(
    (event: { lngLat: { lat: number; lng: number }; features?: { layer?: { id?: string }; properties?: { index?: number } }[] }) => {
      const features = event.features ?? [];
      for (const feature of features) {
        const layerId = feature.layer?.id;
        const index = feature.properties?.index;
        if (layerId == null || index == null) continue;
        const item = resolveFeature(layerId, Number(index));
        if (!item) continue;
        if (layerId === "map-points") {
          onPointClick?.(item);
          return;
        }
        if (layerId === "map-paths") {
          onPathClick?.(item);
          return;
        }
        if (layerId === "map-polygons-fill") {
          onPolygonClick?.(item);
          return;
        }
      }
      onGlobeClick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    },
    [onGlobeClick, onPathClick, onPointClick, onPolygonClick, resolveFeature],
  );

  const handleMapMouseMove = useCallback(
    (event: {
      lngLat: { lat: number; lng: number };
      features?: { layer?: { id?: string }; properties?: { index?: number } }[];
    }) => {
      const { lat, lng } = event.lngLat;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        onGlobeMouseMoveRef.current?.({ lat, lng });
      }

      const features = event.features ?? [];
      for (const feature of features) {
        const layerId = feature.layer?.id;
        const index = feature.properties?.index;
        if (layerId == null || index == null) continue;
        const item = resolveFeature(layerId, Number(index));
        if (!item) continue;
        if (layerId === "map-points") {
          onPointHover?.(item);
          return;
        }
        if (layerId === "map-paths") {
          onPathHover?.(item);
          return;
        }
        if (layerId === "map-polygons-fill") {
          onPolygonHover?.(item);
          return;
        }
      }
      onPointHover?.(null);
      onPathHover?.(null);
      onPolygonHover?.(null);
    },
    [onPathHover, onPointHover, onPolygonHover, resolveFeature],
  );

  const handleMapMouseLeave = useCallback(() => {
    onGlobeMouseMoveRef.current?.(null);
    onPointHover?.(null);
    onPathHover?.(null);
    onPolygonHover?.(null);
  }, [onPathHover, onPointHover, onPolygonHover]);

  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.on("moveend", notifyChange);
    return () => {
      map.off("moveend", notifyChange);
    };
  }, [mapLoaded, notifyChange]);

  const initialCamera = globeViewToMapLibre({ lat: 25, lng: 105, altitude: 2.25 });

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: backgroundColor as string }}>
      <Map
        ref={mapRef}
        mapStyle={mapStyleUrl as string}
        initialViewState={{
          longitude: initialCamera.longitude,
          latitude: initialCamera.latitude,
          zoom: initialCamera.zoom,
          pitch: initialCamera.pitch,
          bearing: initialCamera.bearing,
        }}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        renderWorldCopies={false}
        interactiveLayerIds={interactiveLayerIds}
        onLoad={handleLoad}
        onMove={handleMove}
        onClick={handleMapClick}
        onMouseMove={handleMapMouseMove}
        onMouseLeave={handleMapMouseLeave}
        cursor="grab"
      >
        {polygonsGeoJson.features.length > 0 ? (
          <Source id="map-polygons" type="geojson" data={polygonsGeoJson}>
            <Layer
              id="map-polygons-fill"
              type="fill"
              paint={{
                "fill-color": ["get", "fill"],
                "fill-opacity": ["get", "fillOpacity"],
              }}
            />
            <Layer
              id="map-polygons-line"
              type="line"
              paint={{
                "line-color": ["get", "stroke"],
                "line-width": 1.1,
                "line-opacity": 0.85,
              }}
            />
          </Source>
        ) : null}

        {pathsGeoJson.features.length > 0 ? (
          <Source id="map-paths-source" type="geojson" data={pathsGeoJson}>
            <Layer
              id="map-paths"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": ["get", "width"],
                "line-opacity": 0.92,
                "line-dasharray": [
                  "case",
                  [">", ["get", "dashLength"], 0],
                  ["literal", [2, 1.2]],
                  ["literal", [1, 0]],
                ],
              }}
            />
          </Source>
        ) : null}

        {pointsGeoJson.features.length > 0 ? (
          <Source id="map-points-source" type="geojson" data={pointsGeoJson}>
            <Layer
              id="map-points"
              type="circle"
              paint={{
                "circle-color": ["get", "color"],
                "circle-radius": ["get", "radius"],
                "circle-opacity": 0.92,
                "circle-stroke-width": 0.5,
                "circle-stroke-color": "rgba(2,4,10,0.55)",
              }}
            />
          </Source>
        ) : null}

        {ringsGeoJson.features.length > 0 ? (
          <Source id="map-rings-source" type="geojson" data={ringsGeoJson}>
            <Layer
              id="map-rings"
              type="circle"
              paint={{
                "circle-color": ["get", "color"],
                "circle-radius": ["get", "radius"],
                "circle-opacity": 0.35,
                "circle-stroke-width": 1,
                "circle-stroke-color": ["get", "color"],
              }}
            />
          </Source>
        ) : null}

        {/* 우크라 전선 LOD: macro Zoom≤5 · micro Zoom≥6 — 좌표는 항상 [lng,lat] GeoJSON */}
        {ukraineMacroGeoJson.features.length > 0 ? (
          <Source id="ukraine-macro-source" type="geojson" data={ukraineMacroGeoJson}>
            <Layer
              id="ukraine-macro-fill"
              type="fill"
              maxzoom={6}
              filter={[
                "all",
                ["==", ["geometry-type"], "Polygon"],
                ["in", ["get", "role"], ["literal", ["ru-occupied", "ua-occupied", "ru-claimed", "ua-claimed"]]],
              ]}
              paint={{
                "fill-color": ["coalesce", ["get", "fill"], "#b91c1c"],
                "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.34],
              }}
            />
            <Layer
              id="ukraine-macro-outline"
              type="line"
              maxzoom={6}
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "#fecaca"],
                "line-width": 1.4,
                "line-opacity": 0.85,
              }}
            />
            <Layer
              id="ukraine-macro-hatch"
              type="line"
              maxzoom={6}
              filter={[
                "all",
                ["==", ["geometry-type"], "LineString"],
                ["==", ["get", "role"], "hatch"],
              ]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "rgba(248,113,113,0.5)"],
                "line-width": 0.9,
                "line-opacity": 0.7,
              }}
            />
          </Source>
        ) : null}

        {ukraineMicroGeoJson.features.length > 0 ? (
          <Source id="ukraine-micro-source" type="geojson" data={ukraineMicroGeoJson}>
            <Layer
              id="ukraine-micro-fill"
              type="fill"
              minzoom={6}
              filter={[
                "all",
                ["==", ["geometry-type"], "Polygon"],
                ["in", ["get", "role"], ["literal", ["ru-occupied", "ua-occupied", "ru-claimed", "ua-claimed"]]],
              ]}
              paint={{
                "fill-color": ["coalesce", ["get", "fill"], "#f97316"],
                "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.4],
              }}
            />
            <Layer
              id="ukraine-micro-outline"
              type="line"
              minzoom={6}
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "#fed7aa"],
                "line-width": 1.1,
                "line-opacity": 0.9,
              }}
            />
            <Layer
              id="ukraine-micro-defense"
              type="line"
              minzoom={6}
              filter={[
                "all",
                ["==", ["geometry-type"], "LineString"],
                ["==", ["get", "role"], "defense-line"],
              ]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "#f87171"],
                "line-width": 2.2,
                "line-opacity": 0.95,
              }}
            />
            <Layer
              id="ukraine-micro-advance"
              type="line"
              minzoom={6}
              filter={[
                "all",
                ["==", ["geometry-type"], "LineString"],
                ["in", ["get", "role"], ["literal", ["advance", "hatch"]]],
              ]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "#38bdf8"],
                "line-width": 1.6,
                "line-opacity": 0.88,
                "line-dasharray": [2, 1.2],
              }}
            />
            <Layer
              id="ukraine-micro-combat-circle"
              type="circle"
              minzoom={6}
              filter={[
                "all",
                ["==", ["geometry-type"], "Point"],
                ["==", ["get", "role"], "combat-ring"],
              ]}
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6,
                  10,
                  10,
                  22,
                  13,
                  36,
                ],
                "circle-color": ["coalesce", ["get", "fill"], "#22c55e"],
                "circle-opacity": 0.28,
                "circle-stroke-width": 2,
                "circle-stroke-color": ["coalesce", ["get", "stroke"], "#86efac"],
              }}
            />
            <Layer
              id="ukraine-micro-combat-ring-line"
              type="line"
              minzoom={6}
              filter={[
                "all",
                ["==", ["geometry-type"], "LineString"],
                ["==", ["get", "role"], "combat-ring"],
              ]}
              paint={{
                "line-color": ["coalesce", ["get", "stroke"], "#4ade80"],
                "line-width": 1.5,
                "line-opacity": 0.85,
              }}
            />
          </Source>
        ) : null}

        {labelsGeoJson.features.length > 0 ? (
          <Source id="map-labels-source" type="geojson" data={labelsGeoJson}>
            <Layer
              id="map-labels-dot"
              type="circle"
              paint={{
                "circle-color": ["get", "color"],
                "circle-radius": ["get", "dotRadius"],
                "circle-opacity": 0.9,
              }}
            />
            <Layer
              id="map-labels-text"
              type="symbol"
              layout={{
                "text-field": ["get", "label"],
                "text-size": ["get", "size"],
                "text-offset": [0, 0.8],
                "text-anchor": "top",
                "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
              }}
              paint={{
                "text-color": ["get", "color"],
                "text-halo-color": "rgba(2,4,10,0.75)",
                "text-halo-width": 1,
              }}
            />
          </Source>
        ) : null}

        {heatmapCollections.map((collection, index) =>
          collection.features.length > 0 ? (
            <Source
              key={`heatmap-${index}`}
              id={`map-heatmap-${index}`}
              type="geojson"
              data={collection}
            >
              <Layer
                id={`map-heatmap-layer-${index}`}
                type="heatmap"
                paint={{
                  "heatmap-weight": ["get", "weight"],
                  "heatmap-intensity": 0.65,
                  "heatmap-radius": 18,
                  "heatmap-opacity": 0.55,
                }}
              />
            </Source>
          ) : null,
        )}

        {htmlElement
          ? htmlElementsData.map((item, index) => {
              const id =
                (item as { markerId?: string; id?: string }).markerId ??
                (item as { id?: string }).id ??
                index;
              const rotation = htmlRotation(item);
              const alignment = htmlRotationAlignment(item);
              const rotKey =
                alignment === "map" ? Math.round((((rotation % 360) + 360) % 360) / 5) * 5 : 0;
              return (
              <Marker
                key={`html-marker-${id}-r${rotKey}`}
                longitude={htmlLng(item)}
                latitude={htmlLat(item)}
                anchor="center"
                rotation={rotation}
                rotationAlignment={alignment}
                pitchAlignment="viewport"
              >
                <div
                  ref={(node) => {
                    if (!node || node.childElementCount > 0) return;
                    const el = htmlElement(item);
                    node.appendChild(el);
                  }}
                />
              </Marker>
              );
            })
          : null}
      </Map>
    </div>
  );
});

export { mapLibreZoomToAltitude };
