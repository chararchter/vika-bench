import fs from "node:fs";
import path from "node:path";

const root = new URL("..", import.meta.url).pathname;
const registry = JSON.parse(fs.readFileSync(path.join(root, "runner/models.track-b.json"), "utf8"));
const resultsRoot = path.join(root, "results");

for (const model of registry.models) {
  const dir = path.join(resultsRoot, sanitizeModelId(model.id));
  fs.mkdirSync(dir, { recursive: true });
  const placeholder = path.join(dir, ".gitkeep");
  if (!fs.existsSync(placeholder)) {
    fs.writeFileSync(placeholder, "");
  }
}

console.log(`Created ${registry.models.length} result placeholders.`);

function sanitizeModelId(id) {
  return id.replaceAll("/", "__").replaceAll(":", "_");
}
