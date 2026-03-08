type Primitive = string | number | boolean | null | undefined;

function normalize(value: unknown): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value as Primitive;
  }

  if (typeof value === "bigint") return value.toString();

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  if (Array.isArray(value)) return value.map(normalize);

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalize(entry);
    }
    return out;
  }

  return String(value);
}

function emit(level: "info" | "warn" | "error", scope: string, event: string, payload?: unknown) {
  const logger = level === "warn" ? console.warn : level === "error" ? console.error : console.info;
  if (payload === undefined) {
    logger(`[ShieldBet:${scope}] ${event}`);
    return;
  }

  logger(`[ShieldBet:${scope}] ${event}`, normalize(payload));
}

export function logInfo(scope: string, event: string, payload?: unknown) {
  emit("info", scope, event, payload);
}

export function logWarn(scope: string, event: string, payload?: unknown) {
  emit("warn", scope, event, payload);
}

export function logError(scope: string, event: string, payload?: unknown) {
  emit("error", scope, event, payload);
}
