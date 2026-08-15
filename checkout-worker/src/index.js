// Temples of Earth (legal name Temples of Refuge) — checkout backend (Cloudflare Worker).
//
// The join page is a static site (GitHub Pages) with no server of its own.
// Stripe's embedded Checkout needs a Checkout Session minted with the SECRET
// key, and "pay what you want" amounts aren't supported by embedded components
// — so this Worker builds the price from the donor's chosen amount and hands
// back a client_secret the page mounts inline.
//
// Secrets (never shipped in the static site):
//   STRIPE_SECRET_KEY  — set with:  wrangler secret put STRIPE_SECRET_KEY
// Vars (wrangler.toml):
//   ALLOWED_ORIGINS    — comma-separated origins allowed to call this Worker
//   PRODUCT_ID         — the Stripe product each offering is recorded against
//
// Routes:
//   POST /create-session   { amount, currency }                 -> { client_secret }  (offering)
//   POST /create-session   { order_type:'ceremony-mat', ... }   -> { client_secret }  (product)
//   GET  /session-status  ?session_id=...                        -> { status, customer_email, ... }
//   GET  /founding-status                                        -> { remaining, open, founding_price, ... }

const STRIPE_API = 'https://api.stripe.com/v1';

// Currencies the offering supports. All are two-decimal, so the donor's chosen
// numeral maps to minor units as number × 100 uniformly — the sacred number is
// preserved (11 → €11 / £11 / $11), never FX-converted.
const ALLOWED_CURRENCIES = new Set(['usd', 'eur', 'gbp', 'cad', 'aud']);

// Shown on the Stripe payment form above the submit button, and the last thing a
// donor reads before paying. The second paragraph is the Rev. Rul. 63-252 control
// acknowledgment: a US donor's deduction survives only if Temples of Refuge keeps
// complete control and discretion over the funds, so the offering is never
// solicited for — and never described as reaching — any named place or project.
// Do not add a destination to this string.
const COVENANT_MESSAGE =
  'By making this offering you sign the Covenant and affirm the One Commandment — ' +
  'to recognize the divine in every Other and treat them as an extension of yourself. ' +
  'Membership is for life. Your gift supports the mission of Temples of Refuge — the ' +
  'network of temples, the Synchronicity Engine, and the stewardship of sacred lands. ' +
  'This contribution is made with the understanding that the donee organization has ' +
  'complete control and administration over the use of the donated funds.';

// (INVOICE_FOOTER removed with invoice_creation. The exact wording is preserved
// verbatim in plans/MEMBERSHIP-SERVICE.md as a hard requirement on the statement
// renderer — it must not be paraphrased when it moves to our own document.)

// ── The Ceremony Mat — first physical offering ──────────────────────────────
// A fixed-catalog product, so its price is SERVER-authoritative: the client
// asks to buy a mat, and this Worker decides the price. The founding tier is
// offered for the first MAT_FOUNDING_LIMIT units sold, after which the regular
// price applies automatically (see foundingSold + createSession). The numeral
// is charged as-is per currency (247 → $247 / €247 / £247), never FX-converted.
const MAT_FOUNDING_CENTS = 24700; // founding: 247
const MAT_REGULAR_CENTS  = 33300; // regular: 333
const MAT_FOUNDING_LIMIT = 100;   // units at the founding price
const MAT_MESSAGE =
  'Thank you for reserving a Ceremony Mat — the first physical offering of ' +
  'Temples of Earth. We will email you shipping details as the founding run ' +
  'is prepared. Your receipt will show our legal name, Temples of Refuge.';

// return_url is allow-listed to our own pages so it can never be an open redirect.
// Both spellings of each page are allowed because the sites sharing this Worker
// don't all agree yet: the .html forms still arrive from pages that haven't been
// swept, and they 301 to the clean form rather than breaking.
// The mat page moved from /ceremony-mats to /mats; both spellings of the old
// path stay listed so a checkout started from a cached copy of the old page
// still returns the buyer to a mat page (Caddy 301s it to /mats) instead of
// silently falling back to /join.
const RETURN_PATHS = new Set([
  '/join', '/join.html',
  '/mats', '/mats.html',
  '/ceremony-mats', '/ceremony-mats.html',
]);

// Where to send the buyer when the client doesn't name a page. These origins
// 301 /join.html -> /join, so defaulting them to the .html form would cost a
// returning donor an extra redirect hop at the moment they come back from
// Stripe. The localhost dev servers serve files straight off disk with no such
// rewrite, so they stay on .html.
//
// agualila.earth was removed from this list on purpose. It is not an oversight
// and it must not be "fixed" for consistency with the server config: that site
// has no checkout page and must never grow one. Soliciting a donation from a
// Portuguese-branded domain into the US charity's Stripe account is the conduit
// appearance Rev. Rul. 63-252 punishes, which costs donors the deduction and
// puts the exemption itself at risk. It is absent from ALLOWED_ORIGINS for the
// same reason, so nothing from that origin reaches this line anyway.
const EXTENSIONLESS_ORIGINS = new Set([
  'https://syncengine.earth',
  'https://www.syncengine.earth',
  'https://templesofrefuge.earth',
  'https://www.templesofrefuge.earth',
  'https://templesof.earth',
  'https://www.templesof.earth',
]);

// Countries the mat ships to: US, UK, EU-27, plus EFTA neighbours.
const SHIP_COUNTRIES = [
  'US', 'GB', 'IE', 'PT', 'ES', 'FR', 'DE', 'NL', 'BE', 'LU', 'IT', 'AT',
  'DK', 'SE', 'FI', 'EE', 'LV', 'LT', 'PL', 'CZ', 'SK', 'SI', 'HR', 'HU',
  'RO', 'BG', 'GR', 'CY', 'MT', 'CH', 'NO',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '')
      .split(',').map((s) => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin) ? origin : '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(okOrigin) });
    }

    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/create-session') {
        return await createSession(request, env, okOrigin);
      }
      if (request.method === 'GET' && url.pathname === '/session-status') {
        return await sessionStatus(url, env, okOrigin);
      }
      if (request.method === 'GET' && url.pathname === '/founding-status') {
        return await foundingStatus(env, okOrigin);
      }
      if (request.method === 'GET' && url.pathname === '/substack-posts') {
        return await substackPosts(env, okOrigin);
      }
      if (request.method === 'POST' && url.pathname === '/inquiry') {
        return await inquiry(request, env, okOrigin);
      }
      return json({ error: 'Not found' }, 404, okOrigin);
    } catch (err) {
      return json({ error: err.message || 'Server error' }, 500, okOrigin);
    }
  },
};

function corsHeaders(origin) {
  const h = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (origin) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

async function stripe(path, env, { method = 'GET', form } = {}) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Stripe error');
  return data;
}

async function createSession(request, env, origin) {
  if (!origin) return json({ error: 'Origin not allowed' }, 403, origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400, origin);
  }

  // The chosen currency — the numeral is charged as-is in it (247 → €247),
  // never converted. Defaults to USD; anything off the allowlist is rejected.
  const currency = String(body.currency || 'usd').toLowerCase();
  if (!ALLOWED_CURRENCIES.has(currency)) {
    return json({ error: 'Unsupported currency.' }, 400, origin);
  }

  // Send the buyer back to the page that launched checkout (allow-listed).
  const returnPath = RETURN_PATHS.has(body.return_path)
    ? body.return_path
    : (EXTENSIONLESS_ORIGINS.has(origin) ? '/join' : '/join.html');
  const returnUrl = `${origin}${returnPath}?session_id={CHECKOUT_SESSION_ID}`;

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  // Embedded Checkout — recent Stripe API versions renamed this ui_mode from
  // 'embedded' to 'embedded_page'; the client still drives it via initEmbeddedCheckout.
  form.set('ui_mode', 'embedded_page');
  form.set('return_url', returnUrl);
  // NOTE: payment_method_types is deliberately NOT set. Sending it (we sent
  // ['card']) pins Checkout to cards and disables Stripe's dynamic payment
  // methods — no Link, no Apple/Google Pay, and none of the European methods
  // our donors actually reach for. Which methods appear is controlled from the
  // Stripe Dashboard, not here. Do not re-add this parameter.
  //
  // CAUTION before enabling a delayed-notification method (SEPA debit, bank
  // transfer, boleto…) in the Dashboard: `checkout.session.completed` fires for
  // those while payment_status is still 'unpaid', and the donation gateway
  // currently mints a founding-gift nonce on that event without checking
  // payment_status — so an unsettled payment would yield a redeemable code.
  // Fix the gateway first (it also needs to handle async_payment_failed).
  // Disable Adaptive Pricing so Stripe never FX-converts the numeral into a
  // local currency — the sacred numeral must stay exact (no $247 → €231).
  form.set('adaptive_pricing[enabled]', 'false');

  // Attach every payment to a Customer. Free, not retroactive, and it gives
  // Stripe-side grouping for anyone reading the Dashboard.
  //
  // invoice_creation was REVERTED: Stripe prices post-payment invoices for
  // one-time Checkout payments separately, per gift, and we are building our own
  // ledger and statement renderer (plans/MEMBERSHIP-SERVICE.md).
  //
  // ⚠ OPEN COMPLIANCE GAP, accepted deliberately. The invoice was the donor's
  // kept record carrying the Rev. Rul. 63-252 control acknowledgment (see
  // COVENANT_MESSAGE, which still shows it on the payment form — but a form read
  // once is not a record kept). Until the membership service issues statements,
  // no kept document carries that language. Closing this gap is the reason the
  // statement renderer exists; do not ship it without the acknowledgment.
  //
  // Note for that service: Stripe does NOT dedupe Customers by email, so a donor
  // who gives three times becomes three Customer objects. Do not treat the
  // Stripe Customer as the donor identity — attribution comes from
  // metadata[account_id] set at session creation, which is exact.
  form.set('customer_creation', 'always');
  form.set('line_items[0][price_data][currency]', currency);

  if (body.order_type === 'ceremony-mat') {
    // ── The Ceremony Mat (physical product) ──
    // Price is SERVER-authoritative — never trusted from the client — and the
    // founding tier closes automatically once MAT_FOUNDING_LIMIT units sell.
    const quantity = clampInt(body.quantity, 1, 10, 1);
    let sold = 0;
    try { sold = await foundingSold(env); } catch { sold = 0; } // fail open to founding
    const founding = sold < MAT_FOUNDING_LIMIT;
    const cents = founding ? MAT_FOUNDING_CENTS : MAT_REGULAR_CENTS;

    const edition =
      body.edition === 'heaven-on-earth' ? 'heaven-on-earth' :
      body.edition === 'cosmic' ? 'cosmic' : 'unspecified';
    const editionLabel =
      edition === 'heaven-on-earth' ? 'Heaven on Earth print' :
      edition === 'cosmic' ? 'Cosmic print' : 'print chosen after order';

    form.set('line_items[0][quantity]', String(quantity));
    form.set('line_items[0][price_data][unit_amount]', String(cents));
    form.set('line_items[0][price_data][product_data][name]',
      'The Ceremony Mat — ' + (founding ? 'Founding Edition' : 'Standard Edition'));
    form.set('line_items[0][price_data][product_data][description]',
      '140 × 210 cm coconut-rubber ceremony mat · ' + editionLabel + ' · shipping included');

    // Physical fulfilment — collect a shipping address and phone number.
    SHIP_COUNTRIES.forEach((c, i) =>
      form.set(`shipping_address_collection[allowed_countries][${i}]`, c));
    form.set('phone_number_collection[enabled]', 'true');
    form.set('custom_text[submit][message]', MAT_MESSAGE);

    // Identify the order for fulfilment and the founding count. The count is
    // taken over PaymentIntents (searchable), so mirror the metadata onto the PI.
    const meta = {
      order_type: 'ceremony-mat',
      edition,
      tier: founding ? 'founding' : 'regular',
      units: String(quantity),
    };
    for (const [k, v] of Object.entries(meta)) {
      form.set(`metadata[${k}]`, v);
      form.set(`payment_intent_data[metadata][${k}]`, v);
    }
  } else {
    // ── Offering / membership (unchanged) ──
    // Amount arrives in minor units (the numeral × 100) so we never do float math.
    const cents = Math.round(Number(body.amount));
    if (!Number.isFinite(cents) || cents < 100 || cents > 1000000) {
      return json({ error: 'Offering must be between 1 and 10,000.' }, 400, origin);
    }
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][unit_amount]', String(cents));
    form.set('line_items[0][price_data][product]', env.PRODUCT_ID);
    form.set('custom_text[submit][message]', COVENANT_MESSAGE);

    // The control acknowledgment used to ride the Stripe invoice here. It was
    // removed with invoice_creation (see the note above) and now lives only on
    // the payment form via COVENANT_MESSAGE, until our own statement carries it.
    // Offerings only — a Ceremony Mat is a purchase, not a contribution, and
    // must never carry contribution language.
  }

  const session = await stripe('/checkout/sessions', env, { method: 'POST', form });
  return json({ client_secret: session.client_secret }, 200, origin);
}

// Clamp a client-supplied integer into [min,max], falling back to dflt.
function clampInt(v, min, max, dflt) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

// How many Ceremony Mat units have sold, summed over succeeded PaymentIntents
// tagged order_type=ceremony-mat. Stripe's search index is eventually consistent
// (a paid order can take up to ~a minute to appear), which is fine for a scarcity
// counter. Paginates in case there are ever more than 100 matching intents.
async function foundingSold(env) {
  let sold = 0;
  let page = null;
  const query = "status:'succeeded' AND metadata['order_type']:'ceremony-mat'";
  do {
    const qs = new URLSearchParams({ query, limit: '100' });
    if (page) qs.set('page', page);
    const res = await stripe(`/payment_intents/search?${qs.toString()}`, env);
    for (const pi of res.data || []) sold += clampInt(pi.metadata?.units, 1, 10, 1);
    page = res.has_more ? res.next_page : null;
  } while (page);
  return sold;
}

// Public read for the pre-order page: how many founding units remain, and the
// two price tiers. Fails open (sold = 0) so a Stripe hiccup shows the deal
// rather than dead-ending the buyer.
async function foundingStatus(env, origin) {
  if (!origin) return json({ error: 'Origin not allowed' }, 403, origin);
  let sold = 0;
  try { sold = await foundingSold(env); } catch { sold = 0; }
  const remaining = Math.max(0, MAT_FOUNDING_LIMIT - sold);
  return json({
    limit: MAT_FOUNDING_LIMIT,
    sold,
    remaining,
    open: remaining > 0,
    founding_price: MAT_FOUNDING_CENTS / 100,
    regular_price: MAT_REGULAR_CENTS / 100,
  }, 200, origin);
}

async function sessionStatus(url, env, origin) {
  if (!origin) return json({ error: 'Origin not allowed' }, 403, origin);

  const id = url.searchParams.get('session_id');
  if (!id) return json({ error: 'Missing session_id' }, 400, origin);

  const session = await stripe(
    `/checkout/sessions/${encodeURIComponent(id)}`,
    env
  );
  // Return the minimum the callers actually render. `session_id` travels in the
  // return URL, so anything emitted here is readable by whoever holds that URL —
  // a forwarded link, a shared screen, a browser history. join.html and mats.html
  // use only customer_name, so the email is not returned: a member's affiliation
  // with a church joined to their address is exactly the pairing worth not
  // handing out. Do not widen this shape without a reason to.
  return json(
    {
      status: session.status, // open | complete | expired
      payment_status: session.payment_status, // paid | unpaid | no_payment_required
      customer_name: session.customer_details?.name || null,
    },
    200,
    origin
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   /inquiry — the site's form intake
   ══════════════════════════════════════════════════════════════════════════

   Replaces Web3Forms. The found-a-temple declaration asks seven free-text
   questions about religious practice and belief; under GDPR that is Article 9
   special-category data, and it was being posted to a US processor with no DPA
   and no Article 46 transfer mechanism. It now goes to our own service and out
   through Migadu (Swiss, EU infrastructure) to ola@.

   FORWARD, DO NOT STORE. Nothing is written to disk here. Forwarding does not
   make the data vanish — it lands in the ola@ mailbox and lives there — but one
   copy in a mailbox we already manage beats a second copy in a database that
   would need encryption at rest, a retention period, and a working erasure
   path. An erasure request is answered by deleting an email.

   NEVER LOG FIELD CONTENT. Not in errors, not in debug lines. The only thing
   this route may say out loud is whether a send succeeded.
   ══════════════════════════════════════════════════════════════════════════ */

// Allowlisted fields, each with a max length. An allowlist rather than
// "forward whatever arrived" so a bot cannot post an arbitrary payload and have
// us mail it onward, and so a new field on a page cannot silently start
// travelling before someone has thought about what it contains.
const INQUIRY_FIELDS = {
  name:             { label: 'Name',                 max: 200 },
  email:            { label: 'Email',                max: 320 },
  holding:          { label: 'Holding today',        max: 100 },
  sacred:           { label: 'What is sacred',       max: 200 },
  temple:           { label: 'Temple name',          max: 200 },
  proposed_address: { label: 'Proposed address',     max: 300 },
  essence:          { label: 'Essence and place',    max: 5000 },
  land:             { label: 'What the land asks',   max: 5000 },
  building:         { label: 'What is being built',  max: 5000 },
  practice:         { label: 'The practice',         max: 5000 },
  held:             { label: 'Who is held here',     max: 5000 },
  not:              { label: 'What this is not',     max: 5000 },
  one_sentence:     { label: 'In one sentence',      max: 1000 },
  member_name:      { label: 'Member name',          max: 200 },
  member_status:    { label: 'Member status',        max: 500 },
  message:          { label: 'Message',              max: 5000 },
};

// Crude per-IP throttle. This route sends mail, so without it the endpoint is
// an open relay for anyone who can spoof an allowed Origin. In-memory is
// adequate: the Node service is a single long-lived process, and a restart
// clearing the table is a rounding error against a 1/hour budget.
const INQUIRY_RATE = { max: 5, windowMs: 60 * 60 * 1000 };
const inquirySeen = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (inquirySeen.get(ip) || []).filter((t) => now - t < INQUIRY_RATE.windowMs);
  // Opportunistic sweep so the map cannot grow without bound.
  if (inquirySeen.size > 5000) {
    for (const [k, v] of inquirySeen) {
      if (!v.some((t) => now - t < INQUIRY_RATE.windowMs)) inquirySeen.delete(k);
    }
  }
  if (hits.length >= INQUIRY_RATE.max) return true;
  hits.push(now);
  inquirySeen.set(ip, hits);
  return false;
}

// Caddy terminates TLS and proxies to us, so the socket address is always
// localhost; the real client is the first hop in X-Forwarded-For.
function clientIp(request) {
  const xff = request.headers.get('X-Forwarded-For') || '';
  return xff.split(',')[0].trim() || 'unknown';
}

async function inquiry(request, env, origin) {
  if (!origin) return json({ error: 'Origin not allowed' }, 403, origin);

  const send = env.SEND_MAIL;
  if (typeof send !== 'function') {
    // Worker path, or SMTP not configured on the box. Say so plainly so the
    // page can fall back to mailto rather than silently swallowing a person's
    // declaration.
    return json({ error: 'Inquiry mail is not configured.' }, 503, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400, origin);
  }

  // Honeypot: bots fill it, humans never see it. Accept silently so the bot
  // learns nothing from the response shape.
  if (body.botcheck) return json({ ok: true }, 200, origin);

  if (rateLimited(clientIp(request))) {
    return json({ error: 'Too many submissions. Please try again later.' }, 429, origin);
  }

  const email = String(body.email || '').trim();
  if (!email || !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email) || email.length > 320) {
    return json({ error: 'A valid email is required.' }, 400, origin);
  }

  const lines = [];
  for (const [key, spec] of Object.entries(INQUIRY_FIELDS)) {
    const raw = body[key];
    if (raw == null || raw === '') continue;
    const value = String(raw).slice(0, spec.max).trim();
    if (value) lines.push(`${spec.label}:\n${value}\n`);
  }
  if (!lines.length) return json({ error: 'Nothing to send.' }, 400, origin);

  const subject = String(body.subject || 'A message via templesof.earth').slice(0, 200);

  try {
    await send({ subject, text: lines.join('\n'), replyTo: email });
  } catch {
    // Deliberately opaque: the underlying error can quote message content or
    // credentials, and neither belongs in a response or a log line.
    return json({ error: 'We could not send that just now.' }, 502, origin);
  }
  return json({ ok: true }, 200, origin);
}

// CORS proxy for the shared Substack feed widget (shared/substack-feed.js).
// The browser can't call Substack directly — its API sends no
// Access-Control-Allow-Origin — so the widget fetches this route instead and
// we fetch Substack server-to-server (no CORS applies) and re-emit the JSON
// with our own origin-gated CORS headers.
const SUBSTACK_API = 'https://aeonmyths.substack.com/api/v1/posts?limit=50';

async function substackPosts(env, origin) {
  if (!origin) return json({ error: 'Origin not allowed' }, 403, origin);

  // A UA header avoids some bot-blocking. cf.cacheTtl caches the upstream JSON
  // at the edge for 30 min so we hammer neither Substack nor cold-fetch every
  // visitor (replaces the widget's sessionStorage cache).
  const res = await fetch(SUBSTACK_API, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'IndrasNetwork-SubstackFeed/1.0 (+https://templesof.earth)',
    },
    cf: { cacheTtl: 1800, cacheEverything: true },
  });
  if (!res.ok) return json({ error: `Substack ${res.status}` }, 502, origin);

  const posts = await res.json();
  return new Response(JSON.stringify(posts), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=1800',
      ...corsHeaders(origin),
    },
  });
}
