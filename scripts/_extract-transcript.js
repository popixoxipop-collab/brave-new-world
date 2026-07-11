const fs = require("fs");
const path = require("path");

const TRANSCRIPT_DIR = path.join(
  process.env.USERPROFILE || "",
  ".cursor",
  "projects",
  "c-Users-Administrator-Downloads-Confilct-view-dev",
  "agent-transcripts",
);

const targets = [
  "ukraineCombatSettlements.ts",
  "ukraineAdvancePaths.ts",
  "ukraineSettlements.ts",
  "ukraineSettlementLabels.ts",
  "viinaLod.ts",
  "ukraineSituationSeed.ts",
  "UkraineFrontLegend.tsx",
  "ukraineFrontPaths.ts",
  "viinaServerData.ts",
  "viina-lfs.js",
  "build-viina-ukraine.js",
];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".jsonl")) acc.push(full);
  }
  return acc;
}

const outDir = path.join(__dirname, "_extracted");
fs.mkdirSync(outDir, { recursive: true });

for (const file of walk(TRANSCRIPT_DIR)) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const blocks = obj.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const block of blocks) {
      if (block.type !== "tool_use" || block.name !== "Write") continue;
      const p = block.input?.path || "";
      const hit = targets.find((t) => p.replace(/\\/g, "/").endsWith(t));
      if (!hit || !block.input?.contents) continue;
      const outPath = path.join(outDir, hit.replace(/\//g, "_"));
      if (!fs.existsSync(outPath) || block.input.contents.length > fs.readFileSync(outPath, "utf8").length) {
        fs.writeFileSync(outPath, block.input.contents);
        console.log("wrote", hit, "from", path.basename(file));
      }
    }
  }
}
