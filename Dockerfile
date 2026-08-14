# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate \
  && apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY nx.json tsconfig.base.json eslint.config.mjs jest.config.ts jest.preset.js ./
RUN --mount=type=cache,id=gigahub-pnpm,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store \
  && pnpm install --frozen-lockfile

FROM deps AS build
COPY apps ./apps
COPY libs ./libs
RUN pnpm exec nx build api --configuration=production

FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate \
  && apk add --no-cache python3 make g++
COPY --from=build /app/dist/apps/api/package.json ./
COPY --from=build /app/dist/apps/api/pnpm-lock.yaml ./
# webpack emits `require("tslib")`; ensure it is present even if generatePackageJson omits it.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.dependencies=p.dependencies||{};if(!p.dependencies.tslib)p.dependencies.tslib='2.8.1';fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
# Standalone install has no root pnpm-workspace.yaml — allow argon2 native build.
RUN printf '%s\n' 'allowBuilds:' '  argon2: true' > pnpm-workspace.yaml
RUN --mount=type=cache,id=gigahub-pnpm-prod,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store \
  && pnpm install --no-frozen-lockfile --prod

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=America/Sao_Paulo \
    LANG=pt_BR.UTF-8

RUN apk add --no-cache tzdata \
  && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
  && echo "America/Sao_Paulo" > /etc/timezone \
  && addgroup -S gigahub \
  && adduser -S gigahub -G gigahub

COPY --from=build /app/dist/apps/api/main.js ./main.js
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json

USER gigahub
EXPOSE 3000
CMD ["node", "main.js"]
