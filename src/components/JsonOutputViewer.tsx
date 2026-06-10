"use client";

type JsonOutputViewerProps = {
  output: unknown;
  errors: unknown;
};

export function JsonOutputViewer({ output, errors }: JsonOutputViewerProps) {
  const hasErrors =
    Array.isArray(errors) ? errors.length > 0 : Boolean(errors && JSON.stringify(errors) !== "[]");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
      <div className="panel rounded-[2rem] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="badge">JSON output</p>
            <h2 className="mt-3 text-2xl font-semibold">Preview the generated records</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This is the transformed payload after the confirmed mapping was applied to
              every workbook row.
            </p>
          </div>
          <span className="badge">{hasErrors ? "Validation needs review" : "Validation passed"}</span>
        </div>
        <pre className="code mt-5 max-h-[42rem] overflow-auto rounded-[1.5rem] bg-[#fffdfa] p-4 text-xs leading-6">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>

      <div className="panel rounded-[2rem] p-6">
        <h3 className="text-xl font-semibold">Validation report</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Review this only if the output is blocked or you want the exact schema errors.
        </p>
        <pre className="code mt-4 max-h-[42rem] overflow-auto rounded-[1.5rem] bg-[#fffdfa] p-4 text-xs leading-6">
          {JSON.stringify(errors, null, 2)}
        </pre>
      </div>
    </div>
  );
}
