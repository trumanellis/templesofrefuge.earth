# Deploy runbook — two static sites + headless SyncEngine relay on one VPS

This folder is turnkey. When you have a box + SSH, deployment is ~3 commands.
Full rationale lives in the approved plan; this is the operator's checklist.

## What only YOU can do (needs your accounts)
1. **Create the VPS.** Hetzner Cloud → CX22 (2 vCPU / 4GB / 40GB), **Ubuntu 24.04**,
   add your SSH key at creation. Note the public IP.
2. **First-login hardening** (or use Hetzner's cloud-init): create a non-root sudo
   user, disable root SSH + password auth. (The script assumes you're already a
   non-root sudo user.)
3. **DNS at Namecheap** — do this *after* the box serves correctly (step 4 below).
4. **Have the relay source reachable.** IndrasNetwork is a **private** repo, so the
   box can't clone it. rsync it up (step 3 below).

## Files here
| File | Installs to | Purpose |
|------|-------------|---------|
| `setup-vps.sh` | — | one-shot provisioner (swap, ufw, Caddy, sites, build relay, service) |
| `Caddyfile` | `/etc/caddy/Caddyfile` | serves both sites, auto-HTTPS |
| `relay.toml` | `/etc/indras-relay/relay.toml` | relay config (token auto-generated) |
| `indras-relay.service` | `/etc/systemd/system/` | systemd unit for the headless relay |

## Steps

### 1. Copy this folder to the box
```
scp -r deploy/ USER@BOX_IP:~/
```

### 2. rsync the (private) relay source up
```
rsync -az --delete --exclude target --exclude .git \
  /Users/truman/Code/IndrasNetwork/ USER@BOX_IP:~/src/indras-network/
```
(Excludes the 25-crate `target/` and git history — source only. The box rebuilds.)

### 3. Run the provisioner
```
ssh USER@BOX_IP 'cd ~/deploy && ./setup-vps.sh'
```
This installs everything and starts `indras-relay`. The first Rust build takes a
few minutes (swap covers the 4GB box). Sites are served immediately; TLS is
issued once DNS points here.

### 4. Verify BEFORE touching DNS (hit the box by IP / check the service)
```
ssh USER@BOX_IP '
  systemctl status indras-relay --no-pager
  journalctl -u indras-relay -n 40 --no-pager     # expect "Relay node starting", node_id, NO "change-me" warning
  systemctl status caddy --no-pager
  ss -tlnp | grep -E ":80|:443|9090"              # 80/443 public, 9090 localhost only
  ufw status                                       # 22/80/443 only
'
```

### 5. DNS cutover at Namecheap (one domain at a time)
For **each** domain, set A records to `BOX_IP`:
```
templesofrefuge.earth   A  @    BOX_IP
templesofrefuge.earth   A  www  BOX_IP
syncengine.earth        A  @    BOX_IP
syncengine.earth        A  www  BOX_IP
```
Remove the old GitHub Pages A records / the Pages CNAME. Wait for propagation,
then verify HTTPS + certs:
```
curl -I https://templesofrefuge.earth
curl -I https://syncengine.earth
```
In a browser confirm the two live external calls still work:
- templesofrefuge → an article page loads its list (GitHub API, client-side).
- syncengine → the early-access signup submits (SurrealDB Cloud, client-side).

**Rollback:** revert that domain's A records to the GitHub Pages IPs. Keep Pages
deploys live until both domains are verified.

### 6. (Optional, later) Make it *your* personal server
Extract your PlayerId from your `./se` identity, then:
```
sudo sed -i 's/^# owner_player_id.*/owner_player_id = "<HEX>"/' /etc/indras-relay/relay.toml
sudo systemctl restart indras-relay
```

## Ongoing site releases (post-migration)

Both sites are served by Caddy straight out of git clones — no build step, no CDN;
changes are live the moment the clone is pulled.

1. **Commit to `main` and push to GitHub.** To release a single file while a
   feature branch is dirty: `git worktree add <scratch> origin/main`, copy the
   file in, commit, `git push origin HEAD:main`, remove the worktree.
2. **Pull on the box:**
   ```
   ssh truman@BOX_IP 'git -C /var/www/templesofrefuge pull --ff-only'
   ssh truman@BOX_IP 'git -C /var/www/syncengine pull --ff-only'
   ```
3. **Verify live:** curl the changed file and grep for the new text.

Notes:
- The clones must stay owned by the deploy user (`truman:truman`), or git
  refuses with "dubious ownership". Chowned 2026-07-14; re-chown after any
  reprovision.
- Document pages (e.g. bylaws.html) render their markdown source client-side,
  so content edits ship without touching HTML.
- Claude Code allow rules for the two exact pull commands live in
  `.claude/settings.local.json` (untracked), enabling agent-run deploys.

## Notes / decisions already resolved
- **No inbound UDP firewall rule needed.** The relay uses an ephemeral UDP port +
  n0 public relays (`presets::N0`) for hole-punching. (Pinning a fixed port =
  code change, out of scope.)
- **Relay identity auto-persists** at `/var/lib/indras-relay/secret.key` on first run.
- **Admin API stays on localhost** (`127.0.0.1:9090`). Don't expose it without TLS +
  the generated bearer token (see the commented block in `Caddyfile`).
- **Durable build path (later):** build the Linux x86_64 `indras-relay` binary in CI
  and ship just the artifact, so the tiny box never compiles Rust and no private
  source lives on it.
