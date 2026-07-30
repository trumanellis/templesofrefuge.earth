// Temples of Refuge — checkout backend (Cloudflare Worker).
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

const COVENANT_MESSAGE =
  'By making this offering you sign the Covenant and affirm the One Commandment — ' +
  'to recognize the divine in every Other and treat them as an extension of yourself. ' +
  'Membership is for life.';

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
  'Temples of Refuge. We will email you shipping details as the founding run ' +
  'is prepared.';

// return_url is allow-listed to our own pages so it can never be an open redirect.
// Both spellings of the join page are allowed because the sites that share this
// Worker don't agree: syncengine.earth serves extensionless URLs, the others
// still serve .html.
const RETURN_PATHS = new Set(['/join', '/join.html', '/ceremony-mats.html']);

// Where to send the buyer when the client doesn't name a page. syncengine.earth
// 301s /join.html -> /join, so defaulting it to the .html form would cost a
// returning donor an extra redirect hop at the moment they come back from
// Stripe. Every other origin — templesofrefuge.earth, agualila.earth, and the
// localhost dev servers that serve files straight off disk — still wants .html.
const EXTENSIONLESS_ORIGINS = new Set([
  'https://syncengine.earth',
  'https://www.syncengine.earth',
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
  form.set('payment_method_types[0]', 'card');
  // Disable Adaptive Pricing so Stripe never FX-converts the numeral into a
  // local currency — the sacred numeral must stay exact (no $247 → €231).
  form.set('adaptive_pricing[enabled]', 'false');
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
  return json(
    {
      status: session.status, // open | complete | expired
      payment_status: session.payment_status, // paid | unpaid | no_payment_required
      customer_email: session.customer_details?.email || null,
      customer_name: session.customer_details?.name || null,
    },
    200,
    origin
  );
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
      'User-Agent': 'IndrasNetwork-SubstackFeed/1.0 (+https://templesofrefuge.earth)',
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
