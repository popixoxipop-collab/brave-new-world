/**
 * Upload public/data/{lite,full} (+ optional textures) to Cloudflare R2.
 *
 * Prerequisites (one-time):
 *   1. Cloudflare Dashboard → R2 → Enable R2
 *   2. npx wrangler r2 bucket create conflict-view-data
 *
 * Usage:
 *   node scripts/r2-upload-data.js
 *   node scripts/r2-upload-data.js --dry-run
 *   node scripts/r2-upload-data.js --profiles lite
 *   node scripts/r2-upload-data.js --with-textures
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BUCKET = process.env.R2_DATA_BUCKET || "conflict-view-data";
const PREFIX = process.env.R2_DATA_PREFIX || "data";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const withTextures = args.includes("--with-textures");
const profilesArg = args.find((a) => a.startsWith("--profiles="));
const profiles = profilesArg
  ? profilesArg.replace("--profiles=", "").split(",").map((s) => s.trim())
  : ["lite", "full"];

function contentType(filePath) {
  if (filePath.endsWith(".json.gz")) return "application/gzip";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".mp3")) return "audio/mpeg";
  if (filePath.endsWith(".wav")) return "audio/wav";
  return "application/octet-stream";
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function toKey(absPath, localRoot, keyPrefix) {
  const rel = path.relative(localRoot, absPath).split(path.sep).join("/");
  return `${keyPrefix}/${rel}`;
}

function putObject(key, filePath) {
  const ct = contentType(filePath);
  const cmdArgs = [
    "wrangler",
    "r2",
    "object",
    "put",
    `${BUCKET}/${key}`,
    `--file=${filePath}`,
    `--content-type=${ct}`,
    "--remote",
  ];
  if (dryRun) {
    console.log(`[dry-run] ${key} ← ${path.relative(ROOT, filePath)}`);
    return true;
  }
  const result = spawnSync("npx", cmdArgs, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(result.stdout || "");
    console.error(result.stderr || "");
    return false;
  }
  console.log(`OK  ${key}`);
  return true;
}

function main() {
  const jobs = [];

  for (const profile of profiles) {
    const localRoot = path.join(ROOT, "public", "data", profile);
    const files = walkFiles(localRoot).filter(
      (f) => f.endsWith(".json") || f.endsWith(".json.gz"),
    );
    for (const file of files) {
      jobs.push({
        key: toKey(file, path.join(ROOT, "public", "data"), PREFIX),
        file,
      });
    }
  }

  // Root public/data/*.json that are not under lite/full (seeds etc.) — skip live/
  const dataRoot = path.join(ROOT, "public", "data");
  for (const entry of fs.readdirSync(dataRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!(entry.name.endsWith(".json") || entry.name.endsWith(".json.gz"))) continue;
    const file = path.join(dataRoot, entry.name);
    jobs.push({ key: `${PREFIX}/${entry.name}`, file });
  }

  if (withTextures) {
    const texRoot = path.join(ROOT, "public", "textures");
    for (const file of walkFiles(texRoot)) {
      jobs.push({
        key: toKey(file, path.join(ROOT, "public"), "static"),
        file,
      });
    }
  }

  console.log(
    `R2 upload → bucket=${BUCKET} objects=${jobs.length} dryRun=${dryRun}`,
  );
  let ok = 0;
  let fail = 0;
  for (const job of jobs) {
    if (putObject(job.key, job.file)) ok += 1;
    else fail += 1;
  }
  console.log(`Done. ok=${ok} fail=${fail}`);
  if (fail > 0) process.exit(1);
}

main();
