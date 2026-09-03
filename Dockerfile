FROM node:22-bookworm-slim AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

ARG VITE_CAM_REMOTE_ENTRY
ENV VITE_CAM_REMOTE_ENTRY=${VITE_CAM_REMOTE_ENTRY}
ARG VITE_CONTENT_OVERRIDE
ENV VITE_CONTENT_OVERRIDE=${VITE_CONTENT_OVERRIDE}
ARG VITE_HIDE_MENUS
ENV VITE_HIDE_MENUS=${VITE_HIDE_MENUS}
RUN pnpm build

FROM caddy:2-alpine
WORKDIR /srv
ARG CAM_UPSTREAM_BASE_URL
ENV CAM_UPSTREAM_BASE_URL=${CAM_UPSTREAM_BASE_URL}
COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
COPY --from=builder /app/dist /srv
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
