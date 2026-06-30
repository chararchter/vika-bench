export const judgeResponseSchema = {
  type: "object",
  properties: {
    winner: {
      type: "string",
      enum: ["a", "b", "tie"]
    },
    confidence: {
      type: "number"
    },
    rationale: {
      type: "string"
    }
  },
  required: ["winner", "confidence", "rationale"],
  additionalProperties: false
};
