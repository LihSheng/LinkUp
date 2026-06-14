export function columnIndexToLabel(index: number): string {
  let label = "";
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return `Column ${label}`;
}

export function buildSyntheticColumnNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => columnIndexToLabel(i));
}

export function buildHeaderlessProfileNames(columnNames: string[]): string[] {
  return columnNames.map((_, index) => columnIndexToLabel(index));
}
