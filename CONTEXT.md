# LinkUp Context

Use this file as the first stop before re-exploring the repo.

## Glossary

- `schema template`: the reusable target schema definition a user chooses before uploading source data.
- `header resolution`: the user decision made when LinkUp cannot confidently choose a workbook header row.
- `mapping run`: one wizard session for one source upload matched against one schema template.
- `mapping template`: the reusable finalized mapping result created after confirm, used for future imports.
- `draft token`: the unguessable token that resumes a specific mapping run.
- `display name`: the editable human label for a mapping run or mapping template.
- `headerless workbook`: an Excel or CSV source table that has data rows but no confirmed header row, so LinkUp uses synthetic source column names.
- `masked column profile`: a source-column summary safe enough for the mapping engine, using column identity, detected type, statistics, and masked sample patterns instead of raw uploaded values.
- `masked row pattern`: a limited cross-column sample used only when column profiles are not enough, where every cell is masked and unsafe free-text values are omitted.
- `masking audit summary`: a non-sensitive record of what sanitized data shape was shared with the mapping engine for a mapping run.

## 1. Project Shape

- Framework: Next.js App Router.
- Language: TypeScript.
- UI: React 19 with custom UI primitives under `src/components/ui`.
- Data: Prisma + PostgreSQL.
- File parsing: ExcelJS + `xlsx`.
- Validation: Ajv + Zod.
- Client data fetch: SWR.
- Other deps in active use: `lucide-react`, `sonner`, `clsx`, `tailwind-merge`.

## 2. Main Routes

- `/` -> dashboard home in `src/app/page.tsx`.
- `/wizard` -> redirect to `/wizard/schema`.
- `/wizard/schema` -> schema template picker / editor.
- `/wizard/workbook` -> source workbook upload / restore.
- `/wizard/mapping` -> mapping run creation, AI suggestion, manual review, confirmation.
- `/wizard/output` -> generated output review and export.
- `/mapping-templates` -> listing page for saved mapping templates.

API routes:

- `GET /api/schema-templates`
- `POST /api/schema-templates`
- `PATCH /api/schema-templates/:id`
- `DELETE /api/schema-templates/:id`
- `GET /api/mapping-templates`
- `PATCH /api/mapping-templates/:id`
- `POST /api/uploads`
- `GET /api/uploads/:id`
- `POST /api/mapping-runs`
- `GET /api/mapping-runs/:id`
- `POST /api/mapping-runs/:id/suggest`
- `POST /api/mapping-runs/:id/confirm`
- `POST /api/mapping-runs/:id/output`

## 3. Wizard Flow Today

The active wizard is the `/wizard/*` App Router flow, not the older monolithic workbench component.

- `src/app/wizard/layout.tsx` wraps all wizard pages in `WizardProgressProvider` and `WizardShell`.
- `src/components/wizard/WizardShell.tsx` renders the left step nav, active step header, and the guarded "Back to dashboard" action.
- `src/components/wizard/WizardProgressContext.tsx` stores completed steps in `sessionStorage` under `linkup:wizard:completed-steps`.
- Step access rule: step `N` is accessible only after step `N - 1` is completed. Step `0` is always accessible.
- The schema page resets wizard progress on mount, so a fresh visit to `/wizard/schema` starts a new wizard session.

Flow:

1. Schema step selects or creates a schema template.
2. Workbook step uploads a file or restores an existing upload by `uploadId`.
3. Mapping step creates or resumes a `MappingRun`, suggests mappings, then lets the user confirm.
4. Output step loads the run and shows final JSON + validation errors.

## 4. Step 1: Schema Pick

Current implementation lives in:

- `src/app/wizard/schema/page.tsx`
- `src/app/wizard/schema/CreateTemplateModal.tsx`
- `src/lib/schema/schema.service.ts`
- `src/app/api/schema-templates/route.ts`
- `src/app/api/schema-templates/[id]/route.ts`

Behavior:

- Fetches templates with SWR from `GET /api/schema-templates`.
- Lets the user select an existing template card.
- Lets the user inspect, edit, or delete a template.
- Lets the user create a new template with `CreateTemplateModal`.
- The modal can build a schema from uploaded sample rows using `buildTemplateFieldsFromRows()` in `src/lib/excel/template-import.ts`.
- Saved templates store `jsonSchema` plus a flattened `canonicalFields` cache.
- Clicking Next requires a selected template, calls `completeStep(0)`, and routes to `/wizard/workbook?templateId=...`.

Important detail:

- The selected schema is not persisted in a separate draft table. It is carried forward by `templateId` in the URL and reloaded from the database when needed.

## 5. Workbook / Mapping / Output State

Workbook step:

- `src/app/wizard/workbook/page.tsx`
- Upload posts to `POST /api/uploads`.
- If `uploadId` exists in the query string, the page restores the workbook preview through `GET /api/uploads/:id`.
- The current sheet name is preserved in the query string as `sheet`.
- Next calls `completeStep(1)` and routes to `/wizard/mapping?uploadId=...&sheet=...&templateId=...`.

Mapping step:

- `src/app/wizard/mapping/page.tsx`
- `src/components/wizard/MappingWorkbench.tsx`
- If `runId` exists, the page loads `GET /api/mapping-runs/:id` and rehydrates the run.
- If no run exists, `MappingWorkbench` creates one with `POST /api/mapping-runs`, then calls `POST /api/mapping-runs/:id/suggest`, then lets the user confirm mappings.
- Confirmation persists `confirmedMapping` to the run and generates output with `POST /api/mapping-runs/:id/output`.
- On completion, the page routes to `/wizard/output?runId=...`.

Output step:

- `src/app/wizard/output/page.tsx`
- `src/components/wizard/MappingCompleteScreen.tsx`
- Loads run/output from `GET /api/mapping-runs/:id`.
- Shows validation result and lets the user export JSON or Excel.

## 6. Persistence / Resume

There is no dedicated resume-token or draft-token model in the current code.

What persists:

- `WizardProgressContext` only remembers completed step indices in `sessionStorage`.
- `UploadedFile` rows persist uploaded workbook metadata and `storagePath`.
- `MappingRun` rows persist `columnProfiles`, `sampleRows`, `suggestedMapping`, `confirmedMapping`, `status`, and the foreign keys to upload + schema.
- `MappingTemplate` rows persist the saved mapping result and are browsable from `/mapping-templates`.
- `GeneratedOutput` rows persist final JSON output and validation errors.

How resume works:

- `uploadId` restores the workbook preview.
- `runId` restores the mapping run and output.
- `templateId` carries the selected schema between steps.

Dormant / partial model:

- `MappingTemplate` exists in `prisma/schema.prisma`, but there is no API or UI flow that creates or loads it today.
- `SchemaTemplate.templates` is only used as a delete guard count.

## 7. Database Models

Defined in `prisma/schema.prisma`:

- `SchemaTemplate`
  - `id`, `name`, `description`, `jsonSchema`, `canonicalFields`, `createdAt`, `updatedAt`
  - relations: `runs`, `templates`
- `UploadedFile`
  - `id`, `originalName`, `storagePath`, `workbookMeta`, `createdAt`
  - relation: `runs`
- `MappingRun`
  - `id`, `uploadedFileId`, `schemaTemplateId`, `sourceSheetName`, `columnProfiles`, `sampleRows`, `suggestedMapping`, `confirmedMapping`, `status`, `createdAt`, `updatedAt`
  - relation: `output`
- `MappingTemplate`
  - `id`, `schemaTemplateId`, `name`, `sourceSignature`, `confirmedMapping`, `createdAt`, `updatedAt`
- `GeneratedOutput`
  - `id`, `mappingRunId`, `jsonOutput`, `errors`, `createdAt`

## 8. Legacy / Extra Surfaces

These files exist, but they are not the active `/wizard/*` flow:

- `src/components/SchemaMatcherWorkbench.tsx` -> older monolithic import wizard prototype.
- `src/components/SchemaEditor.tsx` -> reusable schema editor card from the earlier prototype.
- `src/components/UploadExcel.tsx` -> reusable upload card from the earlier prototype.
- `src/components/wizard/SchemaMappingWorkbench.tsx` -> demo / alternate matching surface.

Treat them as legacy unless the user explicitly asks about the older prototype.

## 9. High-Signal Files

- `package.json`
- `prisma/schema.prisma`
- `src/app/layout.tsx`
- `src/app/wizard/layout.tsx`
- `src/components/wizard/WizardShell.tsx`
- `src/components/wizard/WizardProgressContext.tsx`
- `src/app/wizard/schema/page.tsx`
- `src/app/wizard/schema/CreateTemplateModal.tsx`
- `src/app/wizard/workbook/page.tsx`
- `src/app/wizard/mapping/page.tsx`
- `src/components/wizard/MappingWorkbench.tsx`
- `src/app/wizard/output/page.tsx`
- `src/components/wizard/MappingCompleteScreen.tsx`
- `src/lib/schema/schema.service.ts`
- `src/lib/excel/template-import.ts`
- `src/lib/excel/excel.service.ts`
- `src/lib/mapping/mapping.service.ts`
- `src/lib/mapping/transform.service.ts`

## 10. Useful Mental Model

- Schema template is the target contract.
- Uploaded file is the source workbook.
- Mapping run is the persisted draft of one workbook + one schema pairing.
- Confirmed mapping is the saved user decision.
- Generated output is the final artifact.
- Step access is local session UI state only; the database is the real persistence layer.
