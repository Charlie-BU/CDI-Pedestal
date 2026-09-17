FROM node:22-bookworm-slim AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

ARG VITE_CONTENT_OVERRIDE
ENV VITE_CONTENT_OVERRIDE=${VITE_CONTENT_OVERRIDE}
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ARG VITE_GOOGLE_LOGIN_ENABLED=false
ENV VITE_GOOGLE_LOGIN_ENABLED=${VITE_GOOGLE_LOGIN_ENABLED}
RUN pnpm build

FROM caddy:2-alpine
WORKDIR /srv
ARG CDI_UPSTREAM_BASE_URL
ENV CDI_UPSTREAM_BASE_URL=${CDI_UPSTREAM_BASE_URL}
COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
COPY --from=builder /app/dist /srv
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
