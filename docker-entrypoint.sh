#!/bin/sh
set -eu

# Caddy upstream URLs may contain only scheme, host, and optional port.
# Railway variables are commonly entered with a trailing slash, so normalize it
# before Caddy expands CDI_UPSTREAM_BASE_URL in the Caddyfile.
if [ -n "${CDI_UPSTREAM_BASE_URL:-}" ]; then
    export CDI_UPSTREAM_BASE_URL="${CDI_UPSTREAM_BASE_URL%/}"
fi

# Serialize only public configuration; never expose the full environment.
jq -n --arg url "${CDI_HOME_PAGE_URL:-}" '{homePageUrl: $url}' > /srv/runtime-config.json.tmp
mv /srv/runtime-config.json.tmp /srv/runtime-config.json

exec "$@"
