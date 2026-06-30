export const commandResponseSchema = {
  type: "object",
  properties: {
    commands: {
      type: "array",
      minItems: 1,
      maxItems: 800,
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["stroke"]
          },
          color: {
            type: "string",
            pattern: "^#[0-9a-fA-F]{6}$"
          },
          size: {
            type: "number",
            minimum: 1,
            maximum: 160
          },
          opacity: {
            type: "number",
            minimum: 0.01,
            maximum: 1
          },
          points: {
            type: "array",
            minItems: 2,
            maxItems: 120,
            items: {
              type: "array",
              minItems: 2,
              maxItems: 2,
              items: {
                type: "number"
              }
            }
          }
        },
        required: ["type", "color", "size", "opacity", "points"],
        additionalProperties: false
      }
    }
  },
  required: ["commands"],
  additionalProperties: false
};
