# maddie-bench Track B Submission

Submissions will use one directory per model run:

```text
results/{model_id}/{run_id}/
  commands.json
  final.png
  metadata.json
```

The local runner writes this layout automatically:

```bash
npm run run:track-b -- --model openai/gpt-5.5 --dry-run
OPENROUTER_API_KEY=... npm run run:track-b -- --model openai/gpt-5.5
```

Useful options:

- `--list` prints the planned Track B model registry.
- `--model <id>` runs one or more exact model ids.
- `--family <name>` runs one model family from `runner/models.track-b.json`.
- `--all` selects every planned model.
- `--limit <n>` caps the selected set.
- `--run-id <id>` writes into a stable run folder.
- `--dry-run` writes sample commands and a sample render without API calls.
- `--temperature <n>` changes the OpenRouter request temperature.
- `--max-tokens <n>` changes the OpenRouter request token limit.

## Metadata Shape

```json
{
  "benchmark": "maddie-bench",
  "track": "structured-drawing",
  "version": "0.1",
  "model": "openai/gpt-5.5",
  "provider": "openrouter",
  "date": "2026-06-29",
  "prompt": "prompts/track-b-v0.1.md",
  "prompt_version": "track-b-v0.1",
  "reference_image": "app/public/reference/maddie-target.jpg",
  "prompt_sha256": "...",
  "reference_sha256": "...",
  "runner_sha256": "...",
  "official_attempts_per_model": 1,
  "provider_retry_policy": {
    "retry_provider_errors": true,
    "max_provider_retries": 1
  },
  "request_settings": {
    "temperature": 0.2,
    "max_tokens": 8000,
    "response_format": "json_schema",
    "require_parameters": true
  },
  "canvas": {
    "width": 1205,
    "height": 1448
  },
  "status": "completed",
  "cost_usd": null,
  "wall_time_seconds": null,
  "command_count": null
}
```
