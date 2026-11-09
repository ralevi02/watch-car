FROM node:22-bookworm

ENV TZ=America/Santiago DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get install -y --no-install-recommends xvfb x11vnc novnc websockify tzdata \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ia/package.json packages/ia/
RUN pnpm install --frozen-lockfile --filter "@radar/worker..."
RUN cd apps/worker && npx patchright install --with-deps chrome

COPY packages packages
COPY apps/worker apps/worker
COPY deploy/homelab/arrancar.sh /arrancar.sh

WORKDIR /app/apps/worker
CMD ["/arrancar.sh"]
