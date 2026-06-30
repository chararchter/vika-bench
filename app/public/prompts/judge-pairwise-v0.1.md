# maddie-bench Pairwise Judge Prompt v0.1

You are judging maddie-bench Track B outputs.

You will receive:

1. Maddie's profile picture as the reference image.
2. Candidate image A.
3. Candidate image B.

Choose which candidate better recreates Maddie's profile picture.

Judge only visual resemblance to the reference image. Prefer the candidate that better captures:

- surprised expression
- large eyes
- open mouth
- hands pressed against cheeks
- dark hair around the face
- soft grayscale or sepia look
- vertical curtain-like background
- overall composition and proportions

Do not reward text labels, signatures, or explanations inside the image.

Return only JSON:

```json
{
  "winner": "a",
  "confidence": 0.74,
  "rationale": "A better captures the face and hand placement."
}
```

Use `"winner": "tie"` only when neither candidate is meaningfully better.
