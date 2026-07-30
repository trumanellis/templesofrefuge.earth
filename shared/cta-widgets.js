/**
 * cta-widgets.js — the shared call-to-action layer for Temples of Refuge.
 *
 * This is a sibling to theme-engine.js. It owns the *repeating* CTA chrome so
 * it lives in one place instead of being hand-copied into every page:
 *
 *   • CTAWidgets.memberCTA(target)        — a "Become a Member" invitation card
 *   • CTAWidgets.footerNewsletter(target) — a jewel-framed Substack subscribe card
 *   • CTAWidgets.wireForm(form, opts)      — Web3Forms AJAX submit + mailto fallback
 *                                            (used by join.html & found-a-temple.html)
 *
 * Styling reuses the jewels-skin tokens injected by theme-engine.js (--t-* /
 * --s-*), so anything rendered here matches the rest of the site automatically.
 * The injectStyle() helper mirrors theme-engine.js — idempotent, head-injected.
 *
 * Usage:
 *   <div id="newsletter-mount"></div>
 *   <script src="/shared/cta-widgets.js"></script>
 *   <script>CTAWidgets.footerNewsletter('#newsletter-mount');</script>
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONFIGURATION — the site owner must paste real values here once.
 * Until then the forms degrade gracefully to a mailto: link so no CTA is ever
 * a dead button. Everything in CTAConfig is *public by design* (it ships in
 * client JS); none of it is secret.
 * ─────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // Local preview (localhost) uses Stripe TEST mode + the local checkout server;
  // the live site uses LIVE mode + the self-hosted checkout endpoint. Both keys
  // below are PUBLISHABLE (public by design); the secret key lives only on the box.
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname);

  var CTAConfig = {
    // web3forms.com → enter hello@templesofrefuge.earth → key is emailed to you.
    // One key serves every form on the site. Public; only lets people email YOU.
    WEB3FORMS_ACCESS_KEY: 'REPLACE_ME_WEB3FORMS_KEY',

    // Stripe Dashboard → Payment Links → "Customers choose what to pay".
    // Used as the graceful fallback (hosted page) until the inline checkout
    // backend below is deployed. No API keys here.
    STRIPE_PAYMENT_LINK_URL: 'https://donate.stripe.com/aFacN5ago2mI71SeAM2Nq00',

    // ── Inline embedded checkout (preferred when both are set) ──
    // Stripe PUBLISHABLE key (pk_live_… / pk_test_…) — public by design, safe here.
    // Dashboard → Developers → API keys → Publishable key.
    STRIPE_PUBLISHABLE_KEY: isLocal
      ? 'pk_test_51TqoTrGvkk6jsZYuVSiVkOQcWKt4tVtIjFSwGRwy4YtJEuKnG8PrbzLXaX12YNI0tp6RjoU1b5l8RAidlIlZr8XZ00Y0RUWKt0'
      : 'pk_live_51TqoTrGvkk6jsZYugRfw4uJI6WfUNALFXWtCxDg2HF55ilUc4knUVDcz2hGFoJkIs7XgI8MtuPGnnnlN51y27XVv00Wvkk4pq7',

    // Checkout backend base URL (no trailing slash). LOCAL: the Node dev server ·
    // LIVE: the self-hosted service on the Hetzner box behind Caddy.
    CHECKOUT_API_URL: isLocal
      ? 'http://localhost:8787'
      : 'https://checkout.templesofrefuge.earth',

    // Donation gateway base URL — /claim turns a paid Stripe session into the
    // one-time founding-gift code the SyncEngine app redeems at first launch.
    // Shown on the post-donation screen (same as syncengine.earth/join).
    GATEWAY_API_URL: isLocal
      ? 'http://localhost:8788'
      : 'https://api.templesofrefuge.earth',

    // Optional / future: opencollective.com collective URL. When set, the join
    // page can prefer this transparency-aligned option over Stripe.
    OPENCOLLECTIVE_URL: 'REPLACE_ME_OPENCOLLECTIVE_URL',

    // Inbox that receives form submissions + the mailto fallback target.
    CONTACT_EMAIL: 'hello@templesofrefuge.earth',

    // Substack publication — already live, no secret needed.
    SUBSTACK_URL: 'https://aeonmyths.substack.com',
    SUBSTACK_EMBED_URL: 'https://aeonmyths.substack.com/embed'
  };

  var REPLACE_RE = /^REPLACE_ME/;
  function isConfigured(value) {
    return typeof value === 'string' && value.length > 0 && !REPLACE_RE.test(value);
  }

  /* ================================================================
     STYLES  (idempotent, head-injected — mirrors theme-engine.js)
     ================================================================ */
  function injectStyle(id, css) {
    if (document.getElementById(id)) return;
    var s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  var CTA_CSS = '\
  /* ---- Shared form controls ---- */\
  .cta-form{display:flex;flex-direction:column;gap:1.5rem;text-align:left;\
    max-width:560px;margin:0 auto}\
  .cta-field{display:flex;flex-direction:column;gap:.55rem}\
  .cta-field label{font-family:var(--s-display);font-size:.72rem;letter-spacing:.18em;\
    text-transform:uppercase;color:var(--t-ac)}\
  .cta-field .req{color:var(--t-a2)}\
  .cta-field input,.cta-field textarea,.cta-field select{\
    font-family:var(--s-font);font-size:1rem;font-weight:300;line-height:1.6;\
    color:var(--t-tx);background:var(--t-cd);\
    border:1px solid var(--t-bd);border-radius:10px;\
    padding:.85rem 1rem;width:100%;transition:border-color .25s,box-shadow .25s}\
  .cta-field textarea{resize:vertical;min-height:7rem}\
  .cta-field input::placeholder,.cta-field textarea::placeholder{color:var(--t-mt)}\
  .cta-field input:focus,.cta-field textarea:focus,.cta-field select:focus{\
    outline:none;border-color:var(--t-ac);\
    box-shadow:0 0 0 3px color-mix(in srgb, var(--t-ac) 16%, transparent)}\
  /* checkbox affirmation row */\
  .cta-check{display:flex;align-items:flex-start;gap:.85rem;\
    background:var(--t-b2);border:1px solid var(--t-bd);border-radius:12px;\
    padding:1.1rem 1.2rem}\
  .cta-check input{margin-top:.25rem;width:1.1rem;height:1.1rem;flex:0 0 auto;\
    accent-color:var(--t-ac);cursor:pointer}\
  .cta-check label{font-family:var(--s-font);font-size:.95rem;line-height:1.65;\
    color:var(--t-t2);text-transform:none;letter-spacing:normal;cursor:pointer}\
  .cta-check label strong{color:var(--t-tx);font-weight:500}\
  /* honeypot — hidden from humans */\
  .cta-hp{position:absolute!important;left:-9999px!important;\
    width:1px;height:1px;opacity:0;overflow:hidden}\
  /* submit button (mirrors .back-link / .temple-link styling) */\
  .cta-submit{font-family:var(--s-display);font-size:.8rem;letter-spacing:.2em;\
    text-transform:uppercase;color:var(--t-bg);background:var(--t-ac);\
    border:1px solid var(--t-ac);border-radius:10px;\
    padding:1rem 1.5rem;cursor:pointer;transition:opacity .25s,transform .15s;\
    align-self:flex-start}\
  .cta-submit:hover{opacity:.85}\
  .cta-submit:active{transform:translateY(1px)}\
  .cta-submit[disabled]{opacity:.45;cursor:progress}\
  .cta-form-error{color:var(--t-er);font-size:.9rem;line-height:1.6}\
  .cta-form-error a{color:var(--t-ac)}\
  /* success panel shown after submit */\
  .cta-form-success{max-width:560px;margin:0 auto;text-align:center;\
    border:1px solid var(--t-bd);border-radius:16px;background:var(--t-cd);\
    padding:2.5rem 2rem}\
  .cta-form-success .ok-mark{color:var(--t-ok);font-size:2.25rem;line-height:1}\
  .cta-form-success h3{font-family:var(--s-display);font-weight:400;\
    color:var(--t-ok);font-size:1.4rem;letter-spacing:.04em;margin:1rem 0 .75rem}\
  .cta-form-success p{color:var(--t-t2);line-height:1.75}\
  \
  /* ---- Become-a-Member card ---- */\
  .cta-member{display:block;text-decoration:none;max-width:560px;margin:0 auto;\
    border:1px solid var(--t-bd);border-radius:16px;background:var(--t-cd);\
    padding:2.25rem 2rem;transition:border-color .3s,transform .3s,box-shadow .3s}\
  .cta-member:hover{border-color:var(--t-ac);transform:translateY(-3px);\
    box-shadow:0 18px 50px -28px color-mix(in srgb, var(--t-ac) 50%, transparent)}\
  .cta-member-eyebrow{display:block;font-family:var(--s-font);font-size:.7rem;\
    font-weight:500;letter-spacing:.4em;text-transform:uppercase;color:var(--t-ac);\
    margin-bottom:1rem}\
  .cta-member-title{display:block;font-family:var(--s-display);font-weight:400;\
    font-size:clamp(1.5rem,3.5vw,2rem);letter-spacing:.05em;color:var(--t-tx);\
    margin-bottom:.85rem}\
  .cta-member-text{display:block;color:var(--t-t2);line-height:1.7;margin-bottom:1.25rem}\
  .cta-member-action{display:inline-flex;align-items:center;gap:.5rem;\
    font-family:var(--s-display);font-size:.8rem;letter-spacing:.18em;\
    text-transform:uppercase;color:var(--t-ac)}\
  \
  /* ---- Newsletter card ---- */\
  .cta-newsletter{max-width:560px;margin:0 auto;text-align:center;\
    border:1px solid var(--t-bd);border-radius:16px;background:var(--t-cd);\
    padding:2.5rem 2rem}\
  .cta-newsletter-eyebrow{font-family:var(--s-font);font-size:.7rem;font-weight:500;\
    letter-spacing:.4em;text-transform:uppercase;color:var(--t-ac);margin-bottom:1rem}\
  .cta-newsletter-title{font-family:var(--s-display);font-weight:400;\
    font-size:clamp(1.35rem,3vw,1.8rem);letter-spacing:.05em;color:var(--t-tx);\
    margin-bottom:.75rem}\
  .cta-newsletter-text{color:var(--t-t2);line-height:1.7;max-width:42ch;\
    margin:0 auto 1.75rem}\
  .cta-newsletter-embed{display:flex;justify-content:center}\
  .cta-newsletter-embed iframe{width:100%;max-width:480px;border:1px solid var(--t-bd);\
    border-radius:12px;background:transparent;color-scheme:light}\
  .cta-newsletter-link{display:inline-block;margin-top:1.25rem;\
    font-family:var(--s-display);font-size:.75rem;letter-spacing:.18em;\
    text-transform:uppercase;color:var(--t-ac);text-decoration:none;transition:opacity .3s}\
  .cta-newsletter-link:hover{opacity:.7}\
  @media(max-width:768px){\
    .cta-member,.cta-newsletter,.cta-form-success{padding:1.75rem 1.35rem}\
  }';

  injectStyle('cta-widgets-css', CTA_CSS);

  /* ================================================================
     HELPERS
     ================================================================ */
  function resolve(target) {
    if (!target) return null;
    return typeof target === 'string' ? document.querySelector(target) : target;
  }

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (html != null) node.innerHTML = html;
    return node;
  }

  function buildMailto(subject, body) {
    return 'mailto:' + CTAConfig.CONTACT_EMAIL +
      '?subject=' + encodeURIComponent(subject || 'Hello, Temples of Refuge') +
      '&body=' + encodeURIComponent(body || '');
  }

  /* ================================================================
     PUBLIC API
     ================================================================ */
  window.CTAConfig = CTAConfig;
  window.CTAWidgets = {

    config: CTAConfig,
    isConfigured: isConfigured,

    /** Inject a "Become a Member" invitation card into `target`. */
    memberCTA: function (target, opts) {
      var mount = resolve(target);
      if (!mount) return null;
      opts = opts || {};
      var card = el('a', { 'class': 'cta-member', href: opts.href || '/join' },
        '<span class="cta-member-eyebrow">' + (opts.eyebrow || 'Membership') + '</span>' +
        '<span class="cta-member-title">' + (opts.title || 'Become a Member') + '</span>' +
        '<span class="cta-member-text">' + (opts.text ||
          'Affirm the One Commandment, sign the Covenant, and join the network as a Member.') + '</span>' +
        '<span class="cta-member-action">' + (opts.action || 'Begin') +
        ' <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>');
      mount.appendChild(card);
      return card;
    },

    /** Inject a jewel-framed Substack subscribe card into `target`. */
    footerNewsletter: function (target, opts) {
      var mount = resolve(target);
      if (!mount) return null;
      opts = opts || {};
      var card = el('div', { 'class': 'cta-newsletter' },
        '<p class="cta-newsletter-eyebrow">' + (opts.eyebrow || 'From the Temple') + '</p>' +
        '<h3 class="cta-newsletter-title">' + (opts.title || 'Myths for a New Æon') + '</h3>' +
        '<p class="cta-newsletter-text">' + (opts.text ||
          'Essays, reflections, and transmissions from the edge of the possible — delivered as they are written.') + '</p>' +
        '<div class="cta-newsletter-embed">' +
          '<iframe src="' + CTAConfig.SUBSTACK_EMBED_URL +
          '" height="150" frameborder="0" scrolling="no" loading="lazy" ' +
          'title="Subscribe to Myths for a New Æon"></iframe>' +
        '</div>' +
        '<a class="cta-newsletter-link" href="' + CTAConfig.SUBSTACK_URL +
        '" target="_blank" rel="noopener">Read on Substack →</a>');
      mount.appendChild(card);
      return card;
    },

    /**
     * Wire a Web3Forms-backed form for AJAX submit with graceful fallback.
     *
     * Expected markup (see join.html / found-a-temple.html):
     *   <form class="cta-form" data-cta-subject="...">
     *     ...named fields...
     *     <input type="checkbox" name="botcheck" class="cta-hp" tabindex="-1" autocomplete="off">
     *     <p class="cta-form-error" hidden></p>
     *     <button type="submit" class="cta-submit">Send</button>
     *   </form>
     *   <div class="cta-form-success" hidden>...</div>  (sibling, optional)
     *
     * @param {HTMLFormElement|string} formRef
     * @param {Object} [opts]
     * @param {Function} [opts.onSuccess]  called after a successful submit
     * @param {string}   [opts.successSelector]  element to reveal on success
     */
    wireForm: function (formRef, opts) {
      var form = resolve(formRef);
      if (!form || form.dataset.ctaWired) return;
      form.dataset.ctaWired = '1';
      opts = opts || {};

      var subject = form.getAttribute('data-cta-subject') || 'Message via templesofrefuge.earth';
      var errEl = form.querySelector('.cta-form-error');
      var btn = form.querySelector('[type="submit"]');
      var successEl = opts.successSelector
        ? resolve(opts.successSelector)
        : (form.nextElementSibling && form.nextElementSibling.classList.contains('cta-form-success')
            ? form.nextElementSibling : null);

      function setError(html) {
        if (!errEl) return;
        errEl.innerHTML = html || '';
        errEl.hidden = !html;
      }

      // Compose a readable mailto body from the form's visible fields.
      function fallbackBody() {
        var lines = [];
        form.querySelectorAll('input, textarea, select').forEach(function (f) {
          if (!f.name || f.name === 'botcheck' || f.name === 'access_key' ||
              f.type === 'hidden' || f.type === 'submit') return;
          var v = (f.type === 'checkbox') ? (f.checked ? 'Yes' : 'No') : f.value;
          if (v) lines.push(f.name + ': ' + v);
        });
        return lines.join('\n');
      }

      function offerMailto(reason) {
        var link = buildMailto(subject, fallbackBody());
        setError((reason ? reason + ' ' : '') +
          'You can <a href="' + link + '">email us directly</a> instead.');
      }

      function succeed() {
        if (successEl) {
          form.hidden = true;
          successEl.hidden = false;
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (typeof opts.onSuccess === 'function') opts.onSuccess();
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        setError('');

        // Honeypot: a filled botcheck means a bot — silently send nothing.
        // NB: a checkbox's .value is "on" even when unchecked, so only its
        // .checked state is meaningful; text honeypots use .value.
        var hp = form.querySelector('[name="botcheck"]');
        if (hp && (hp.type === 'checkbox' ? hp.checked : !!hp.value)) return;

        // No real key yet → don't pretend; route to email.
        if (!isConfigured(CTAConfig.WEB3FORMS_ACCESS_KEY)) {
          offerMailto('Our form is being connected.');
          return;
        }

        var data = new FormData(form);
        data.set('access_key', CTAConfig.WEB3FORMS_ACCESS_KEY);
        data.set('subject', subject);
        data.set('from_name', 'Temples of Refuge website');

        var payload = {};
        data.forEach(function (v, k) { payload[k] = v; });

        if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending…'; }

        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res && res.success) { succeed(); }
            else { offerMailto('Something went wrong sending that.'); }
          })
          .catch(function () { offerMailto('We could not reach the form service.'); })
          .then(function () {
            if (btn) { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; }
          });
      });
    }
  };
})();
