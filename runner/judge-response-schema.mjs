export const judgeResponseSchema = {
  type: "object",
  properties: {
    winner: {
      type: "string",
      enum: ["a", "b", "tie"]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    rationale: {
      type: "string",
      maxLength: 600
    }
  },
  required: ["winner", "confidence", "rationale"],
  additionalProperties: false
};
