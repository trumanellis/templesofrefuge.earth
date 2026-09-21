// Poll vote storage — one JSON line per vote, in the service's systemd
// StateDirectory (/var/lib/tor-checkout on the box). Node-only, like the mailer:
// index.js sees env.POLL_STORE and answers 503 when it is absent (the Worker
// path, or a box whose unit has no StateDirectory yet).
//
// Unlike /inquiry, this DOES store: a vote is a first name, three design picks,
// an optional yes/maybe/no, an optional short comment, and an optional email
// given only to be told when the mats are available — not special-category
// data. When a poll closes, export the notify list and delete the file.

import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function createPollStore(env) {
  // systemd may pass several colon-separated state dirs; ours is the first.
  const dir = (env.STATE_DIRECTORY || '').split(':')[0];
  if (!dir) return null;
  const file = join(dir, 'poll-votes.jsonl');
  return {
    async append(record) {
      await appendFile(file, JSON.stringify(record) + '\n', { mode: 0o600 });
    },
    async all() {
      let text;
      try {
        text = await readFile(file, 'utf8');
      } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
      }
      const out = [];
      for (const line of text.split('\n')) {
        if (!line) continue;
        try { out.push(JSON.parse(line)); } catch { /* skip a torn line */ }
      }
      return out;
    },
  };
}
