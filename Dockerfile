FROM node:22-bookworm-slim AS builder

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

ARG CLOUD_MATERIALS_GITHUB_TOKEN
RUN test -n "${CLOUD_MATERIALS_GITHUB_TOKEN}" \
    && git clone --depth 1 \
    "https://x-access-token:${CLOUD_MATERIALS_GITHUB_TOKEN}@github.com/Charlie-BU/cloud-materials-common.git" \
    ./cloud-materials-common

ARG VITE_CAM_REMOTE_ENTRY
ARG VITE_API_PUBLIC_BASE_URL=/api
ENV VITE_CAM_REMOTE_ENTRY=${VITE_CAM_REMOTE_ENTRY}
ENV VITE_API_PUBLIC_BASE_URL=${VITE_API_PUBLIC_BASE_URL}
RUN pnpm build

FROM caddy:2-alpine
WORKDIR /srv
ARG API_UPSTREAM_BASE_URL
ENV API_UPSTREAM_BASE_URL=${API_UPSTREAM_BASE_URL}
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]

