const fs = require("fs");
const p =
  "C:/Users/Administrator/.cursor/projects/c-Users-Administrator-Downloads-Confilct-view-dev/agent-transcripts/bb3d0d67-bab1-4f6f-88bb-a208a9614fbc/subagents/ee6129c2-f713-4309-a448-f7dd0fd19af3.jsonl";
const out = "c:/Users/Administrator/Downloads/Confilct-view-dev/Confilct-view-dev/scripts/_extracted/ukraine-globe-blocks2.txt";
const lines = fs.readFileSync(p, "utf8").split(/\n/).filter(Boolean);
const keys = [
  "UKRAINE_RU_FILL",
  "formatViinaDate",
  "ukraine-control",
  "ukraine-ru-front",
  "UKRAINE_SITUATION",
  "showUkraineLegendPanel",
  "createUkraineCallout",
];
const blocks = [];
for (const line of lines) {
  const o = JSON.parse(line);
  for (const c of o.message?.content || []) {
    if (c.type !== "tool_use" || c.name !== "StrReplace") continue;
    const old = c.input?.old_string || "";
    if (keys.some((k) => old.includes(k))) {
      blocks.push(`\n===== ${c.input.path} =====\n${old}`);
    }
  }
}
fs.writeFileSync(out, blocks.join("\n\n"));
console.log("wrote", blocks.length, "blocks");
