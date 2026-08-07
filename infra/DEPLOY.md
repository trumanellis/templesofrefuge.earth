# Superseded — see [RUNBOOK.md](./RUNBOOK.md)

This file was a briefing for deploying the **`indras-relay`** binary to the
Hetzner box. That deployment never happened: as of 2026-08-07 `indras-relay` is
not installed there (`systemctl is-enabled indras-relay` → not-found, nothing
listening on :9090), and `indras-availability-node` occupies that role instead.

Following the instructions that used to live here would have you build and
install a service the box does not run.

Everything true about the box — hosts, services, secrets, both deploy
mechanisms, health checks — is now in **[RUNBOOK.md](./RUNBOOK.md)**.

Git history has the original if you need the relay build notes.
