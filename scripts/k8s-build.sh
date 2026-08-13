#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REGISTRY="${REGISTRY:-ghcr.io}"
OWNER="${OWNER:-typedbywill}"
TAG="${TAG:-latest}"
PUSH="${PUSH:-0}"

API_IMAGE="${API_IMAGE:-${REGISTRY}/${OWNER}/gigahub-api:${TAG}}"
WEB_IMAGE="${WEB_IMAGE:-${REGISTRY}/${OWNER}/gigahub-web:${TAG}}"

pull_image() {
  local name="$1"
  if docker pull "${name}" 2>/dev/null; then
    return 0
  fi
  local mirror="mirror.gcr.io/library/${name}"
  echo "==> Pull de docker.io falhou para ${name}; tentando ${mirror}…"
  docker pull "${mirror}"
  docker tag "${mirror}" "${name}"
}

echo "==> Base images (node/nginx)"
pull_image "node:22-alpine"
pull_image "nginx:1.27-alpine"

BUILD_ARGS=()
if [[ -n "${VITE_MAPBOX_TOKEN:-}" ]]; then
  BUILD_ARGS+=(--build-arg "VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}")
elif [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a
  # Only load the mapbox token if present; ignore the rest of .env for docker build.
  MAPBOX_FROM_ENV="$(grep -E '^VITE_MAPBOX_TOKEN=' .env | tail -1 | cut -d= -f2- || true)"
  set +a
  if [[ -n "${MAPBOX_FROM_ENV}" ]]; then
    BUILD_ARGS+=(--build-arg "VITE_MAPBOX_TOKEN=${MAPBOX_FROM_ENV}")
  fi
fi

echo "==> Building ${API_IMAGE}"
docker build -t "${API_IMAGE}" -f Dockerfile .

echo "==> Building ${WEB_IMAGE}"
docker build -t "${WEB_IMAGE}" -f Dockerfile.web "${BUILD_ARGS[@]}" .

if [[ "${PUSH}" == "1" ]]; then
  echo "==> Logging into ${REGISTRY}"
  if [[ -n "${GHCR_TOKEN:-}" ]]; then
    echo "${GHCR_TOKEN}" | docker login "${REGISTRY}" -u "${OWNER}" --password-stdin
  else
    # Needs scopes: read:packages, write:packages, delete:packages (optional)
    gh auth token | docker login "${REGISTRY}" -u "${OWNER}" --password-stdin
  fi

  echo "==> Pushing ${API_IMAGE}"
  docker push "${API_IMAGE}"

  echo "==> Pushing ${WEB_IMAGE}"
  docker push "${WEB_IMAGE}"

  echo
  echo "Published:"
  echo "  ${API_IMAGE}"
  echo "  ${WEB_IMAGE}"
else
  echo
  echo "Images built locally (not pushed)."
  echo "  ${API_IMAGE}"
  echo "  ${WEB_IMAGE}"
  echo "Push with: pnpm k8s:push"
fi

echo
echo "Deploy:"
echo "  kubectl apply -k deploy/k8s/"
echo "  kubectl -n gigahub rollout restart deploy/api deploy/web"
