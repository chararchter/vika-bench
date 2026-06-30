# maddie-bench Track B Prompt v0.1

You will receive a specific reference picture and must recreate it by emitting JSON drawing commands for a simple paint engine.

The canvas is exactly 1205 pixels wide and 1448 pixels tall.

Return only a JSON object with one key: `commands`. Do not return Markdown.

The `commands` value must be an array of stroke commands. Each stroke command must have exactly these keys:

- `type`: always `"stroke"`
- `color`: a hex color string like `"#201b1b"`
- `size`: brush width from 1 to 160
- `opacity`: number from 0.01 to 1
- `points`: an array of `[x, y]` coordinates

Required JSON shape:

```json
{
  "commands": [
    {
      "type": "stroke",
      "color": "#201b1b",
      "size": 12,
      "opacity": 0.82,
      "points": [[300, 300], [320, 330], [360, 380]]
    }
  ]
}
```

Use many layered strokes to approximate:

- surprised facial expression
- large eyes
- open mouth
- hands pressed against cheeks
- dark hair around the face
- soft grayscale and sepia tones
- vertical curtain-like background

Rules:

- Do not write text on the canvas.
- Do not use commands other than `stroke`.
- Keep coordinates within the canvas.
- Use valid hex colors and numeric coordinates.
- Use enough layered strokes to capture the main composition, facial features, hands, hair, and background.
- Do not include explanations, captions, comments, trailing prose, or Markdown fences.
- Prefer broad composition first, then facial details, then texture.
