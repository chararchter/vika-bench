import fs from "node:fs";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const input = args.input;
const output = args.output;

if (!input) {
  console.error("Usage: node runner/calculate-elo.mjs --input judgments.json [--output leaderboard/elo.json]");
  process.exit(1);
}

const judgments = JSON.parse(await fs.promises.readFile(input, "utf8"));
if (!Array.isArray(judgments)) {
  throw new Error("Judgment input must be an array.");
}

const ratings = new Map();
const counts = new Map();
const kFactor = Number(args.k ?? 32);

for (const judgment of judgments) {
  const normalized = normalizeJudgment(judgment);
  applyElo(normalized.a, normalized.b, normalized.result, kFactor);
}

const leaderboard = [...ratings.entries()]
  .map(([model, elo]) => ({
    model,
    elo: Math.round(elo),
    comparisons: counts.get(model) || 0
  }))
  .sort((left, right) => right.elo - left.elo || left.model.localeCompare(right.model));

const payload = {
  generated_at: new Date().toISOString(),
  k_factor: kFactor,
  judgments: judgments.length,
  leaderboard
};

if (output) {
  await fs.promises.mkdir(path.dirname(output), { recursive: true });
  await fs.promises.writeFile(output, JSON.stringify(payload, null, 2));
}

console.log(JSON.stringify(payload, null, 2));

function normalizeJudgment(judgment) {
  if (judgment.winner && judgment.loser) {
    return {
      a: judgment.winner,
      b: judgment.loser,
      result: 1
    };
  }

  if (judgment.a && judgment.b && Number.isFinite(Number(judgment.result))) {
    return {
      a: judgment.a,
      b: judgment.b,
      result: clamp(Number(judgment.result), 0, 1)
    };
  }

  throw new Error(`Invalid judgment: ${JSON.stringify(judgment)}`);
}

function applyElo(a, b, result, k) {
  const ratingA = ratings.get(a) ?? 1000;
  const ratingB = ratings.get(b) ?? 1000;
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const resultB = 1 - result;

  ratings.set(a, ratingA + k * (result - expectedA));
  ratings.set(b, ratingB + k * (resultB - expectedB));
  counts.set(a, (counts.get(a) || 0) + 1);
  counts.set(b, (counts.get(b) || 0) + 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
