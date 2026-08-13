# GigaHub Monorepo

GigaHub is a unified modular application built with NestJS, Vite + React, TypeScript, MongoDB (Mongoose), Redis, and MinIO S3 object storage.

## Workspace Layout

```
gigahub/
├── apps/
│   ├── api/             # NestJS backend application (Global prefix /api/v1)
│   └── web/             # Vite + React frontend (Tailwind CSS v4 + HeroUI)
├── libs/
│   ├── domain/
│   │   ├── customer/    # Cliente (assinante IXC)
│   │   ├── work-order/  # Ordem de serviço + assuntos
│   │   └── care-inbox/  # Caixa de atendimento e tickets
│   └── shared/
│       ├── kernel/      # IDs, GeoPoint e erros de domínio
│       ├── config/      # Shared Zod environment schema & validator
│       ├── contracts/   # DTOs HTTP, eventos versionados e error envelopes
│       └── tsconfig/    # Shared TypeScript configuration rules
├── docs/                # Architecture documentation and ADRs
├── docker-compose.yml   # Infrastructure setup (MongoDB rs0, Redis, MinIO)
└── package.json         # Workspace root package.json
```

## Quick Start (Local Development)

### 1. Prerequisites

- **Node.js**: v22.x
- **pnpm**: v11.x
- **Docker & Docker Compose**: For running infrastructure services

### 2. Infrastructure Setup

Launch MongoDB replica set (`rs0`), Redis, and MinIO (with automatic `gigahub` bucket creation):

```bash
pnpm docker:up
```

To stop containers:

```bash
pnpm docker:down
```

### 3. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 4. Running Applications

Start the backend API (`apps/api` at http://localhost:3000/api/v1):

```bash
pnpm nx serve api
# OR
pnpm dev:api
```

Start the web application (`apps/web` at http://localhost:4200):

```bash
pnpm nx serve web
# OR
pnpm dev:web
```

### 5. Building Applications

```bash
pnpm nx build api
pnpm nx build web
# OR
pnpm build:api
pnpm build:web
```

### 6. Linting & Formatting

```bash
pnpm lint
pnpm format
```

## Architecture & ADRs

Decision records are available under [`docs/adr/`](./docs/adr/README.md):

- **ADR-0001**: Modular Monolith Strategy
- **ADR-0002**: Unified React Frontend
- **ADR-0003**: Ephemeral Redis Infrastructure
- **ADR-0004**: Short-Lived JWT & Rotating Refresh Tokens
- **ADR-0005**: Event-Driven Gamification Ledger
- **ADR-0006**: MongoDB + Mongoose Primary Database
