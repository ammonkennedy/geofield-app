# GeoField Workspace

## Overview

GeoField is a geology field data collection app built as a pnpm monorepo. It allows geologists to record water, rock, and soil/sand samples with type-specific parameter forms, organize them into folders, and export data to CSV.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Authentication**: Replit Auth (OpenID Connect with PKCE)
- **Frontend**: React + Vite with Tailwind CSS, shadcn/ui components
- **State management**: TanStack React Query (via generated hooks)
- **Forms**: react-hook-form + zod
- **Export**: papaparse (CSV)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (auth, samples, folders)
│   └── geofield/           # React + Vite frontend app (served at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

- **Account-based auth** — professors and students each log in with Replit accounts
- **Sample types** — Water, Rock, Soil/Sand with type-specific parameter forms
- **Folders** — organize samples into project folders or field trips
- **Export** — export samples as CSV for use in Excel/Word
- **Sample detail** — full read/edit view with inline editing

## Database Schema

- `users` — Replit Auth user accounts
- `sessions` — cookie-based session store
- `folders` — project folders per user
- `samples` — field samples with JSON `fields` column for type-specific parameters

## API Endpoints (all at /api)

- `GET /auth/user` — current user info
- `GET /login` — OIDC login redirect
- `GET /callback` — OIDC callback handler
- `GET /logout` — OIDC logout
- `GET/POST /folders` — list/create folders
- `PUT/DELETE /folders/:id` — update/delete folder
- `GET/POST /samples` — list/create samples (folderId query param for filtering)
- `GET/PUT/DELETE /samples/:id` — get/update/delete sample
- `PATCH /samples/:id/move` — move sample to different folder

## Key Files

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/auth.ts` — users & sessions tables
- `lib/db/src/schema/samples.ts` — folders & samples tables
- `artifacts/api-server/src/routes/` — route handlers
- `artifacts/api-server/src/lib/auth.ts` — session management
- `artifacts/geofield/src/pages/` — frontend pages
- `artifacts/geofield/src/components/fields/SchemaForms.tsx` — type-specific sample forms

## Development

- Run codegen: `pnpm --filter @workspace/api-spec run codegen`
- Push DB schema: `pnpm --filter @workspace/db run push`
- API server dev: `pnpm --filter @workspace/api-server run dev`
- Frontend dev: `pnpm --filter @workspace/geofield run dev`
