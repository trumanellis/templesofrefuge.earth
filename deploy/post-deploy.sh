#!/usr/bin/env bash
# Post-deploy hook — run by the webhook-deploy service (unprivileged, as truman,
# under a NoNewPrivileges sandbox) after a successful `git pull`. The changed
# files arrive on stdin, one repo-relative path per line; cwd is the repo root.
#
# The sandbox blocks sudo — and by design we do NOT want this repo-controlled
# script to hold root. So it only ENQUEUES work: it writes a fixed-vocabulary
# request file that a root-owned systemd path-unit (tor-post-deploy.path) picks
# up and hands to /usr/local/bin/tor-post-deploy — a fixed helper installed out
# of band (never from this repo) that performs only two hardcoded actions.
# Worst case a malicious push can cause: a tor-checkout restart and/or a
# caddy-validated Caddyfile reload — never arbitrary root code.
set -uo pipefail

changed="$(cat)"
actions=""
if printf '%s\n' "$changed" | grep -q '^checkout-worker/src/'; then
  actions+="restart-tor-checkout"$'\n'
fi
if printf '%s\n' "$changed" | grep -qx 'infra/Caddyfile'; then
  actions+="reload-caddy"$'\n'
fi

if [ -n "$actions" ]; then
  tmp="$PWD/.deploy-request.tmp"
  printf '%s' "$actions" > "$tmp"
  mv -f "$tmp" "$PWD/.deploy-request"     # atomic; tor-post-deploy.path triggers
  echo "enqueued privileged post-deploy action(s):"
  printf '%s' "$actions" | sed 's/^/  /'
else
  echo "no privileged post-deploy actions needed (static-only change)"
fi
