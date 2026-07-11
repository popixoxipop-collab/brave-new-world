"use client";

import {
  forwardRef,
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
  type GlobeLayerProps,
} from "@/lib/mapGlobeLayers";

export type MapGlobeViewProps = GlobeLayerProps & {
  mapStyleUrl: string;
  backgroundColor?: string;
  onGlobeReady?: () => void;
};

const INTERACTIVE_LAYERS = [
  "map-points",
  "map-paths",
  "map-polygons-fill",
  "map-rings",
] as const;

export const MapGlobeView = forwardRef<MapGlobeMethods, MapGlobeViewProps>(function MapGlobeView(
  props,
  ref,
) {
  const {
    mapStyleUrl,
    backgroundColor = "#02040a",
    onGlobeReady,
  } = props;

  const mapRef = useRef<MapRef>(null);
  const changeListenersRef = useRef(new Set<() => void>());
  const readyRef = useRef(false);
  const onGlobeReadyRef = useRef(onGlobeReady);
  const [mapZoom, setMapZoom] = useState(2);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    onGlobeReadyRef.current = onGlobeReady;
  }, [onGlobeReady]);

  const methods = useMemo(
    () => createMapGlobeMethods(mapRef, changeListenersRef),
    [],
  );

  useImperativeHandle(ref, () => methods, [methods]);

  const pointsData = useMemo(() => (props.pointsData as unknown[]) ?? [], [props.pointsData]);
  const pathsData = useMemo(() => (props.pathsData as unknown[]) ?? [], [props.pathsData]);
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

  const onPointClick = props.onPointClick as ((item: unknown) => void) | undefined;
  const onPointHover = props.onPointHover as ((item: unknown | null) => void) | undefined;
  const onPathClick = props.onPathClick as ((item: unknown) => void) | undefined;
  const onPathHover = props.onPathHover as ((item: unknown | null) => void) | undefined;
  const onPolygonClick = props.onPolygonClick as ((item: unknown) => void) | undefined;
  const onPolygonHover = props.onPolygonHover as ((item: unknown | null) => void) | undefined;
  const onGlobeClick = props.onGlobeClick as
    | ((coords: { lat: number; lng: number }) => void)
    | undefined;

  const pointsGeoJson = useMemo(
    () =>
      buildPointsGeoJson(pointsData, { lat: pointLat, lng: pointLng, color: pointColor, radius: pointRadius }, mapZoom),
    [mapZoom, pointColor, pointLat, pointLng, pointRadius, pointsData],
  );

  const pathsGeoJson = useMemo(
    () =>
      buildPathsGeoJson(
        pathsData,
        {
          points: pathPoints,
          color: pathColor,
          stroke: pathStroke,
          dashLength: pathDashLength,
          dashGap: pathDashGap,
        },
        mapZoom,
      ),
    [mapZoom, pathColor, pathDashGap, pathDashLength, pathPoints, pathStroke, pathsData],
  );

  const polygonsGeoJson = useMemo(
    () =>
      buildPolygonsGeoJson(polygonsData, {
        geometry: polygonGeoJsonGeometry,
        fillColor: polygonCapColor,
        strokeColor: polygonStrokeColor,
      }),
    [polygonCapColor, polygonGeoJsonGeometry, polygonStrokeColor, polygonsData],
  );

  const ringsGeoJson = useMemo(
    () =>
      buildRingsGeoJson(
        ringsData,
        { lat: ringLat, lng: ringLng, color: ringColor, maxRadius: ringMaxRadius },
        mapZoom,
      ),
    [mapZoom, ringColor, ringLat, ringLng, ringMaxRadius, ringsData],
  );

  const labelsGeoJson = useMemo(
    () =>
      buildLabelsGeoJson(
        labelsData,
        {
          lat: labelLat,
          lng: labelLng,
          text: labelText,
          size: labelSize,
          color: labelColor,
          dotRadius: labelDotRadius,
        },
        mapZoom,
      ),
    [labelColor, labelDotRadius, labelLat, labelLng, labelSize, labelText, labelsData, mapZoom],
  );

  const heatmapCollections = useMemo(() => buildHeatmapGeoJson(heatmapsData), [heatmapsData]);

  const notifyChange = useCallback(() => {
    changeListenersRef.current.forEach((listener) => listener());
  }, []);

  const handleMove = useCallback(
    (event: { viewState: { zoom: number } }) => {
      setMapZoom(event.viewState.zoom);
      notifyChange();
    },
    [notifyChange],
  );

  const emitGlobeReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onGlobeReadyRef.current?.({});
    notifyChange();
  }, [notifyChange, onGlobeReadyRef]);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setProjection({ type: "globe" });
    setMapZoom(map.getZoom());
    setMapLoaded(true);

    if (map.isStyleLoaded()) {
      emitGlobeReady();
      return;
    }

    map.once("idle", emitGlobeReady);
  }, [emitGlobeReady]);

  const resolveFeature = useCallback(
    (layerId: string, index: number) => {
      if (layerId === "map-points") return pointsData[index] ?? null;
      if (layerId === "map-paths") return pathsData[index] ?? null;
      if (layerId === "map-polygons-fill") return polygonsData[index] ?? null;
      if (layerId === "map-rings") return ringsData[index] ?? null;
      return null;
    },
    [pathsData, pointsData, polygonsData, ringsData],
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
    (event: { features?: { layer?: { id?: string }; properties?: { index?: number } }[] }) => {
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
        interactiveLayerIds={[...INTERACTIVE_LAYERS]}
        onLoad={handleLoad}
        onMove={handleMove}
        onClick={handleMapClick}
        onMouseMove={handleMapMouseMove}
        cursor="grab"
      >
        {polygonsGeoJson.features.length > 0 ? (
          <Source id="map-polygons" type="geojson" data={polygonsGeoJson}>
            <Layer
              id="map-polygons-fill"
              type="fill"
              paint={{
                "fill-color": ["get", "fill"],
                "fill-opacity": 0.72,
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
          ? htmlElementsData.map((item, index) => (
              <Marker
                key={`html-marker-${index}`}
                longitude={htmlLng(item)}
                latitude={htmlLat(item)}
                anchor="center"
              >
                <div
                  ref={(node) => {
                    if (!node || node.childElementCount > 0) return;
                    const el = htmlElement(item);
                    node.appendChild(el);
                  }}
                />
              </Marker>
            ))
          : null}
      </Map>
    </div>
  );
});

export { mapLibreZoomToAltitude };
