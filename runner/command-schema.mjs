export const commandResponseSchema = {
  type: "object",
  properties: {
    commands: {
      type: "array",
      items: {
        type: "object",
        properties: {
          c: {
            type: "string"
          },
          w: {
            type: "number"
          },
          o: {
            type: "number"
          },
          p: {
            type: "array",
            items: {
              type: "array",
              items: {
                type: "number"
              }
            }
          }
        },
        required: ["c", "w", "o", "p"],
        additionalProperties: false
      }
    }
  },
  required: ["commands"],
  additionalProperties: false
};
