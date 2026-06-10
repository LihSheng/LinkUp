export function detectHeaderRow(rows: unknown[][]) {
  return rows.findIndex((row) =>
    row.some((cell) => String(cell ?? "").trim().length > 0),
  );
}
