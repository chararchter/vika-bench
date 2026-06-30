export const CANVAS_WIDTH = 1205;
export const CANVAS_HEIGHT = 1448;

export function makeStrokeCommand({ points, color, size, opacity = 1, composite = "source-over" }) {
  return {
    type: "stroke",
    color,
    size,
    opacity,
    composite,
    points: points.map(([x, y]) => [roundCoord(x), roundCoord(y)])
  };
}

export function normalizeCommand(command) {
  if (!command || typeof command !== "object") {
    throw new Error("Command must be an object.");
  }

  if (command.type === "clear") {
    return { type: "clear" };
  }

  if (command.type !== "stroke") {
    throw new Error(`Unsupported command type: ${command.type}`);
  }

  if (!Array.isArray(command.points) || command.points.length < 2) {
    throw new Error("Stroke commands need at least two points.");
  }

  return {
    type: "stroke",
    color: command.color || "#1c1717",
    size: clamp(Number(command.size || 8), 1, 160),
    opacity: clamp(Number(command.opacity ?? 1), 0.01, 1),
    composite: command.composite === "destination-out" ? "destination-out" : "source-over",
    points: command.points.map((point) => {
      if (!Array.isArray(point) || point.length < 2) {
        throw new Error("Each point must be [x, y].");
      }
      return [
        clamp(Number(point[0]), 0, CANVAS_WIDTH),
        clamp(Number(point[1]), 0, CANVAS_HEIGHT)
      ];
    })
  };
}

export function renderCommands(ctx, commands, options = {}) {
  if (options.clear !== false) {
    clearCanvas(ctx);
  }

  commands.map(normalizeCommand).forEach((command) => {
    if (command.type === "clear") {
      clearCanvas(ctx);
      return;
    }
    drawStroke(ctx, command);
  });
}

export function clearCanvas(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#f7f3ef";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
}

export function drawStroke(ctx, command) {
  const normalized = normalizeCommand(command);
  ctx.save();
  ctx.globalAlpha = normalized.opacity;
  ctx.globalCompositeOperation = normalized.composite;
  ctx.strokeStyle = normalized.color;
  ctx.lineWidth = normalized.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(normalized.points[0][0], normalized.points[0][1]);

  for (let index = 1; index < normalized.points.length - 1; index += 1) {
    const current = normalized.points[index];
    const next = normalized.points[index + 1];
    ctx.quadraticCurveTo(
      current[0],
      current[1],
      (current[0] + next[0]) / 2,
      (current[1] + next[1]) / 2
    );
  }

  const last = normalized.points[normalized.points.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
  ctx.restore();
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function roundCoord(value) {
  return Math.round(Number(value) * 10) / 10;
}
