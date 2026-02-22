/**
 * Theme Engine v2.0
 * Shared skin switching for IndrasNetwork sites
 * templesofrefuge.earth / syncengine.earth
 *
 * Skins (data-skin) — complete visual identities from UNIFIED_DESIGN_SYSTEM
 * Technical · Organic · Botanical · Jewels
 *
 * Each skin sets both --s-* and --t-* tokens so sites using
 * either namespace work seamlessly.
 */
(function () {
  'use strict';

  /* ================================================================
     GOOGLE FONTS — all skin fonts
     ================================================================ */
  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,400&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600&family=Playfair+Display:wght@700;900&family=Raleway:ital,wght@0,200;0,300;0,400;0,500;0,600;1,300;1,400&display=swap';

  function injectFonts() {
    if (document.getElementById('te-fonts')) return;
    var pc1 = document.createElement('link');
    pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    var pc2 = document.createElement('link');
    pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = '';
    var link = document.createElement('link');
    link.id = 'te-fonts'; link.rel = 'stylesheet'; link.href = FONT_URL;
    var h = document.head || document.documentElement;
    h.appendChild(pc1); h.appendChild(pc2); h.appendChild(link);
  }

  /* ================================================================
     SKIN CSS — 4 skins from UNIFIED_DESIGN_SYSTEM
     Each sets --s-* (skin tokens) AND --t-* (theme tokens mapped)
     ================================================================ */
  var SKIN_CSS = '\
[data-skin="technical"]{\
  --s-bg:#0d0d0d;--s-bg2:#141414;--s-card:#1a1a1a;--s-hover:#222;\
  --s-tx:#eee;--s-t2:#999;--s-mt:#666;--s-gh:#444;\
  --s-bd:#2a2a2a;--s-b2:#1f1f1f;\
  --s-ac:#00d4aa;\
  --s-font:"DM Sans",-apple-system,sans-serif;\
  --s-display:"Playfair Display",Georgia,serif;\
  --s-radius:12px;\
  --t-bg:#0d0d0d;--t-sf:#141414;--t-cd:#1a1a1a;--t-hv:#222;\
  --t-tx:#eee;--t-t2:#999;--t-mt:#666;--t-dm:#444;\
  --t-bd:#2a2a2a;--t-b2:#1f1f1f;--t-bc:rgba(255,255,255,0.1);\
  --t-ac:#00d4aa;--t-a2:#00b894;\
  --t-ok:#22c55e;--t-wn:#ffd93d;--t-er:#ff6b6b;\
  --t-glass:rgba(13,13,13,0.85);--t-glass-bd:rgba(255,255,255,0.1);\
}\
[data-skin="organic"]{\
  --s-bg:#1a1814;--s-bg2:#2c2820;--s-card:#2c2820;--s-hover:#3d3628;\
  --s-tx:#f4efe6;--s-t2:#8faa7e;--s-mt:#6b5744;--s-gh:#3d3628;\
  --s-bd:#3d3628;--s-b2:#2c2820;\
  --s-ac:#4a7c59;\
  --s-font:"Instrument Sans",-apple-system,sans-serif;\
  --s-display:"Fraunces",Georgia,serif;\
  --s-radius:16px;\
  --t-bg:#1a1814;--t-sf:#2c2820;--t-cd:#2c2820;--t-hv:#3d3628;\
  --t-tx:#f4efe6;--t-t2:#8faa7e;--t-mt:#6b5744;--t-dm:#3d3628;\
  --t-bd:#3d3628;--t-b2:#2c2820;--t-bc:rgba(75,124,89,0.15);\
  --t-ac:#4a7c59;--t-a2:#6b9e6b;\
  --t-ok:#4a7c59;--t-wn:#d4a037;--t-er:#c75050;\
  --t-glass:rgba(26,24,20,0.9);--t-glass-bd:rgba(75,124,89,0.15);\
}\
[data-skin="botanical"]{\
  --s-bg:#faf6ef;--s-bg2:#f5ede0;--s-card:#ffffff;--s-hover:#ede4d3;\
  --s-tx:#2c2416;--s-t2:#7a6e5d;--s-mt:#a69e8e;--s-gh:#c8c0b2;\
  --s-bd:#e2d7c4;--s-b2:#ede4d3;\
  --s-ac:#4a7a4e;\
  --s-font:"Outfit",-apple-system,sans-serif;\
  --s-display:"Cormorant Garamond",Georgia,serif;\
  --s-radius:16px;\
  --t-bg:#faf6ef;--t-sf:#f5ede0;--t-cd:#ffffff;--t-hv:#ede4d3;\
  --t-tx:#2c2416;--t-t2:#7a6e5d;--t-mt:#a69e8e;--t-dm:#c8c0b2;\
  --t-bd:#e2d7c4;--t-b2:#ede4d3;--t-bc:rgba(0,0,0,0.08);\
  --t-ac:#4a7a4e;--t-a2:#87a07a;\
  --t-ok:#4a7a4e;--t-wn:#c5952e;--t-er:#b35a5a;\
  --t-glass:rgba(250,246,239,0.9);--t-glass-bd:rgba(0,0,0,0.08);\
}\
[data-skin="jewels"]{\
  --s-bg:#06060e;--s-bg2:#0b0b18;--s-card:#0b0b18;--s-hover:#18183a;\
  --s-tx:rgba(255,255,255,0.9);--s-t2:#6a6580;--s-mt:#3d3855;--s-gh:#2a2644;\
  --s-bd:rgba(180,170,220,0.12);--s-b2:rgba(180,170,220,0.06);\
  --s-ac:#6bcfff;\
  --s-font:"Raleway",sans-serif;\
  --s-display:"Cinzel",serif;\
  --s-radius:14px;\
  --t-bg:#06060e;--t-sf:#0b0b18;--t-cd:#0b0b18;--t-hv:#18183a;\
  --t-tx:rgba(255,255,255,0.9);--t-t2:#6a6580;--t-mt:#3d3855;--t-dm:#2a2644;\
  --t-bd:rgba(180,170,220,0.12);--t-b2:rgba(180,170,220,0.06);--t-bc:rgba(180,170,220,0.12);\
  --t-ac:#6bcfff;--t-a2:#b19cd9;\
  --t-ok:#98d8aa;--t-wn:#ffd93d;--t-er:#ff6b9d;\
  --t-glass:rgba(6,6,14,0.9);--t-glass-bd:rgba(180,170,220,0.12);\
}';

  /* ================================================================
     SHARED CONSTANTS
     ================================================================ */
  var SHARED_CSS = '\
:root{\
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;\
  --space-5:24px;--space-6:32px;--space-8:48px;\
  --font-mono:"JetBrains Mono","SF Mono",Consolas,monospace;\
  --radius-sm:4px;--radius-md:8px;--radius-lg:12px;\
  --radius-xl:16px;--radius-pill:100px;\
  --transition-fast:100ms ease;--transition-base:150ms ease;--transition-slow:200ms ease;\
  --shadow-sm:0 1px 2px rgba(0,0,0,0.1);\
  --shadow-md:0 4px 12px rgba(0,0,0,0.15);\
  --shadow-lg:0 4px 24px rgba(0,0,0,0.3);\
  --shadow-glow:0 0 12px rgba(0,212,170,0.3);\
  --color-love:#ff6b9d;--color-joy:#ffd93d;--color-peace:#6bcfff;\
  --color-grace:#b19cd9;--color-hope:#98d8aa;--color-faith:#ffb347;\
}';

  /* ================================================================
     CONTROL BAR CSS — pill buttons across top
     ================================================================ */
  var TOGGLE_CSS = '\
.te-bar{\
  position:fixed;top:0;left:0;right:0;z-index:1000;\
  display:flex;align-items:center;justify-content:center;\
  padding:0 24px;height:48px;\
  background:var(--s-bg);border-bottom:1px solid var(--s-bd);\
  transition:all .5s ease;\
}\
[data-skin="technical"] .te-bar{background:rgba(13,13,13,0.9);backdrop-filter:blur(20px) saturate(180%)}\
[data-skin="jewels"] .te-bar{background:rgba(6,6,14,0.85);backdrop-filter:blur(20px) saturate(180%)}\
.te-section{display:flex;align-items:center;gap:16px}\
.te-label{\
  font-family:var(--font-mono);font-size:9px;letter-spacing:0.2em;\
  text-transform:uppercase;color:var(--s-mt);flex-shrink:0;\
}\
.te-pills{display:flex;gap:6px}\
.te-pill{\
  padding:3px 12px;\
  font-family:var(--font-mono);font-size:10px;letter-spacing:0.03em;\
  border:1px solid var(--s-bd);border-radius:var(--radius-pill);\
  background:transparent;color:var(--s-t2);\
  cursor:pointer;transition:all .2s;white-space:nowrap;\
}\
.te-pill:hover{border-color:var(--s-ac);color:var(--s-ac)}\
.te-pill.active{background:var(--s-ac);color:var(--s-bg);border-color:var(--s-ac)}\
[data-skin="botanical"] .te-pill.active{color:#fff}\
@media(max-width:640px){\
  .te-bar{padding:0 12px}\
  .te-pill{font-size:9px;padding:3px 8px}\
}';

  /* ================================================================
     INJECT STYLES INTO <head>
     ================================================================ */
  function injectStyle(id, css) {
    if (document.getElementById(id)) return;
    var s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  injectFonts();
  injectStyle('te-shared', SHARED_CSS);
  injectStyle('te-skins', SKIN_CSS);
  injectStyle('te-toggle-css', TOGGLE_CSS);

  /* ================================================================
     INTERNALS
     ================================================================ */
  var VALID_SKINS = ['technical', 'organic', 'botanical', 'jewels'];

  var DEFAULT_LABELS = {
    'technical': 'Technical',
    'organic':   'Organic',
    'botanical': 'Botanical',
    'jewels':    'Jewels'
  };

  var activePills = [];

  function setSkin(s) {
    document.documentElement.setAttribute('data-skin', s);
    activePills.forEach(function (obj) {
      obj.pills.forEach(function (p) {
        if (p.getAttribute('data-skin') === s) p.classList.add('active');
        else p.classList.remove('active');
      });
    });
  }

  /* ================================================================
     PUBLIC API
     ================================================================ */
  window.ThemeEngine = {

    /**
     * Initialize the theme engine.
     * @param {Object} cfg
     * @param {string}   cfg.defaultSkin   - fallback skin (default: 'technical')
     * @param {string}   cfg.storageKey    - localStorage key (default: 'skin')
     * @param {string[]} cfg.skins         - ordered list of available skins
     * @param {Object}   cfg.labels        - display names keyed by skin id
     */
    init: function (cfg) {
      cfg = cfg || {};
      var defaultSkin  = cfg.defaultSkin || 'technical';
      var storageKey   = cfg.storageKey || 'skin';
      var skins        = cfg.skins || VALID_SKINS;
      var labels       = cfg.labels || DEFAULT_LABELS;

      // Resolve skin: saved → default
      var saved = null;
      try { saved = localStorage.getItem(storageKey); } catch (e) {}
      var current = (saved && skins.indexOf(saved) !== -1) ? saved : defaultSkin;
      setSkin(current);

      // Build control bar
      var bar = document.createElement('header');
      bar.className = 'te-bar';

      var section = document.createElement('div');
      section.className = 'te-section';

      var label = document.createElement('span');
      label.className = 'te-label';
      label.textContent = 'Skin';

      var pillsWrap = document.createElement('div');
      pillsWrap.className = 'te-pills';

      var pillEls = [];
      skins.forEach(function (s) {
        var btn = document.createElement('button');
        btn.className = 'te-pill' + (s === current ? ' active' : '');
        btn.setAttribute('data-skin', s);
        btn.textContent = labels[s] || s;
        btn.addEventListener('click', function () {
          setSkin(s);
          try { localStorage.setItem(storageKey, s); } catch (e) {}
          document.dispatchEvent(new CustomEvent('skinchange', { detail: { skin: s } }));
        });
        pillsWrap.appendChild(btn);
        pillEls.push(btn);
      });

      activePills.push({ pills: pillEls });

      section.appendChild(label);
      section.appendChild(pillsWrap);
      bar.appendChild(section);
      document.body.appendChild(bar);

      // Fire initial event
      document.dispatchEvent(new CustomEvent('skinchange', { detail: { skin: current } }));
    },

    /** Programmatically switch skin */
    setSkin: function (s) {
      setSkin(s);
      document.dispatchEvent(new CustomEvent('skinchange', { detail: { skin: s } }));
    },

    /** Get current skin name */
    getSkin: function () {
      return document.documentElement.getAttribute('data-skin');
    }
  };
})();
