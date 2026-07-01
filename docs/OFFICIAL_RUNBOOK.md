# maddie-bench Official Runbook

This is the end-to-end order for an official Track B run.

## 1. Confirm Environment

Run these commands from the `maddie-bench` repository root after creating `.env` with `OPENROUTER_API_KEY`.

```bash
npm run setup
npm run run:track-b -- --check-env
npm run judge -- --check-env
npm run validate:registry
npm run validate:openrouter
npm run sync:public-data
```

## 2. Run Models

Official runs use one model-output attempt per model and the settings in `runner/run-config.json`. Provider or OpenRouter infrastructure errors are retried according to the configured provider retry policy. All model calls are routed through OpenRouter.

```bash
npm run run:track-b -- --all --run-id official-v0.1 --concurrency 4
```

## 3. Validate Audit Trail

```bash
npm run validate:audit -- --run-id official-v0.1
```

## 4. Judge Pairwise Outputs

The v0.1 blind Elo judge panel is defined in `runner/judge-config.json`. All judge calls are routed through OpenRouter.

```bash
npm run judge -- --run-id official-v0.1 --judgment-run-id official-v0.1-judge --concurrency 12
```

## 5. Compute Elo

```bash
npm run elo -- --input judgments/official-v0.1-judge/pairwise.json --output leaderboard/elo.official-v0.1.json
```

## 6. Publish Results to the Site

```bash
npm run publish:results -- --run-manifest runner/official-run-manifest.v0.1.json --elo leaderboard/elo.official-v0.1.json
npm run build:site
```

## Incremental v0.1 Insertions

If a later stable model becomes eligible for Track B v0.1 without changing the benchmark protocol:

1. Add the model to `runner/models.track-b.json`.
2. Run exactly one new official attempt with a new documented run id.
3. Judge the new output blind against a fixed anchor set spanning strong, middle, and weak leaderboard positions plus provider-adjacent predecessors when available.
4. Append only those new judgments to the official Elo source.
5. Update `runner/official-run-manifest.v0.1.json` so the published site keeps the original `official-v0.1` runs for historical models and points only the inserted models at their incremental run ids.

Historical outputs are not regenerated unless the benchmark protocol itself changes.

After these commands, the official outputs, audit metadata, pairwise judgments, Elo file, public site data, and `/maddie-bench/` static build exist locally.
