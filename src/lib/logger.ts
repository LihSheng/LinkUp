type LogLevel = "info" | "warn" | "error";

function formatPayload(payload?: Record<string, unknown>) {
  if (!payload) {
    return "";
  }

  try {
    return ` ${JSON.stringify(payload)}`;
  } catch {
    return " {\"message\":\"failed to stringify log payload\"}";
  }
}

export function logBackendEvent(
  level: LogLevel,
  scope: string,
  message: string,
  payload?: Record<string, unknown>,
) {
  const line = `[linkup][${scope}] ${message}${formatPayload(payload)}`;

  switch (level) {
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
    case "info":
    default:
      console.log(line);
      break;
  }
}
