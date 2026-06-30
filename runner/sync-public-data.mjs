import fs from "node:fs";
import path from "node:path";

const root = new URL("..", import.meta.url).pathname;
const copies = [
  ["runner/models.track-b.json", "app/public/data/models.track-b.json"],
  ["runner/run-config.json", "app/public/data/run-config.json"],
  ["runner/judge-config.json", "app/public/data/judge-config.json"],
  ["runner/benchmark-meta.json", "app/public/data/benchmark-meta.json"],
  ["prompts/track-b-v0.1.md", "app/public/prompts/track-b-v0.1.md"],
  ["prompts/judge-pairwise-v0.1.md", "app/public/prompts/judge-pairwise-v0.1.md"]
];

for (const [sourceRelative, targetRelative] of copies) {
  const source = path.join(root, sourceRelative);
  const target = path.join(root, targetRelative);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await fs.promises.copyFile(source, target);
}

const registry = JSON.parse(await fs.promises.readFile(path.join(root, "app/public/data/models.track-b.json"), "utf8"));
console.log(`Synced ${registry.models.length} Track B models and benchmark configs to app/public/data.`);
