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
//   POST /create-session   { amount }        -> { client_secret }
//   GET  /session-status  ?session_id=...     -> { status, customer_email, ... }

const STRIPE_API = 'https://api.stripe.com/v1';

const COVENANT_MESSAGE =
  'By making this offering you sign the Covenant and affirm the One Commandment — ' +
  'to recognize the divine in every Other and treat them as an extension of yourself. ' +
  'Membership is for life.';

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

  // Amount arrives in cents so we never do float math on money.
  const cents = Math.round(Number(body.amount));
  if (!Number.isFinite(cents) || cents < 100 || cents > 1000000) {
    return json({ error: 'Offering must be between $1 and $10,000.' }, 400, origin);
  }

  // Send the donor back to the same origin that launched checkout.
  const returnUrl = `${origin}/join.html?session_id={CHECKOUT_SESSION_ID}`;

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('ui_mode', 'embedded');
  form.set('return_url', returnUrl);
  form.set('payment_method_types[0]', 'card');
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][product]', env.PRODUCT_ID);
  form.set('line_items[0][price_data][unit_amount]', String(cents));
  form.set('custom_text[submit][message]', COVENANT_MESSAGE);

  const session = await stripe('/checkout/sessions', env, { method: 'POST', form });
  return json({ client_secret: session.client_secret }, 200, origin);
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
