# Deploy briefing: headless `indras-relay` on the Hetzner box

You are deploying the **`indras-relay`** binary (the IndrasNetwork blind relay / owner
personal-server) as an always-on systemd service on a Hetzner VPS. Two static sites
(`templesofrefuge.earth`, `syncengine.earth`) already run on this same box behind Caddy —
**do not touch Caddy or the sites**; the relay is independent.

---

## 1. Current state (already true)

**Server:** Hetzner CPX22, Helsinki, **x86_64**, **Ubuntu 26.04 LTS**, public IP **`89.167.41.185`**.
- Access: **`ssh truman@89.167.41.185`** using `~/.ssh/id_ed25519`. **Root SSH is DISABLED** and
  password auth is off — use the `truman` account and `sudo` (passwordless) for privileged steps.
  For a root shell during setup: `sudo -i`.
- Hardened: `fail2ban` active (sshd jail), `PermitRootLogin no`, `PasswordAuthentication no`.
- 2 vCPU, ~3.7 GB RAM, **4 GB swap already enabled**, 71 GB free.
- `ufw` active, allows **22/80/443 tcp only**. Do NOT add a UDP rule (see §5).

**Already installed/configured (leave alone):**
- Build deps present: `git`, `pkg-config`, `libssl-dev`, `build-essential`, `rsync`.
- **Caddy 2.11.4** serving `templesofrefuge.earth` + `syncengine.earth` (both + `www`) over HTTPS
  with valid Let's Encrypt certs, from `/var/www/{templesofrefuge,syncengine}`. Relay must NOT
  bind :80/:443 or alter `/etc/caddy/`.
- Staged deploy files at **`/root/deploy/`**: `relay.toml` (⚠️ token is a placeholder),
  `indras-relay.service`, `Caddyfile`, `setup-vps.sh`, `RUNBOOK.md`.

**Not yet done (your job):** Rust toolchain NOT installed; relay source NOT on box (`/root/src`
absent); no binary, no `/etc/indras-relay`, no `indras` user, no `/var/lib/indras-relay`, no service.

---

## 2. The relay — facts

- Crate `crates/indras-relay`, binary `indras-relay` (`src/main.rs`). Build **only**
  `cargo build --release -p indras-relay` (not the whole 25-crate workspace — it thrashes 4 GB).
- Edition **2024** → use **rustup stable** (≥1.85), not distro `rustc`.
- **CLI:** `indras-relay --config <toml> [--data-dir <dir>] [--admin-bind <ip:port>]` (flags override file).
- **Config** (`RelayConfig`): `data_dir`, `display_name`, `admin_bind` (default `127.0.0.1:9090`),
  `admin_token` (warns if `"change-me"`), `owner_player_id` (Option, 32-byte hex → personal-server
  mode), `[quota]/[storage]/[tiers]` (defaults fine).
- **Identity auto-managed:** first run generates `<data_dir>/secret.key` = stable `node_id`. Back it up.
- **Networking:** `Endpoint::builder(presets::N0).secret_key(sk).bind()` → ephemeral UDP + n0 public
  relays for hole-punching. No fixed inbound port to open. `admin_bind` is only the localhost admin API.

---

## 3. Get source onto the box (private repo)

Run from a local checkout / real agent terminal (NOT a Claude auto-mode session — exfil guard blocks
"private repo → raw IP"). Root login is off, so land it in `truman`'s home:
```bash
ssh truman@89.167.41.185 'mkdir -p ~/src/indras-network'
rsync -az --info=stats1 Cargo.toml Cargo.lock crates simulation xtask \
  truman@89.167.41.185:/home/truman/src/indras-network/
```
Exclude `target/`, `.git/`, `agentN/`. If build errors on a missing workspace member, add that dir and re-rsync.

---

## 4. Build + install + run

Log in as `truman`. Build as `truman` (don't run cargo as root); use `sudo` for the system steps.

```bash
# Toolchain + build (as truman, in ~/src)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env"
cd ~/src/indras-network && cargo build --release -p indras-relay
sudo install -m 0755 target/release/indras-relay /usr/local/bin/indras-relay

# System user + dirs (sudo)
sudo useradd --system --home /var/lib/indras-relay --shell /usr/sbin/nologin indras 2>/dev/null || true
sudo mkdir -p /var/lib/indras-relay /etc/indras-relay && sudo chown -R indras:indras /var/lib/indras-relay

# Config — GENERATE A REAL TOKEN (staged /root/deploy/relay.toml has a placeholder)
sudo cp /root/deploy/relay.toml /etc/indras-relay/relay.toml
TOKEN="$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 40)"
sudo sed -i "s|REPLACE_WITH_A_REAL_TOKEN|$TOKEN|" /etc/indras-relay/relay.toml
sudo chown root:indras /etc/indras-relay/relay.toml && sudo chmod 640 /etc/indras-relay/relay.toml
echo "admin_token = $TOKEN"   # record this
# Optional: sudo-edit relay.toml to set owner_player_id (./se PlayerId, 32-byte hex) → personal server.

# Service (sudo)
sudo cp /root/deploy/indras-relay.service /etc/systemd/system/indras-relay.service
sudo systemctl daemon-reload && sudo systemctl enable --now indras-relay
```
Confirm `data_dir = "/var/lib/indras-relay"` in the toml. Staged unit runs as `indras`,
`Restart=on-failure`, `ProtectSystem=strict`, `RUST_LOG=indras_relay=info`.
(The staged files under `/root/deploy/` are root-owned — read them via `sudo`.)

---

## 5. Firewall / networking
- No UDP rule needed (ephemeral port + n0 relays). Keep `ufw` at 22/80/443.
- Keep `admin_bind` on `127.0.0.1`. If remote admin ever needed, reverse-proxy via Caddy subdomain
  with TLS + bearer token (commented block in `/root/deploy/Caddyfile`) — never bind `0.0.0.0`.

---

## 6. Verify (as truman, with sudo)
```bash
sudo systemctl status indras-relay --no-pager
sudo journalctl -u indras-relay -n 40 --no-pager   # "Relay node starting" + node_id; NO "change-me" warning
sudo ss -tlnp | grep 9090                            # admin on 127.0.0.1 only
sudo ss -tlnp | grep -E ':80|:443'                   # still caddy (untouched)
sudo systemctl restart indras-relay                  # data in /var/lib/indras-relay persists
```
End-to-end: from a local `./se` peer, confirm it reaches this relay's `node_id`.

## 7. After deploy
Back up `/var/lib/indras-relay/secret.key`; record `admin_token`; later enable Hetzner backups +
harden (non-root user, disable root SSH, fail2ban).

## Gotchas
- Build only `-p indras-relay`. If it OOMs: `cargo build --release -p indras-relay -j 2`.
- Don't run `setup-vps.sh` as-is (re-clones sites — reference only).
- Ubuntu 26.04 + edition-2024: rustup stable, not distro rustc.
