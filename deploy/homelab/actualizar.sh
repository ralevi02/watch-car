#!/bin/sh
# Baja lo nuevo de main y rehace el worker, solo si no está corriendo nada.
# Lo llama el cron del homelab cada 10 minutos:
#   */10 * * * * $HOME/watch-car/deploy/homelab/actualizar.sh >> $HOME/radar-actualizar.log 2>&1
set -eu
cd "$(dirname "$0")/../.."

git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] && exit 0

if git diff --quiet HEAD origin/main -- apps/worker packages deploy pnpm-lock.yaml package.json; then
  git merge -q --ff-only origin/main
  exit 0
fi

if docker exec radar-worker pgrep -f "src/(pasada|reconectar|fotos-ia|remates)" >/dev/null 2>&1; then
  echo "$(date '+%F %T') hay cambios, pero el worker está ocupado: se reintenta en la próxima vuelta"
  exit 0
fi

git merge -q --ff-only origin/main
cd deploy/homelab
docker compose up -d --build --quiet-pull
echo "$(date '+%F %T') actualizado a $(git rev-parse --short HEAD)"
