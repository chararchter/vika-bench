export const commandResponseSchema = {
  type: "object",
  properties: {
    commands: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["stroke"]
          },
          color: {
            type: "string"
          },
          size: {
            type: "number"
          },
          opacity: {
            type: "number"
          },
          points: {
            type: "array",
            items: {
              type: "array",
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
