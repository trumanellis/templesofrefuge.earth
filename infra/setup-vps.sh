#!/usr/bin/env bash
#
# setup-vps.sh — provision a fresh Ubuntu 24.04 box to serve two static sites
# (templesofrefuge.earth + syncengine.earth) behind Caddy, and run the headless
# Indras relay (SyncEngine) as a systemd service.
#
# Run as a NON-root sudo user on the box, from a dir that also contains the
# sibling files: Caddyfile, indras-relay.service, relay.toml
#
#   scp -r deploy/ user@BOX:~/     &&     ssh user@BOX 'cd deploy && ./setup-vps.sh'
#
# Idempotent-ish: safe to re-run. Review the CONFIG block before first run.
set -euo pipefail

# ─────────────────────────── CONFIG ───────────────────────────
TOR_REPO="https://github.com/trumanellis/templesofrefuge.earth.git"   # site A
SE_REPO="https://github.com/trumanellis/syncengine.earth.git"         # site B  (verify URL)
INDRAS_REPO="https://github.com/trumanellis/IndrasNetwork.git"        # relay   (PRIVATE? if clone 404s, use rsync — see RUNBOOK)
INDRAS_BRANCH="main"
# ───────────────────────────────────────────────────────────────

here="$(cd "$(dirname "$0")" && pwd)"
echo "==> Using deploy files from: $here"

# 1) Swap (build insurance on 4GB RAM) ---------------------------------------
if ! swapon --show | grep -q '/swapfile'; then
  echo "==> Creating 4G swapfile"
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# 2) Base packages -----------------------------------------------------------
echo "==> Installing base packages"
sudo apt-get update -y
sudo apt-get install -y git curl ufw pkg-config libssl-dev build-essential \
     debian-keyring debian-archive-keyring apt-transport-https

# 3) Firewall ----------------------------------------------------------------
echo "==> Configuring ufw (22/80/443 tcp; no fixed inbound UDP needed)"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 4) Caddy -------------------------------------------------------------------
if ! command -v caddy >/dev/null; then
  echo "==> Installing Caddy"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi

# 5) Deploy the two static sites --------------------------------------------
deploy_site () { # $1=repo $2=target
  local repo="$1" target="$2"
  if [ -d "$target/.git" ]; then
    echo "==> Updating $target"; sudo git -C "$target" pull --ff-only
  else
    echo "==> Cloning $repo -> $target"; sudo git clone --depth 1 "$repo" "$target"
  fi
}
sudo mkdir -p /var/www
deploy_site "$TOR_REPO" /var/www/templesofrefuge
deploy_site "$SE_REPO"  /var/www/syncengine
sudo chown -R caddy:caddy /var/www

echo "==> Installing Caddyfile"
sudo cp "$here/Caddyfile" /etc/caddy/Caddyfile
sudo systemctl reload caddy || sudo systemctl restart caddy

# 6) Build the relay ---------------------------------------------------------
if ! command -v cargo >/dev/null; then
  echo "==> Installing Rust toolchain"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  # shellcheck disable=SC1091
  source "$HOME/.cargo/env"
fi
source "$HOME/.cargo/env" 2>/dev/null || true

SRC="$HOME/src/indras-network"
# IndrasNetwork is a PRIVATE repo. Preferred path: rsync the source here from
# your local machine before running this script (see RUNBOOK), so no repo
# credentials ever touch the box:
#   rsync -az --delete --exclude target --exclude .git \
#         /Users/truman/Code/IndrasNetwork/ user@BOX:~/src/indras-network/
if [ -f "$SRC/Cargo.toml" ]; then
  echo "==> Using relay source already present at $SRC"
elif [ -d "$SRC/.git" ]; then
  echo "==> Updating relay source"; git -C "$SRC" pull --ff-only || true
else
  echo "==> Relay source not found at $SRC. Attempting clone (works only if repo is reachable)..."
  mkdir -p "$HOME/src"
  git clone --branch "$INDRAS_BRANCH" "$INDRAS_REPO" "$SRC" || {
    echo "!! Clone failed (IndrasNetwork is private). rsync the source to $SRC first — see RUNBOOK." >&2
    exit 1
  }
fi
echo "==> Building indras-relay (release, single package)"
( cd "$SRC" && cargo build --release -p indras-relay )
sudo install -m 0755 "$SRC/target/release/indras-relay" /usr/local/bin/indras-relay

# 7) Relay service user, data dir, config ------------------------------------
if ! id indras >/dev/null 2>&1; then
  echo "==> Creating 'indras' service user"; sudo useradd --system --home /var/lib/indras-relay --shell /usr/sbin/nologin indras
fi
sudo mkdir -p /var/lib/indras-relay /etc/indras-relay
sudo chown -R indras:indras /var/lib/indras-relay

echo "==> Installing relay.toml (generating admin token)"
TOKEN="$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 40)"
sudo cp "$here/relay.toml" /etc/indras-relay/relay.toml
sudo sed -i "s|REPLACE_WITH_A_REAL_TOKEN|$TOKEN|" /etc/indras-relay/relay.toml
sudo chown root:indras /etc/indras-relay/relay.toml
sudo chmod 640 /etc/indras-relay/relay.toml
echo "    Admin token written to /etc/indras-relay/relay.toml (root:indras 640)"

echo "==> Installing systemd unit"
sudo cp "$here/indras-relay.service" /etc/systemd/system/indras-relay.service
sudo systemctl daemon-reload
sudo systemctl enable --now indras-relay

echo
echo "==> DONE. Next:"
echo "    systemctl status indras-relay --no-pager"
echo "    journalctl -u indras-relay -n 40 --no-pager"
echo "    (point DNS at this box; Caddy will issue certs on first hit)"
