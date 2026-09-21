# Launch brief: ship the new design to the live site

**Written 2026-09-21 for the agent working in `~/SyncEngine/truman/templesofearth`.**
Read this whole file before running anything. Stop and report at each STOP.

## The situation in four facts

1. **This folder has no git, and it is where the new site lives.** Development
   moved here from `~/Code/Sites/templesof.earth` around 2026-09-17. The old
   folder still holds the `.git` (remote `trumanellis/templesofrefuge.earth`,
   branch `main`, level with `origin/main` at `7c929db`).
2. **Deploy is a git push.** `git push` to GitHub fires a webhook on the Hetzner
   box (89.167.41.185), which runs `git pull --ff-only` in
   `/var/www/templesofrefuge`. Both `templesof.earth` and
   `templesofrefuge.earth` serve that one checkout. `infra/RUNBOOK.md` is the
   one deploy document; `infra/deploy` is the front door and must run inside a
   git checkout.
3. **The two folders drifted in both directions.** This folder is ahead on the
   front end. The old folder is ahead on the back end, all uncommitted: a
   reworked checkout worker, a new `membership/` service, a longer Caddyfile, a
   membership systemd unit, a longer membership spec.
4. **This launch is front end only.** The back-end work is unfinished and
   touches the live payment path. It gets carried across so it is not lost, and
   it is **not** committed or deployed in this launch.

## What is launching

- Two design systems as token layers over `shared/brand.css`:
  `shared/theme-earth.css` ("Two Skies", linked on the nine Earth pages, Ubuntu
  kept) and `shared/theme-refuge.css` ("Illuminated").
  Record: `plans/DESIGN-SYSTEMS.md`.
- Self-hosted Refuge fonts: ten `Marcellus-*` / `Alegreya-*` woff2 files and
  `shared/fonts/fonts-refuge.css`.
- `shared/brand.js`: one chrome, two identities, chosen by
  `<html data-site="refuge">`. Navigation is deliberately INTERIM (see the
  comment above `SITES`): both domains still share one web root.
- `refuge/index.html`: the first Temples of Refuge page, reachable at
  `/refuge/`. A preview, linked from the Earth nav.
- `index.html`: cosmology backdrops (with `assets/cosmology-backgrounds/`),
  gold literals moved to tokens. `join.html`: error colour moved to a token.
- Plans: `plans/SITE-SPLIT.md`, `plans/DESIGN-SYSTEMS.md`, this file,
  `infra/Caddyfile.split-proposal` (a proposal, not applied).

**Not launching:** the domain split (SITE-SPLIT phase C), any Caddy change, any
change under `checkout-worker/` or `membership/`, any wording change to tax or
status claims (standing rule in `plans/COMPLIANCE.md`: flag, do not rewrite).

## Steps

### 1. Confirm the old folder is quiet
```bash
OLD=~/Code/Sites/templesof.earth
git -C $OLD status --porcelain --untracked-files=no
find $OLD -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -newermt '2026-09-18 20:00' | head
```
Expect six modified tracked files and nothing newer than 18 September. If
anything is newer, **STOP**: someone is still working there.

### 2. Carry the old folder's back-end work across, without overwriting front end
Copy only paths where the old folder is ahead or is the only holder:
```bash
NEW=~/SyncEngine/truman/templesofearth
rsync -a --exclude node_modules --exclude .wrangler $OLD/checkout-worker/ $NEW/checkout-worker/
rsync -a --exclude node_modules --exclude data $OLD/membership/ $NEW/membership/
cp $OLD/infra/Caddyfile $OLD/infra/tor-membership.service $NEW/infra/
cp $OLD/plans/MEMBERSHIP-SERVICE.md $NEW/plans/
cp $OLD/.gitignore $OLD/.nojekyll $NEW/
```
`checkout-worker/.dev.vars` holds local secrets. It comes across with the rsync
and must stay ignored. Never stage it, never print it.

Do **not** copy any `.html`, anything under `shared/`, `refuge/`, `assets/`, or
the two new plans from old to new: this folder's copies are the newer ones.

### 3. Bring git across (copy, do not move)
```bash
cp -R $OLD/.git $NEW/.git
cd $NEW && git status
```
The engine's default ignore list skips `.git`, and `syncengineearth` already
works this way. The old folder stays intact as the fallback until the launch is
verified.

Now read `git status` carefully:
- Any tracked file shown as **deleted** that this brief did not mention: restore
  it with `git restore <path>` and tell Truman which ones.
- Make sure these are ignored, adding lines to `.gitignore` if needed:
  `.claude/`, `.omc/`, `.syncengine*`, `.DS_Store`, `HANDOFF.md`, `PLAN.md`,
  `DM.md`, `membership/data/`, `**/node_modules/`.

**STOP** and show Truman the `git status` summary before committing.

### 4. Commit the launch in slices, front end only
Stage by explicit path. Never `git add -A` in this repo.
1. `shared/fonts/Marcellus-* shared/fonts/Alegreya-* shared/fonts/fonts-refuge.css`
   — "fonts: self-host Marcellus and Alegreya for Temples of Refuge"
2. `shared/theme-earth.css shared/theme-refuge.css shared/brand.js`
   — "design: Two Skies and Illuminated token layers; one chrome, two identities"
3. The nine Earth pages plus `assets/cosmology-backgrounds/` and any new
   `assets/web/*` that `index.html` references
   — "site: link the Earth theme; cosmology backdrops; literals to tokens"
   Check first that every `assets/...` URL in `index.html` exists on disk:
   ```bash
   grep -oE 'assets/[A-Za-z0-9_./ -]+\.(webp|avif|jpg|png|svg)' index.html | sort -u | while read f; do [ -f "$f" ] || echo MISSING $f; done
   ```
4. `refuge/index.html` — "refuge: first Temples of Refuge page, at /refuge/"
5. `plans/SITE-SPLIT.md plans/DESIGN-SYSTEMS.md plans/LAUNCH-BRIEF.md infra/Caddyfile.split-proposal .gitignore`
   — "plans: site split, design systems, launch brief"

Leave everything under `checkout-worker/`, `membership/`, `infra/Caddyfile`,
`infra/tor-membership.service` and `plans/MEMBERSHIP-SERVICE.md` **unstaged**.
They stay as working-tree changes, exactly as they were in the old folder.

### 5. Check locally before pushing
```bash
python3 -m http.server 8791 --bind 127.0.0.1
```
Open `/`, `/mats`, `/join`, `/covenant`, `/refuge/` in light and dark. Expect:
the spectrum line under the header on Earth pages only; ink pill buttons that
turn jade on hover; light-weight sentence-case headlines; the arch and serif
type on `/refuge/` with all five font faces loaded; no console errors except the
checkout endpoint refusing connections, which is normal offline.

### 6. Check the box, then push
```bash
infra/deploy status
```
The August handoff recorded the webhook silently failing, with the box four
commits behind. If `status` shows the box behind `origin/main` **before** you
push, **STOP** and tell Truman; diagnose with
`ssh truman@89.167.41.185 'journalctl -u webhook-deploy -n 50'`.
`infra/deploy` defaults `INDRAS_REPO` to a path that no longer exists; that
only matters for the `gateway` and `availability-node` subcommands, which this
launch does not use.

**STOP** for Truman's explicit yes. Then:
```bash
infra/deploy site
```
It pushes, waits for the box to converge, and verifies. If the webhook does not
fire, the documented fallback is
`ssh truman@89.167.41.185 'git -C /var/www/templesofrefuge pull --ff-only'`.

### 7. Verify live
- `https://templesof.earth/` and `/mats`, `/join`: new theme, both modes.
- `https://templesof.earth/refuge/`: Refuge page, fonts load from
  `/shared/fonts/`, no request leaves the origin.
- `https://templesof.earth/join`: the payment panel still mounts. Nothing in
  this launch touches it, so a failure here means stop and roll back with
  `git revert` of the launch commits and another `infra/deploy site`.
- Caddy serves static files with a one-hour cache; hard-refresh when checking.
- The CSP is report-only. Neither theme needs a new origin; do not add one.

### 8. Afterwards
- Tell Truman the launch is verified, then the old folder can be retired. Do
  not delete it yourself.
- Update the stale pointers: `~/.claude/agents/cta-steward.md` names
  `~/Code/Sites`; `infra/deploy` `INDRAS_REPO` default; `HANDOFF.md`.
- `infra/Caddyfile.split-proposal` was written against the older Caddyfile.
  Rebase it onto the longer one from step 2 before anyone applies it.
- `agualilaearth` has the same missing-git problem and needs the same treatment.

## Known and accepted at launch

- `templesofrefuge.earth/` still shows the Temples of Earth home page. That is
  true until SITE-SPLIT phase C, and the interim navigation is built around it.
- Cosmology, Bylaws and Found a Temple wear the Earth theme for now. They take
  the Refuge look when they move.
- The status and tax claims flagged in `plans/SITE-SPLIT.md` §4 are unchanged.
  They are Truman's decision, and this launch does not make them worse.
