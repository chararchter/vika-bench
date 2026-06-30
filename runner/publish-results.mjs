import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const RESULTS_ROOT = path.join(ROOT, "results");
const PUBLIC_RESULTS_ROOT = path.join(ROOT, "app/public/results");
const PUBLIC_DATA_PATH = path.join(ROOT, "app/public/data/results.json");

const args = parseArgs(process.argv.slice(2));
if (!args["run-id"]) {
  console.error("Usage: node runner/publish-results.mjs --run-id <id> [--elo leaderboard/elo.json]");
  process.exit(1);
}

const eloByModel = args.elo ? loadElo(args.elo) : new Map();
const results = [];
const modelDirs = await fs.promises.readdir(RESULTS_ROOT, { withFileTypes: true });

for (const entry of modelDirs) {
  if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
  const runDir = path.join(RESULTS_ROOT, entry.name, args["run-id"]);
  const metadataPath = path.join(runDir, "metadata.json");
  if (!fs.existsSync(metadataPath)) continue;

  const metadata = JSON.parse(await fs.promises.readFile(metadataPath, "utf8"));
  const publicRunDir = path.join(PUBLIC_RESULTS_ROOT, entry.name, args["run-id"]);
  const sourceImage = path.join(runDir, "final.png");
  let publicImage = null;

  if (fs.existsSync(sourceImage)) {
    await fs.promises.mkdir(publicRunDir, { recursive: true });
    await fs.promises.copyFile(sourceImage, path.join(publicRunDir, "final.png"));
    publicImage = `/results/${entry.name}/${args["run-id"]}/final.png`;
  }

  results.push({
    model: metadata.model,
    provider: metadata.provider,
    family: metadata.family,
    status: metadata.status,
    run_id: args["run-id"],
    final_image: publicImage,
    elo: eloByModel.get(metadata.model)?.elo ?? null,
    comparisons: eloByModel.get(metadata.model)?.comparisons ?? 0,
    cost_usd: metadata.cost_usd,
    wall_time_seconds: metadata.wall_time_seconds,
    command_count: metadata.command_count,
    prompt_version: metadata.prompt_version,
    prompt_sha256: metadata.prompt_sha256,
    reference_sha256: metadata.reference_sha256,
    run_config_sha256: metadata.run_config_sha256
  });
}

results.sort((left, right) => {
  if (right.elo !== left.elo) return (right.elo ?? -Infinity) - (left.elo ?? -Infinity);
  return left.model.localeCompare(right.model);
});

await fs.promises.mkdir(path.dirname(PUBLIC_DATA_PATH), { recursive: true });
await fs.promises.writeFile(PUBLIC_DATA_PATH, JSON.stringify({
  benchmark: "maddie-bench",
  track: "structured-drawing",
  version: "0.1",
  run_id: args["run-id"],
  generated_at: new Date().toISOString(),
  elo_source: args.elo || null,
  results
}, null, 2));

console.log(`Published ${results.length} results to app/public/data/results.json.`);

function loadElo(eloPath) {
  const payload = JSON.parse(fs.readFileSync(eloPath, "utf8"));
  return new Map((payload.leaderboard || []).map((row) => [row.model, row]));
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
