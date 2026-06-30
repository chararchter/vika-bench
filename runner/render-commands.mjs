import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  normalizeCommand
} from "../app/src/drawing-engine.js";

export async function renderCommandsToPng(commands, outputPath) {
  const normalized = commands.map(normalizeCommand);
  const svg = renderCommandsToSvg(normalized);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  return {
    outputPath,
    commandCount: normalized.length,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT
  };
}

export function renderCommandsToSvg(commands) {
  const paths = commands
    .filter((command) => command.type === "stroke")
    .map((command) => {
      const pathData = pointsToPath(command.points);
      const stroke = command.composite === "destination-out" ? "#f7f3ef" : command.color;
      return `<path d="${pathData}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="${command.size}" stroke-linecap="round" stroke-linejoin="round" opacity="${command.opacity}"/>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
  <rect width="100%" height="100%" fill="#f7f3ef"/>
  ${paths}
</svg>`;
}

export async function loadCommands(inputPath) {
  const raw = await fs.promises.readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const commands = Array.isArray(parsed) ? parsed : parsed.commands;
  if (!Array.isArray(commands)) {
    throw new Error("Expected a JSON array or an object with a commands array.");
  }
  return commands.map(normalizeCommand);
}

function pointsToPath(points) {
  if (points.length === 2) {
    return `M ${fmt(points[0][0])} ${fmt(points[0][1])} L ${fmt(points[1][0])} ${fmt(points[1][1])}`;
  }

  const [first] = points;
  const parts = [`M ${fmt(first[0])} ${fmt(first[1])}`];

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    parts.push(
      `Q ${fmt(current[0])} ${fmt(current[1])} ${fmt((current[0] + next[0]) / 2)} ${fmt((current[1] + next[1]) / 2)}`
    );
  }

  const last = points[points.length - 1];
  parts.push(`L ${fmt(last[0])} ${fmt(last[1])}`);
  return parts.join(" ");
}

function fmt(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    console.error("Usage: node runner/render-commands.mjs --input commands.json --output final.png");
    process.exit(1);
  }
  const commands = await loadCommands(args.input);
  const result = await renderCommandsToPng(commands, args.output);
  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item.startsWith("--")) {
      args[item.slice(2)] = argv[index + 1];
      index += 1;
    }
  }
  return args;
}
