"use client";

type UploadExcelProps = {
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  activeTemplateName?: string | null;
};

export function UploadExcel({
  disabled,
  onUpload,
  isUploading,
  activeTemplateName,
}: UploadExcelProps) {
  return (
    <div className="panel rounded-[2rem] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="badge">Workbook upload</p>
          <h2 className="mt-3 text-2xl font-semibold">Load the Excel source file</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Upload an Excel file to continue. The system will detect the best sheet,
            headers, and sample rows automatically.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px]">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            disabled={disabled || isUploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) {
                await onUpload(file);
                event.target.value = "";
              }
            }}
          />
          {isUploading ? "Uploading..." : "Choose Excel file"}
        </label>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[1.7rem] border border-dashed border-[var(--line)] bg-white/70 p-6">
          <p className="text-sm font-semibold">What happens after upload</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li>The workbook is profiled to detect likely header columns.</li>
            <li>Sample rows are extracted for mapping review.</li>
            <li>You can then ask Ollama or LM Studio to suggest field mappings.</li>
          </ul>
        </div>
        <div className="rounded-[1.7rem] border border-[var(--line)] bg-white/70 p-5 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Current schema</p>
          <p className="mt-2">{activeTemplateName ?? "Select or save a schema first."}</p>
          {disabled ? (
            <p className="mt-3 text-[var(--warning)]">
              Upload is disabled until a schema template is available.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
