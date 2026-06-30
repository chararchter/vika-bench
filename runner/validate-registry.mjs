import fs from "node:fs";

const registryPath = new URL("./models.track-b.json", import.meta.url);
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const ids = new Set();
const errors = [];

if (registry.track !== "structured-drawing") {
  errors.push("Expected track to be structured-drawing.");
}

for (const [index, model] of registry.models.entries()) {
  for (const key of ["id", "provider", "family", "status"]) {
    if (!model[key]) errors.push(`Model ${index} is missing ${key}.`);
  }

  if (ids.has(model.id)) {
    errors.push(`Duplicate model id: ${model.id}`);
  }
  ids.add(model.id);

  if (model.status !== "planned") {
    errors.push(`Unexpected status for ${model.id}: ${model.status}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Registry OK: ${registry.models.length} planned Track B models.`);
