# GigaHub Monorepo

GigaHub is Giganet’s operational HelpDesk: a modular, event-oriented application that
applies domain policies across field work and back-office (CRM-like care), without
replacing IXC as the ERP. Built with NestJS, Vite + React, TypeScript, MongoDB
(Mongoose), Redis, and MinIO S3 object storage.

## Workspace Layout

```
gigahub/
├── apps/
│   ├── api/             # NestJS backend application (Global prefix /api/v1)
│   └── web/             # Vite + React frontend (Tailwind CSS v4 + HeroUI)
├── libs/
│   ├── domain/
│   │   ├── customer/              # Cliente (assinante IXC)
│   │   ├── work-order/            # Ordem de serviço + assuntos
│   │   ├── care-inbox/            # Caixa de atendimento e tickets
│   │   └── fiber-access-terminal/ # CTO / terminal de acesso óptico
│   └── shared/
│       ├── kernel/      # IDs, GeoPoint e erros de domínio
│       ├── config/      # Shared Zod environment schema & validator
│       ├── contracts/   # DTOs HTTP, eventos versionados e error envelopes
│       └── tsconfig/    # Shared TypeScript configuration rules
├── docs/                # Architecture documentation and ADRs
├── deploy/k8s/          # Kubernetes manifests (api, web, nginx, ingress)
├── docker/              # Container configs (web nginx)
├── scripts/             # Build/push helpers (k8s-build.sh)
├── Dockerfile           # API image → ghcr.io/typedbywill/gigahub-api
├── Dockerfile.web       # Web image → ghcr.io/typedbywill/gigahub-web
├── docker-compose.yml   # Local infra (MongoDB rs0, Redis, MinIO)
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

### 7. Kubernetes (GHCR)

Build local images:

```bash
pnpm k8s:build
```

Build and push to GHCR (`ghcr.io/typedbywill/gigahub-api:latest`, `gigahub-web:latest`):

```bash
pnpm k8s:push
```

Apply manifests and restart after a push:

```bash
cp deploy/k8s/secret-api.yaml.example deploy/k8s/secret-api.yaml
# edit secrets, then:
pnpm k8s:apply
pnpm k8s:restart
```

Details: [`deploy/k8s/README.md`](./deploy/k8s/README.md).

## Architecture & ADRs

Decision records are available under [`docs/adr/`](./docs/adr/README.md):

- **ADR-0001**: Modular Monolith Strategy
- **ADR-0002**: Unified React Frontend
- **ADR-0003**: Ephemeral Redis Infrastructure
- **ADR-0004**: Short-Lived JWT & Rotating Refresh Tokens
- **ADR-0005**: Event-Driven Gamification Ledger
- **ADR-0006**: MongoDB + Mongoose Primary Database
- **ADR-0007**: Event-Oriented Architecture
