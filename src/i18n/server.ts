import en from "./messages/en.json";

function get(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

export function serverT(key: string, vars?: Record<string, string>): string {
  let msg = get(en, key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(`{{${k}}}`, v);
    }
  }
  return msg;
}
