// Migadu SMTP sender — NODE ONLY.
//
// This file is imported by node-server.js and never by index.js. That split is
// deliberate: `nodemailer` uses Node's net/tls and cannot run on Cloudflare
// Workers, so importing it from the shared handler would break `wrangler dev`
// and any Worker deploy. index.js stays runtime-agnostic and reaches the sender
// through `env.SEND_MAIL`, which is absent on the Worker path — /inquiry simply
// reports itself unconfigured there rather than crashing.
//
// Why Migadu rather than a transactional API:
//   • templesofrefuge.earth already sends through Migadu (MX aspmx1/2.migadu.com)
//     and SPF is `v=spf1 include:spf.migadu.com -all`. That `-all` is a hard
//     fail, so mail sent straight from this box would be rejected downstream.
//     Relaying through Migadu is already SPF-authorised; self-hosting would mean
//     weakening the domain's anti-spoofing posture.
//   • Declarations carry religious belief — GDPR Article 9 data. Migadu is Swiss
//     with European infrastructure, so the content never leaves the EU/EEA and
//     no new processor is introduced.
//
// Config (systemd env on the box — see deploy/env.example):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, INQUIRY_TO

/**
 * Build the sender, or return null when it cannot be built.
 *
 * Returning null rather than throwing keeps the service bootable without mail:
 * checkout is the revenue path and must not fail to start because the inquiry
 * form is half-configured. /inquiry reports 503 until the vars are present.
 *
 * NOTE THE DYNAMIC IMPORT, and do not turn it back into a static one. This
 * service is deployed by `git pull` into /var/www/templesofrefuge, and
 * `node_modules/` is gitignored — so a pull lands this file on the box before
 * anyone has run `npm install`. A top-level `import nodemailer` would then throw
 * at module load, systemd would restart-loop on it, and LIVE CHECKOUT WOULD BE
 * DOWN because the contact form's dependency was missing. Failing soft here
 * turns that outage into a 503 on one route.
 */
export async function createMailer(env) {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'INQUIRY_TO'];
  if (required.some((k) => !env[k])) return null;

  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch {
    console.log('tor-checkout: nodemailer not installed — /inquiry disabled (run npm install)');
    return null;
  }

  const port = Number(env.SMTP_PORT) || 465;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades via STARTTLS. Both are encrypted —
    // never fall back to plaintext, this carries special-category data.
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  /**
   * @param {{subject: string, text: string, replyTo?: string}} msg
   */
  return async function sendMail(msg) {
    await transport.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: env.INQUIRY_TO,
      subject: msg.subject,
      text: msg.text,
      // Lets whoever reads it reply straight to the applicant. The address is
      // validated upstream in index.js before it reaches this header.
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
    });
  };
}
