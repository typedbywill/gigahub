# Kubernetes deploy (nginx + api + frontend)

MongoDB, Redis e MinIO **não** fazem parte deste namespace — aponte `api-secrets` para
serviços existentes (cluster ou gerenciados).

| Workload | Replicas | Image |
|----------|----------|--------|
| `nginx` | 1 | `nginx:1.27-alpine` + ConfigMap |
| `api` | 1 (HPA max 2) | `ghcr.io/typedbywill/gigahub-api:latest` |
| `web` | 1 | `ghcr.io/typedbywill/gigahub-web:latest` |

Entrada pública: Cloudflare Tunnel → `ingress-nginx` → Ingress host **`hub.giganet.dev.br`** → Service `nginx`.

Rotas no nginx interno:

- `/api/` → `api:3000`
- `/socket.io/` → `api:3000` (Socket.IO)
- `/` → `web:80`

## Build & publish (GHCR)

```bash
pnpm k8s:build
pnpm k8s:push
```

Ou:

```bash
./scripts/k8s-build.sh
PUSH=1 ./scripts/k8s-build.sh
```

Variáveis opcionais: `TAG`, `OWNER`, `REGISTRY`, `API_IMAGE`, `WEB_IMAGE`, `VITE_MAPBOX_TOKEN`, `GHCR_TOKEN`.

Pacotes GHCR privados — copie `ghcr-secret` de outro namespace (ou recrie com PAT `read:packages`).

## Secrets / env

`deploy/k8s/secret-api.yaml` é gitignored. Copie o exemplo:

```bash
cp deploy/k8s/secret-api.yaml.example deploy/k8s/secret-api.yaml
```

Preencha JWT ES256, Mongo, Redis, MinIO e IXC. Em produção `JWT_PRIVATE_KEY` e
`JWT_PUBLIC_KEY` são obrigatórios.

## Apply

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl -n giga-telemetry get secret ghcr-secret -o yaml \
  | sed 's/namespace: giga-telemetry/namespace: gigahub/' \
  | kubectl apply -f -
kubectl apply -f deploy/k8s/secret-api.yaml
pnpm k8s:apply
# after push:
pnpm k8s:restart
```

## Check

```bash
kubectl -n gigahub get pods,svc,ingress,hpa
curl -sS -o /dev/null -w "%{http_code}\n" https://hub.giganet.dev.br/api/v1/health
```
