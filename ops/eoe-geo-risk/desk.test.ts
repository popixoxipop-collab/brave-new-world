import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
const requireHere = createRequire(import.meta.url);
const { detectEvents } = requireHere("../../src/lib/geo-risk/detect.ts");

test("independent channels preserve earliest original receivedAt", () => {
  const a = "2026-10-09T00:00:00Z";
  const result = detectEvents([
    { id: "A/1", channelUsername: "A", text: "reports of troop movement near the front line", receivedAt: a },
    { id: "B/1", channelUsername: "B", text: "front line movement confirmed by second source", receivedAt: "2026-10-09T00:02:00Z" },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].firstSeenAt, a);
  assert.equal(result[0].corroborationCount, 2);
});
test("a single weak source cannot pass the two-source gate", () => {
  const result = detectEvents([{ id:"A/1", channelUsername:"A", text:"reports of troop movement near the front line", receivedAt:"2026-10-09T00:00:00Z" }]);
  assert.equal(result.length, 0);
});
test("repeated posts by a single channel are not independent corroboration", () => {
  const posts = ["A/1","A/2"].map((id) => ({id,channelUsername:"A",text:"reports of troop movement near the front line",receivedAt:"2026-10-09T00:00:00Z"}));
  assert.equal(detectEvents(posts).length, 0);
});
