![LinkUp logo](public/linkup-logo.png)

# Linkup Schema Matcher

TypeScript-first MVP for mapping Excel columns into a required JSON structure with LM Studio or Ollama suggestions and human confirmation.

## Stack

- Next.js App Router + React + TypeScript
- Prisma + PostgreSQL
- ExcelJS for workbook parsing
- Ajv for JSON Schema validation
- Internal AI service wrapper with switchable LM Studio and Ollama providers

## Setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL and create the database in `DATABASE_URL`.
3. Run `npx prisma generate`.
4. Run `npx prisma db push`.
5. Choose your local model provider in `.env`:
   - `AI_PROVIDER="lmstudio"` with `LM_STUDIO_BASE_URL` and `LM_STUDIO_MODEL`
   - `AI_PROVIDER="ollama"` with `OLLAMA_BASE_URL` and `OLLAMA_MODEL`
6. Start your provider:
   - LM Studio at `http://localhost:1234/v1`
   - Ollama at `http://localhost:11434`
7. Run `npm run dev`.

## MVP flow

1. Save a target JSON schema template.
2. Upload an Excel workbook.
3. Create a mapping run and request suggested mappings.
4. Review and confirm mappings.
5. Generate deterministic JSON output and inspect validation errors.

## API routes

- `GET/POST /api/schema-templates`
- `POST /api/uploads`
- `POST /api/mapping-runs`
- `GET /api/mapping-runs/:id`
- `POST /api/mapping-runs/:id/suggest`
- `POST /api/mapping-runs/:id/confirm`
- `POST /api/mapping-runs/:id/output`

## Testing

- `npm run test`
