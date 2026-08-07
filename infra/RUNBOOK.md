# Hetzner runbook — the one deploy document

Everything served from the box lives here: four domains, three app services, and
the push-to-deploy path. This supersedes `infra/DEPLOY.md`,
`checkout-worker/DEPLOY.md`, and the donation gateway's `DEPLOYMENT.md` in the
IndrasNetwork repo.

**State below was verified against the live box on 2026-08-07.** Where a fact is
inherited rather than re-checked it says so.

---

## The box

| | |
|---|---|
| Host | Hetzner, **89.167.41.185**, Helsinki |
| OS | **Ubuntu 26.04 LTS**, x86_64, 2 vCPU, **3 GB RAM**, 4 GB swap |
| Access | `ssh truman@89.167.41.185` (`~/.ssh/id_ed25519`), passwordless sudo |
| Hardening | root SSH off, password auth off, `fail2ban` active, `ufw` 22/80/443 tcp only |

> Older docs said CX22 / Ubuntu 24.04 / 4 GB. The box reports 26.04 and 3 GB.
> It matters: `cargo build` on the full workspace will thrash. Build one crate at
> a time (`-p <crate>`), or better, build elsewhere and ship the binary.

## What runs

Caddy owns :80/:443 and reverse-proxies everything else on loopback.

| Service | Bind | Public name | Comes from |
|---|---|---|---|
| `caddy` | :80/:443 | — | `/etc/caddy/Caddyfile` ← repo `infra/Caddyfile` |
| static sites | 127.0.0.1:9000 | the four domains | git clones in `/var/www/` |
| `tor-checkout` | 127.0.0.1:8787 | `checkout.templesof.earth` | **this repo** — `checkout-worker/src/node-server.js` |
| `indras-donation-gateway` | 127.0.0.1:8788 | `api.templesof.earth` | **prebuilt binary** `/usr/local/bin/` |
| `work-agualila` | 127.0.0.1:3200 | `work.agualila.earth` | `/var/www/work-agualila/server.js` |
| `indras-availability-node` | — | — | `/usr/local/bin/`, config `/etc/indras-availability-node/availability.toml` |
| `webhook-deploy` | loopback via Caddy `/_deploy` | — | `/var/www/syncengine/deploy/webhook.py` |
| `tor-post-deploy.path` | — | — | root helper `/usr/local/bin/tor-post-deploy` |

Clones: `/var/www/{templesofrefuge,syncengine,agualila,work-agualila,downloads}`.
Both `templesof.earth` and `templesofrefuge.earth` serve the **same**
`/var/www/templesofrefuge` checkout — one site block, nothing to keep in sync.

> **`indras-relay` is not installed** (`systemctl is-enabled` → not-found, nothing
> on :9090). `infra/DEPLOY.md` was a briefing for deploying it and that never
> happened; `indras-availability-node` occupies that role now. Don't follow the
> old relay instructions.

---

## Deploying: two different mechanisms

This is the thing most likely to catch you out.

### The sites and `tor-checkout` — push to deploy

Push to `main` on GitHub. A push webhook hits `https://<site>/_deploy`, Caddy
proxies it to `webhook-deploy`, which HMAC-verifies against
`/etc/webhook-deploy/sites.json` and runs `git pull --ff-only`. No build step —
changes are live the moment the clone is pulled.

Post-pull steps are **privilege-separated**. `webhook.py` diffs old→new HEAD and
runs the repo's `deploy/post-deploy.sh` unprivileged (`NoNewPrivileges=true`), so
that hook can only *enqueue*: it writes a fixed-token `.deploy-request`
(`restart-tor-checkout` / `reload-caddy`) when `checkout-worker/src/` or
`infra/Caddyfile` changed. A root path unit (`tor-post-deploy.path`) sees the
file and runs `/usr/local/bin/tor-post-deploy`, which restarts `tor-checkout`
and/or validates + syncs the Caddyfile and reloads Caddy.

That helper is installed **out of band**, not executed from the repo, and honours
only that fixed token vocabulary — so a repo compromise can trigger those two
actions and nothing else. Changing it is a deliberate manual reinstall:

```bash
sudo install -m 755 /var/www/templesofrefuge/infra/tor-post-deploy.sh /usr/local/bin/tor-post-deploy
sudo cp /var/www/templesofrefuge/infra/tor-post-deploy.{path,service} /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now tor-post-deploy.path
```

Changing `webhook.py` itself needs a one-time `sudo systemctl restart
webhook-deploy` — it loads its code once at startup.

Manual fallback if the webhook is down:
`ssh truman@89.167.41.185 'git -C /var/www/templesofrefuge pull --ff-only'`.

### The donation gateway — a binary, by hand

**`git pull` will never update it.** `indras-donation-gateway` is a prebuilt
binary at `/usr/local/bin/`, and its source lives in the **IndrasNetwork** repo
(`crates/indras-donation-gateway`), not this one. Shipping a change means:

```bash
# build for linux/x86_64 (not on the box — 3 GB won't enjoy it)
cargo build --release -p indras-donation-gateway --target x86_64-unknown-linux-gnu
scp target/x86_64-unknown-linux-gnu/release/indras-donation-gateway truman@89.167.41.185:/tmp/
ssh truman@89.167.41.185 '
  sudo install -m 755 /tmp/indras-donation-gateway /usr/local/bin/indras-donation-gateway
  sudo systemctl restart indras-donation-gateway
  curl -s localhost:8788/healthz'
```

The installed binary dates from **2026-07-20**. Anything committed to that crate
since is not live.

---

## Secrets and config on the box (never in the repo)

| File | Owner | Holds |
|---|---|---|
| `/etc/tor-checkout/env` | root 0600 | `STRIPE_SECRET_KEY`, `ALLOWED_ORIGINS`, `PRODUCT_ID` |
| `/etc/indras-donation-gateway/env` | root 0600 | `STRIPE_WEBHOOK_SECRET`, `ADMIN_TOKEN`, `PUBLIC_BASE_URL`, `DOWNLOAD_ARTIFACT_URL` |
| `/etc/indras-donation-gateway/issuer_keypair.tor.bin` | root 0600 | the **production** Temples of Refuge issuer secret |
| `/etc/webhook-deploy/sites.json` | truman 0600 | per-site webhook HMAC secrets |

`ISSUER_KEYPAIR_PATH` is set by an `Environment=` line in the **unit file**, not
in the env file — look there before concluding it's unset.

Two failure modes that are silent rather than loud, both currently **fine**:

- `STRIPE_WEBHOOK_SECRET` unset ⇒ the gateway logs a warning and **accepts
  unsigned webhooks**, i.e. anyone can mint donation claims. Currently set.
- `ISSUER_KEYPAIR_PATH` unset ⇒ falls back to the **embedded dev key**, and seeds
  won't verify in a production app build. Currently set; the live issuer is
  `cdd226ea…`, not the dev `6ccc8b26…`.

Verify the issuer key without reading any secret:

```bash
curl -s https://api.templesof.earth/issuer | grep -o '"root_id":"[^"]*"'
# must NOT be 6ccc8b267071be866c145bc4695523d7e8c7673f2b13e9dd87b4033df7e99aef
```

**`ALLOWED_ORIGINS` lives on the box, not in the repo.** A deploy will not update
it. Miss a domain and the browser's CORS preflight fails, and `/join` silently
falls back to the hosted Stripe link. `checkout-worker/deploy/env.example` shows
the intended value.

---

## Health checks

```bash
ssh truman@89.167.41.185 '
  systemctl is-active caddy tor-checkout indras-donation-gateway webhook-deploy
  curl -s -o /dev/null -w "gateway  %{http_code}\n" localhost:8788/healthz          # 200
  curl -s -o /dev/null -w "checkout %{http_code}\n" localhost:8787/session-status   # 403 without Origin = correct
  git -C /var/www/templesofrefuge log -1 --oneline'
```

From outside:

```bash
curl -sI https://templesof.earth/join
curl -sI https://checkout.templesof.earth/     # valid TLS, not a cert error
curl -sI https://api.templesof.earth/
```

Then load `https://templesof.earth/join` and confirm the **inline** Stripe
checkout renders rather than the hosted-link fallback.

Logs: `journalctl -u webhook-deploy` (pulls), `-u tor-post-deploy` (privileged
steps), `-u indras-donation-gateway`. Note journals need `sudo` — an unprivileged
`journalctl` returns almost nothing, which reads as "no errors" and isn't.

---

## Domain migration: templesofrefuge.earth → templesof.earth

Both names serve one checkout off one site block; pages declare `templesof.earth`
canonical, so search engines consolidate while every old URL keeps returning 200.

DNS at the registrar — four A records to the box: `@`, `www`, `checkout`, `api`.
Leave every `templesofrefuge.earth` record exactly as it is.

**Do NOT 301 the old domain yet.** It must keep answering 200 until
`templesof.earth` is indexed, or existing links and the printed `/mats` QR bounce
through a redirect to a domain search engines haven't credited. When the new name
has settled, cut `templesofrefuge.earth` out of the shared block and give it its
own block that 301s everything across.

Deliberately still on the old domain: the `hello@` / `ola@` mailboxes (no email is
provisioned on templesof.earth), and every `trumanellis/templesofrefuge.earth`
GitHub URL — that is the **repo** name, not the domain. Renaming the repo would
break the client-side article and document loaders.

---

## Gotchas

- Clones must stay owned by `truman:truman` or git refuses with "dubious
  ownership". Re-chown after any reprovision.
- Document pages render their markdown client-side, so content edits ship without
  touching HTML.
- No inbound UDP rule is needed or wanted; keep `ufw` at 22/80/443.
- Don't run `setup-vps.sh` as-is — it re-clones the sites. Reference only.
- Ubuntu 26.04 + edition-2024 Rust: use rustup stable, not distro `rustc`.
