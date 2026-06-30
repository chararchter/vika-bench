import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import { judgeResponseSchema } from "./judge-response-schema.mjs";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const RESULTS_ROOT = path.join(ROOT, "results");
const JUDGMENTS_ROOT = path.join(ROOT, "judgments");
const JUDGE_CONFIG_PATH = path.join(ROOT, "runner/judge-config.json");
const JUDGE_PROMPT_PATH = path.join(ROOT, "prompts/judge-pairwise-v0.1.md");
const REFERENCE_PATH = path.join(ROOT, "app/public/reference/maddie-target.jpg");
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
let openRouterModelParameters = null;

loadEnvFile(path.join(ROOT, ".env"));

const args = parseArgs(process.argv.slice(2));
const judgeConfig = JSON.parse(await fs.promises.readFile(JUDGE_CONFIG_PATH, "utf8"));
const judgePrompt = await fs.promises.readFile(JUDGE_PROMPT_PATH, "utf8");
const judgePromptSha256 = sha256(judgePrompt);
const judgeConfigSha256 = await sha256File(JUDGE_CONFIG_PATH);
const referenceSha256 = await sha256File(REFERENCE_PATH);

if (args["check-env"]) {
  console.log(process.env.OPENROUTER_API_KEY ? "OPENROUTER_API_KEY is set" : "OPENROUTER_API_KEY is missing");
  process.exit(process.env.OPENROUTER_API_KEY ? 0 : 1);
}

const runDirs = await loadRunDirs(args);
if (runDirs.length < 2) {
  throw new Error("Need at least two completed result directories. Use --run-id <id> or --runs <manifest.json>.");
}

const pairs = makePairs(runDirs, Number(args.limit || 0));
const judgePanel = judgeConfig.judge_panel || [judgeConfig.primary_judge];
const judgmentRunId = args["judgment-run-id"] || `judge-${new Date().toISOString().replaceAll(":", "-").replace(/\.\d+Z$/, "Z")}`;
const outputDir = path.join(JUDGMENTS_ROOT, judgmentRunId);
await fs.promises.mkdir(outputDir, { recursive: true });

const concurrency = positiveInteger(args.concurrency, 1);
const jobs = pairs.flatMap(([left, right], pairIndex) =>
  judgePanel.map((judge) => ({ left, right, pairIndex, judge }))
);

console.log(`Judging ${pairs.length} pair(s), ${jobs.length} judgment call(s), with concurrency ${concurrency}.`);
const judgments = await runConcurrent(jobs, concurrency, async ({ left, right, pairIndex, judge }) => {
    try {
      const judgment = args["dry-run"]
        ? await judgePairDry(left, right, pairIndex, outputDir, judge)
        : await judgePairOpenRouter(left, right, pairIndex, outputDir, judge);
      console.log(JSON.stringify(judgment, null, 2));
      return judgment;
    } catch (error) {
      const failed = {
        status: "failed",
        pair_index: pairIndex,
        a: left.model,
        b: right.model,
        judge_model: judge.model,
        run_a: path.relative(ROOT, left.dir),
        run_b: path.relative(ROOT, right.dir),
        error: error.message
      };
      console.log(JSON.stringify(failed, null, 2));
      return failed;
    }
});

const cleanJudgments = judgments.filter((judgment) => judgment.status !== "failed");
const hasFailures = cleanJudgments.length !== judgments.length;
const judgmentPath = path.join(outputDir, "pairwise.json");
const manifestPath = path.join(outputDir, "manifest.json");
await fs.promises.writeFile(judgmentPath, JSON.stringify(cleanJudgments, null, 2));
await fs.promises.writeFile(
  manifestPath,
  JSON.stringify({
    benchmark: "maddie-bench",
    track: "structured-drawing",
    version: "0.1",
    judgment_run_id: judgmentRunId,
    generated_at: new Date().toISOString(),
    judge_config: path.relative(ROOT, JUDGE_CONFIG_PATH),
    judge_config_sha256: judgeConfigSha256,
    judge_prompt: path.relative(ROOT, JUDGE_PROMPT_PATH),
    judge_prompt_sha256: judgePromptSha256,
    reference_image: path.relative(ROOT, REFERENCE_PATH),
    reference_sha256: referenceSha256,
    judge_panel: judgePanel,
    model_names_hidden_from_judge: judgeConfig.audit_policy.model_names_hidden_from_judge,
    pair_count: pairs.length,
    concurrency,
    expected_judgments: pairs.length * judgePanel.length,
    completed_judgments: cleanJudgments.length,
    failed_judgments: judgments.length - cleanJudgments.length,
    judgments: path.relative(ROOT, judgmentPath)
  }, null, 2)
);

if (hasFailures) {
  process.exitCode = 1;
}

async function judgePairDry(left, right, index, outputDirValue, judge) {
  const winner = index % 3 === 2 ? "tie" : index % 2 === 0 ? "a" : "b";
  await writeDryRawResponse(outputDirValue, index, winner, judge);
  return normalizeJudgeResult({ winner, confidence: 1, rationale: "Dry-run placeholder judgment." }, left, right, index, 0, null, judge);
}

async function judgePairOpenRouter(left, right, index, outputDirValue, judge) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required unless --dry-run is set.");
  }

  const requestBody = await buildJudgeRequest(left, right, judge);
  const filePrefix = `pair-${String(index).padStart(4, "0")}-${sanitizeModelId(judge.model)}`;
  const requestPath = path.join(outputDirValue, `${filePrefix}-request.json`);
  await fs.promises.writeFile(requestPath, JSON.stringify(redactJudgeRequest(requestBody), null, 2));

  const start = performance.now();
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/maddiedreese/maddie-bench",
      "X-Title": "maddie-bench"
    },
    body: JSON.stringify(requestBody)
  });
  const wallTimeSeconds = (performance.now() - start) / 1000;
  const rawText = await response.text();
  const rawPath = path.join(outputDirValue, `${filePrefix}-raw-response.json`);
  await fs.promises.writeFile(rawPath, rawText);

  if (!response.ok) {
    throw new Error(`Judge request failed: ${response.status} ${rawText}`);
  }

  const raw = JSON.parse(rawText);
  const parsed = parseJudgePayload(raw?.choices?.[0]?.message?.content || "");
  return normalizeJudgeResult(parsed, left, right, index, wallTimeSeconds, raw.usage || null, judge);
}

async function buildJudgeRequest(left, right, judge) {
  const referenceUrl = await fileToDataUrl(REFERENCE_PATH, "image/jpeg");
  const imageAUrl = await fileToDataUrl(path.join(left.dir, "final.png"), "image/png");
  const imageBUrl = await fileToDataUrl(path.join(right.dir, "final.png"), "image/png");
  const supported = await getSupportedParameters(judge.model);

  const body = {
    model: judge.model,
    messages: [
      {
        role: "system",
        content: "You are a careful visual benchmark judge. Return valid JSON only."
      },
      {
        role: "user",
        content: [
          { type: "text", text: judgePrompt },
          { type: "text", text: "Reference image:" },
          { type: "image_url", image_url: { url: referenceUrl } },
          { type: "text", text: "Candidate image A:" },
          { type: "image_url", image_url: { url: imageAUrl } },
          { type: "text", text: "Candidate image B:" },
          { type: "image_url", image_url: { url: imageBUrl } }
        ]
      }
    ],
    provider: {
      require_parameters: true
    }
  };

  if (supportsParameter(supported, "response_format") || supportsParameter(supported, "structured_outputs")) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "maddie_bench_pairwise_judgment",
        strict: true,
        schema: judgeResponseSchema
      }
    };
  }

  if (supportsParameter(supported, "temperature")) {
    body.temperature = 0;
  }

  addReasoningSettings(body, supported);

  if (supportsParameter(supported, "max_tokens")) {
    body.max_tokens = 800;
  } else if (supportsParameter(supported, "max_completion_tokens")) {
    body.max_completion_tokens = 800;
  }

  return body;
}

function normalizeJudgeResult(parsed, left, right, index, wallTimeSeconds, usage, judge) {
  const result = parsed.winner === "tie" ? 0.5 : parsed.winner === "a" ? 1 : 0;
  const winner = parsed.winner === "tie" ? null : parsed.winner === "a" ? left.model : right.model;
  const loser = parsed.winner === "tie" ? null : parsed.winner === "a" ? right.model : left.model;

  return {
    benchmark: "maddie-bench",
    track: "structured-drawing",
    version: "0.1",
    pair_index: index,
    a: left.model,
    b: right.model,
    result,
    winner,
    loser,
    run_a: path.relative(ROOT, left.dir),
    run_b: path.relative(ROOT, right.dir),
    judge: `${judge.provider}/${judge.model}`,
    judge_label: judge.label,
    judge_model: judge.model,
    judge_prompt: path.relative(ROOT, JUDGE_PROMPT_PATH),
    judge_prompt_sha256: judgePromptSha256,
    judge_config: path.relative(ROOT, JUDGE_CONFIG_PATH),
    judge_config_sha256: judgeConfigSha256,
    criterion: judge.criterion,
    model_names_hidden_from_judge: true,
    confidence: parsed.confidence,
    rationale: parsed.rationale,
    wall_time_seconds: wallTimeSeconds,
    usage
  };
}

async function loadRunDirs(parsedArgs) {
  if (parsedArgs.runs) {
    const manifest = JSON.parse(await fs.promises.readFile(parsedArgs.runs, "utf8"));
    const dirs = Array.isArray(manifest) ? manifest : manifest.results;
    return (dirs || [])
      .map((item) => loadRunDir(typeof item === "string" ? item : item.outputDir))
      .filter(Boolean);
  }

  if (!parsedArgs["run-id"]) {
    throw new Error("Use --run-id <id> or --runs <manifest.json>.");
  }

  const dirs = [];
  const familyDirs = await fs.promises.readdir(RESULTS_ROOT, { withFileTypes: true });
  for (const entry of familyDirs) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const candidate = path.join(RESULTS_ROOT, entry.name, parsedArgs["run-id"]);
    if (fs.existsSync(path.join(candidate, "metadata.json")) && fs.existsSync(path.join(candidate, "final.png"))) {
      const loaded = loadRunDir(candidate);
      if (loaded) dirs.push(loaded);
    }
  }
  return dirs;
}

function loadRunDir(dirPath) {
  const absolute = path.isAbsolute(dirPath) ? dirPath : path.join(ROOT, dirPath);
  const metadataPath = path.join(absolute, "metadata.json");
  const finalPath = path.join(absolute, "final.png");
  if (!fs.existsSync(metadataPath) || !fs.existsSync(finalPath)) return null;
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  if (!["completed", "dry_run"].includes(metadata.status)) return null;
  return {
    dir: absolute,
    model: metadata.model,
    metadata
  };
}

function makePairs(items, limit) {
  const pairs = [];
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      pairs.push([items[left], items[right]]);
      if (limit > 0 && pairs.length >= limit) return pairs;
    }
  }
  return pairs;
}

function parseJudgePayload(content) {
  const cleaned = String(content).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!["a", "b", "tie"].includes(parsed.winner)) {
    throw new Error(`Invalid judge winner: ${parsed.winner}`);
  }
  return {
    winner: parsed.winner,
    confidence: clamp(Number(parsed.confidence ?? 0), 0, 1),
    rationale: String(parsed.rationale || "")
  };
}

async function fileToDataUrl(filePath, mimeType) {
  const data = await fs.promises.readFile(filePath);
  return `data:${mimeType};base64,${data.toString("base64")}`;
}

function redactJudgeRequest(requestBody) {
  return {
    ...requestBody,
    messages: requestBody.messages.map((message) => {
      if (!Array.isArray(message.content)) return message;
      return {
        ...message,
        content: message.content.map((part) => {
          if (part.type !== "image_url") return part;
          return { ...part, image_url: { url: "[base64 image omitted]" } };
        })
      };
    })
  };
}

async function writeDryRawResponse(outputDirValue, index, winner, judge) {
  const rawPath = path.join(outputDirValue, `pair-${String(index).padStart(4, "0")}-${sanitizeModelId(judge.model)}-raw-response.json`);
  await fs.promises.writeFile(rawPath, JSON.stringify({ dry_run: true, winner }, null, 2));
}

function sanitizeModelId(id) {
  return id.replaceAll("/", "__").replaceAll(":", "_");
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
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

async function getSupportedParameters(modelId) {
  if (!openRouterModelParameters) {
    openRouterModelParameters = fetchOpenRouterModelParameters();
  }
  const modelsById = await openRouterModelParameters;
  return modelsById.get(modelId) || null;
}

async function fetchOpenRouterModelParameters() {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL);
    if (!response.ok) return new Map();
    const payload = await response.json();
    return new Map((payload.data || []).map((model) => [model.id, model]));
  } catch {
    return new Map();
  }
}

function supportsParameter(supported, parameter) {
  return !supported || (supported.supported_parameters || []).includes(parameter);
}

function addReasoningSettings(body, supported) {
  const effort = chooseReasoningEffort(supported);

  if (supportsParameter(supported, "reasoning")) {
    body.reasoning = {
      effort,
      exclude: true
    };
  } else if (supportsParameter(supported, "reasoning_effort")) {
    body.reasoning_effort = effort;
  }

  if (supportsParameter(supported, "include_reasoning")) {
    body.include_reasoning = false;
  }
}

function chooseReasoningEffort(supported) {
  const requested = args["reasoning-effort"] || "minimal";
  const efforts = supported?.reasoning?.supported_efforts || [];
  if (efforts.length === 0 || efforts.includes(requested)) return requested;
  if (efforts.includes("minimal")) return "minimal";
  if (efforts.includes("low")) return "low";
  return efforts[0];
}

async function runConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, runWorker);
  await Promise.all(workers);
  return results;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function sha256File(filePath) {
  return sha256(await fs.promises.readFile(filePath));
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = unquoteEnvValue(rawValue);
  }
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
