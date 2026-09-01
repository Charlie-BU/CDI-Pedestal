#!/bin/sh
set -eu

# Caddy upstream URLs may contain only scheme, host, and optional port.
# Railway variables are commonly entered with a trailing slash, so normalize it
# before Caddy expands CAM_UPSTREAM_BASE_URL in the Caddyfile.
if [ -n "${CAM_UPSTREAM_BASE_URL:-}" ]; then
    export CAM_UPSTREAM_BASE_URL="${CAM_UPSTREAM_BASE_URL%/}"
fi

exec "$@"
