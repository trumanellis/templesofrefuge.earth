#!/usr/bin/env bash
# tor-post-deploy — privileged post-deploy actions for templesofrefuge, run as
# ROOT by tor-post-deploy.service (which tor-post-deploy.path triggers when the
# webhook's unprivileged hook drops a request file).
#
# SECURITY: install this OUT OF BAND at /usr/local/bin/tor-post-deploy, root-
# owned. It is deliberately NOT executed from the repo, so a repo compromise
# cannot change what runs as root. It honors only a fixed token vocabulary;
# anything else is ignored. Changing this helper is a manual, root-side reinstall
# (see infra/RUNBOOK.md) — this repo copy is the reference source only.
#
#   sudo install -m 755 /var/www/templesofrefuge/infra/tor-post-deploy.sh \
#        /usr/local/bin/tor-post-deploy
set -uo pipefail

REPO=/var/www/templesofrefuge
REQ="$REPO/.deploy-request"
CADDY_SRC="$REPO/infra/Caddyfile"
CADDY_DST=/etc/caddy/Caddyfile

[ -f "$REQ" ] || { echo "tor-post-deploy: no request file; nothing to do"; exit 0; }
mapfile -t tokens < "$REQ"
rm -f "$REQ"          # consume immediately so the path-unit can re-trigger

rc=0
for t in "${tokens[@]}"; do
  [ -z "$t" ] && continue
  case "$t" in
    restart-tor-checkout)
      echo "→ restarting tor-checkout"
      if systemctl restart tor-checkout && sleep 1 && systemctl is-active --quiet tor-checkout; then
        echo "  tor-checkout active"
      else
        echo "  ERROR: tor-checkout not active after restart"; rc=1
      fi
      ;;
    reload-caddy)
      echo "→ syncing Caddyfile + reloading caddy"
      if caddy validate --adapter caddyfile --config "$CADDY_SRC"; then
        if cp "$CADDY_SRC" "$CADDY_DST" && systemctl reload caddy; then
          echo "  caddy reloaded from repo Caddyfile"
        else
          echo "  ERROR: cp/reload failed"; rc=1
        fi
      else
        echo "  ERROR: caddy validate failed — live config left untouched"; rc=1
      fi
      ;;
    *)
      echo "tor-post-deploy: ignoring unknown token: $t"
      ;;
  esac
done
exit $rc
