import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const RESULTS_ROOT = path.join(ROOT, "results");
const args = parseArgs(process.argv.slice(2));

const runDirs = await collectRunDirs(args);
if (runDirs.length === 0) {
  throw new Error("No run directories found. Use --run-id <id> or --dir <result-dir>.");
}

const requiredFilesByStatus = {
  completed: ["request.json", "raw-response.json", "commands.json", "final.png", "metadata.json"],
  dry_run: ["commands.json", "final.png", "metadata.json"],
  failed: ["metadata.json"],
  api_error: ["metadata.json", "raw-response.json"]
};

const requiredMetadata = [
  "benchmark",
  "track",
  "version",
  "model",
  "provider",
  "family",
  "prompt",
  "reference_image",
  "prompt_version",
  "prompt_sha256",
  "reference_sha256",
  "runner_sha256",
  "run_config",
  "run_config_sha256",
  "official_attempts_per_model",
  "status"
];

const results = runDirs.map(validateRunDir);
const failures = results.filter((result) => result.errors.length > 0);

console.log(JSON.stringify({
  checked: results.length,
  failures: failures.length,
  results
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}

async function collectRunDirs(parsedArgs) {
  if (parsedArgs.dir) {
    return asArray(parsedArgs.dir).map((dir) => path.isAbsolute(dir) ? dir : path.join(ROOT, dir));
  }

  if (!parsedArgs["run-id"]) return [];

  const dirs = [];
  const modelDirs = await fs.promises.readdir(RESULTS_ROOT, { withFileTypes: true });
  for (const entry of modelDirs) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const candidate = path.join(RESULTS_ROOT, entry.name, parsedArgs["run-id"]);
    if (fs.existsSync(path.join(candidate, "metadata.json"))) {
      dirs.push(candidate);
    }
  }
  return dirs;
}

function validateRunDir(dir) {
  const metadataPath = path.join(dir, "metadata.json");
  const errors = [];

  if (!fs.existsSync(metadataPath)) {
    return { dir: path.relative(ROOT, dir), status: "missing", errors: ["metadata.json missing"] };
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  const requiredFiles = requiredFilesByStatus[metadata.status] || ["metadata.json"];

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(dir, file))) {
      errors.push(`${file} missing`);
    }
  }

  for (const key of requiredMetadata) {
    if (metadata[key] === undefined || metadata[key] === null || metadata[key] === "") {
      errors.push(`metadata.${key} missing`);
    }
  }

  if (metadata.official_attempts_per_model !== 1) {
    errors.push("metadata.official_attempts_per_model must be 1");
  }

  return {
    dir: path.relative(ROOT, dir),
    model: metadata.model,
    status: metadata.status,
    errors
  };
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
    } else if (parsed[key]) {
      parsed[key] = asArray(parsed[key]).concat(next);
      index += 1;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}
