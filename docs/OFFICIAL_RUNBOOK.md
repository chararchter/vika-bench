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

Official runs use one attempt per model and the settings in `runner/run-config.json`. All model calls are routed through OpenRouter.

```bash
npm run run:track-b -- --all --run-id official-v0.1
```

## 3. Validate Audit Trail

```bash
npm run validate:audit -- --run-id official-v0.1
```

## 4. Judge Pairwise Outputs

The v0.1 blind Elo judge panel is defined in `runner/judge-config.json`. All judge calls are routed through OpenRouter.

```bash
npm run judge -- --run-id official-v0.1 --judgment-run-id official-v0.1-judge
```

## 5. Compute Elo

```bash
npm run elo -- --input judgments/official-v0.1-judge/pairwise.json --output leaderboard/elo.official-v0.1.json
```

## 6. Publish Results to the Site

```bash
npm run publish:results -- --run-id official-v0.1 --elo leaderboard/elo.official-v0.1.json
npm run build:site
```

After these commands, the official outputs, audit metadata, pairwise judgments, Elo file, public site data, and `/maddie-bench/` static build exist locally.
