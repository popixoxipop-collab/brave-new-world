// 정적 path/점 빌드 공통 유틸
const { IS_LITE } = require("./build-profile");

function simplifyLine(coords, maxPoints, roundCoord, precision = 2) {
  if (!Array.isArray(coords) || coords.length <= maxPoints) {
    return coords.map(([lng, lat]) => [roundCoord(lng, precision), roundCoord(lat, precision)]);
  }
  const step = Math.ceil(coords.length / maxPoints);
  const sampled = coords.filter((_, index) => index % step === 0);
  const last = coords[coords.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled.map(([lng, lat]) => [roundCoord(lng, precision), roundCoord(lat, precision)]);
}

function lineGeometryToPoints(geometry, maxPoints, roundCoord, precision = 2) {
  if (!geometry) return [];
  const toPoints = (line) =>
    line.map(([lng, lat]) => ({ lat: roundCoord(lat, precision), lng: roundCoord(lng, precision) }));

  if (geometry.type === "LineString") {
    return [toPoints(simplifyLine(geometry.coordinates, maxPoints, roundCoord, precision))];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map((line) =>
      toPoints(simplifyLine(line, maxPoints, roundCoord, precision)),
    );
  }
  if (geometry.type === "GeometryCollection") {
    const segments = [];
    for (const part of geometry.geometries || []) {
      segments.push(...lineGeometryToPoints(part, maxPoints, roundCoord, precision));
    }
    return segments;
  }
  return [];
}

function pointsBbox(points, roundCoord) {
  const bbox = { minLat: Infinity, minLng: Infinity, maxLat: -Infinity, maxLng: -Infinity };
  for (const point of points) {
    bbox.minLat = Math.min(bbox.minLat, point.lat);
    bbox.minLng = Math.min(bbox.minLng, point.lng);
    bbox.maxLat = Math.max(bbox.maxLat, point.lat);
    bbox.maxLng = Math.max(bbox.maxLng, point.lng);
  }
  return {
    minLat: roundCoord(bbox.minLat),
    minLng: roundCoord(bbox.minLng),
    maxLat: roundCoord(bbox.maxLat),
    maxLng: roundCoord(bbox.maxLng),
  };
}

function capArray(items, liteMax, fullMax) {
  const limit = IS_LITE ? liteMax : fullMax;
  return items.length <= limit ? items : items.slice(0, limit);
}

module.exports = {
  simplifyLine,
  lineGeometryToPoints,
  pointsBbox,
  capArray,
};
