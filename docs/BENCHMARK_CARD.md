# maddie-bench Benchmark Card

## Name

maddie-bench

## Version

Track B v0.1

## Task

Recreate Maddie's profile picture on a constrained paint canvas.

## Track B

Models receive Maddie's profile picture and emit structured drawing commands. The official paint engine replays those commands to produce the final image.

## Canvas

- Width: 1205 px
- Height: 1448 px
- Background: `#f7f3ef`

## Official Attempts

Each model gets one official attempt.

## Official Settings

The source of truth is `runner/run-config.json`.

- Model provider route: OpenRouter
- Temperature: `0.2`
- Max tokens: `12000`
- Response format: `json_schema`
- Provider parameters required: `true`
- Renderer: `runner/render-commands.mjs`
- Output image: `final.png`

## Reference

The locked reference image is stored in the repository at `app/public/reference/maddie-target.jpg`.

## Current Model Set

See `runner/models.track-b.json`.

## Exclusions

Z.ai vision models are excluded from Track B v0.1 because OpenRouter returned no compatible route for the official image plus structured-output request during preflight.

## Planned Metrics

- Elo from pairwise preference judgments
- Image similarity against the target
- Feature rubric for eyes, mouth, hands, hair, and background
- Cost
- Latency
- Number of drawing commands
- Render validity

## Elo

Elo is computed from blind pairwise judgments over rendered final images. The v0.1 judge panel is `openai/gpt-5.5`, `anthropic/claude-opus-4.8`, and `google/gemini-3.5-flash` via OpenRouter, configured in `runner/judge-config.json`.

## Accountability

Official runs should keep raw model responses, parsed commands, final renders, metadata, usage/cost, prompt version, reference version, and judge decisions used for Elo.

## Rights

The reference image is provided for maddie-bench evaluation only. It should not be used for unrelated training sets, scraping, or derivative datasets.
