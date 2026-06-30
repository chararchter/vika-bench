# maddie-bench Track B Prompt v0.1

You will receive a specific reference picture and must recreate it by emitting compact JSON drawing commands for a simple paint engine.

The canvas is exactly 1205 pixels wide and 1448 pixels tall.

Return only a JSON object with one key: `commands`. Do not return Markdown.

The `commands` value must be an array of stroke commands. Each stroke command must have exactly these short keys:

- `c`: hex color string like `"#201b1b"`
- `w`: brush width from 1 to 160
- `o`: opacity number from 0.01 to 1
- `p`: array of `[x, y]` coordinates

Required JSON shape:

```json
{
  "commands": [
    {
      "c": "#201b1b",
      "w": 12,
      "o": 0.82,
      "p": [[300, 300], [320, 330], [360, 380]]
    }
  ]
}
```

Use a concise set of strokes to approximate:

- surprised facial expression
- large eyes
- open mouth
- hands pressed against cheeks
- dark hair around the face
- soft grayscale and sepia tones
- vertical curtain-like background

Rules:

- Prefer broad shapes over fine detail.
- Aim for no more than 30 stroke commands.
- Use at least 2 points per stroke.
- Prefer no more than 8 points per stroke.
- Do not write text on the canvas.
- Do not output command keys other than `c`, `w`, `o`, and `p`.
- Keep coordinates within the canvas.
- Use valid hex colors and numeric coordinates.
- Use enough strokes to capture the main composition, facial features, hands, hair, and background without approaching the token limit.
- Do not include explanations, captions, comments, trailing prose, or Markdown fences.
- Stop immediately after the complete JSON object.
- Prefer broad composition first, then facial details, then texture.
