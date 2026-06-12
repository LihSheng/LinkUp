![LinkUp logo](public/linkup-logo.png)

# LinkUp

Warm schema-intelligence workspace for mapping Excel workbooks into a target JSON schema.

## What it does

- Dashboard for existing uploads, mapping runs, and generated outputs.
- Step-by-step wizard for schema selection, workbook upload, mapping review, and output export.
- AI-assisted column matching with human confirmation.
- Persisted schema templates, mapping runs, mapping templates, and final JSON output.

## Stack

- Next.js App Router
- React 19 + TypeScript
- Prisma + PostgreSQL
- ExcelJS + `xlsx`
- Ajv + Zod
- SWR
- shadcn-style UI primitives

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a PostgreSQL database.
3. Run `npm run prisma:generate`.
4. Run `npx prisma db push`.
5. Pick an AI provider in `.env`:
   - `AI_PROVIDER="lmstudio"`
   - `AI_PROVIDER="ollama"`
   - `AI_PROVIDER="nvidia"`
6. Set the matching provider vars:
   - LM Studio: `LM_STUDIO_BASE_URL`, `LM_STUDIO_MODEL`
   - Ollama: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
   - NVIDIA: `NVIDIA_BASE_URL`, `NVIDIA_MODEL`
7. Start the app with `npm run dev`.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run prisma:generate`

## Main Flow

1. Open `/` for the dashboard.
2. Start the wizard at `/wizard/schema`.
3. Select or create a schema template.
4. Upload a workbook at `/wizard/workbook`.
5. Create or resume a mapping run at `/wizard/mapping`.
6. Review the generated JSON at `/wizard/output`.

## Routes

- `/` dashboard home
- `/wizard/schema`
- `/wizard/workbook`
- `/wizard/mapping`
- `/wizard/output`
- `/mapping-templates`

## API Routes

- `GET/POST /api/schema-templates`
- `GET/PATCH/DELETE /api/schema-templates/:id`
- `GET /api/schema-templates/:id/templates`
- `GET /api/mapping-templates`
- `PATCH /api/mapping-templates/:id`
- `POST /api/uploads`
- `GET /api/uploads/:id`
- `POST /api/mapping-runs`
- `GET/PATCH /api/mapping-runs/:id`
- `GET /api/mapping-runs/by-token?token=...`
- `POST /api/mapping-runs/:id/profile`
- `POST /api/mapping-runs/:id/suggest`
- `POST /api/mapping-runs/:id/confirm`
- `POST /api/mapping-runs/:id/output`
- `POST /api/settings/test-connection`

## Data Model

- `SchemaTemplate`
- `UploadedFile`
- `MappingRun`
- `MappingTemplate`
- `GeneratedOutput`

## Notes

- The wizard state is step-gated in session storage.
- `uploadId` restores uploaded workbook state.
- `runId` restores mapping state and final output.
- `templateId` carries the selected schema between wizard steps.

## Testing

- `npm run test`
