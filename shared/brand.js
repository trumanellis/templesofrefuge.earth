/**
 * brand.js — Temples of Earth site chrome.
 *
 * Replaces the old ThemeEngine skin switcher with the single brand
 * identity (see BRAND.md):
 *   1. Resolves dark/light before paint (localStorage "toe-theme",
 *      falling back to prefers-color-scheme, falling back to dark)
 *      and stamps data-theme on <html>.
 *   2. Injects the site chrome: fractal-icon + wordmark lockup, the
 *      whole-site nav, and a dark/light toggle. Below 1100px that is
 *      the fixed 48px top bar with the nav behind a menu button; at
 *      1100px and up brand.css turns the same element into a fixed
 *      left rail with the nav always open.
 *
 * Load with <script src="/shared/brand.js" defer></script> alongside
 * <link rel="stylesheet" href="/shared/brand.css"> — the stylesheet
 * carries all tokens and bar styles.
 */
(function () {
  'use strict';

  var KEY = 'toe-theme';

  function systemTheme() {
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light' : 'dark';
    } catch (e) { return 'dark'; }
  }

  function savedTheme() {
    try {
      var t = localStorage.getItem(KEY);
      return (t === 'light' || t === 'dark') ? t : null;
    } catch (e) { return null; }
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  apply(savedTheme() || systemTheme());

  // Follow the OS while the visitor hasn't chosen explicitly.
  try {
    window.matchMedia('(prefers-color-scheme: light)')
      .addEventListener('change', function () {
        if (!savedTheme()) apply(systemTheme());
      });
  } catch (e) {}

  var SUN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  var MOON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  var MENU =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  var CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* The whole site, in one place. Groups mirror the old footer nav. */
  var NAV = [
    { links: [['/', 'Home']] },
    { label: 'Foundations', links: [
      ['/cosmology', 'Cosmology'],
      ['/covenant', 'Covenant'],
      ['/bylaws', 'Bylaws']
    ] },
    { label: 'Offerings', links: [
      ['/found-a-temple', 'Found a Temple'],
      ['/mats', 'Ceremony Mat']
    ] },
    { label: 'More', links: [
      ['/articles/', 'Writings'],
      ['https://syncengine.earth', 'Synchronicity Engine'],
      ['https://agualila.earth', 'Água Lila']
    ] }
  ];

  var CTA = ['/join', 'Become a Member'];

  /* Which nav entry is the page we're on. Paths are extensionless in
     production but the .html files are also servable directly, and
     /articles/ owns everything beneath it. */
  function isCurrent(href) {
    if (href.indexOf('http') === 0) return false;
    var path = location.pathname.replace(/\/index\.html$/, '/')
                                .replace(/\.html$/, '');
    if (href === '/') return path === '/' || path === '';
    if (href === '/articles/') return path.indexOf('/articles') === 0;
    return path === href || path === href.replace(/\/$/, '');
  }

  function buildNav() {
    var nav = document.createElement('nav');
    nav.className = 'toe-nav';
    nav.id = 'toe-nav';
    nav.setAttribute('aria-label', 'Site');

    NAV.forEach(function (group) {
      var wrap = document.createElement('div');
      wrap.className = 'toe-nav-group';

      if (group.label) {
        var label = document.createElement('span');
        label.className = 'toe-nav-label';
        label.textContent = group.label;
        wrap.appendChild(label);
      }

      group.links.forEach(function (link) {
        var a = document.createElement('a');
        a.className = 'toe-nav-link';
        a.href = link[0];
        a.textContent = link[1];
        if (link[0].indexOf('http') === 0) {
          a.rel = 'noopener';
          var ext = document.createElement('span');
          ext.className = 'toe-ext';
          ext.setAttribute('aria-hidden', 'true');
          ext.textContent = '↗';
          a.appendChild(ext);
        } else if (isCurrent(link[0])) {
          a.setAttribute('aria-current', 'page');
        }
        wrap.appendChild(a);
      });

      nav.appendChild(wrap);
    });

    var cta = document.createElement('a');
    cta.className = 'toe-nav-cta';
    cta.href = CTA[0];
    cta.textContent = CTA[1];
    if (isCurrent(CTA[0])) cta.setAttribute('aria-current', 'page');
    nav.appendChild(cta);

    return nav;
  }

  function buildBar() {
    if (document.querySelector('.toe-bar')) return;

    var bar = document.createElement('header');
    bar.className = 'toe-bar';

    var lockup = document.createElement('a');
    lockup.className = 'toe-lockup';
    lockup.href = '/';
    lockup.setAttribute('aria-label', 'Temples of Earth — home');
    var icon = document.createElement('img');
    icon.src = '/assets/Final-Logo/01-Royal/icon/icon-transparent.svg';
    icon.alt = '';
    var word = document.createElement('span');
    word.textContent = 'Temples of Earth';
    lockup.appendChild(icon);
    lockup.appendChild(word);

    var toggle = document.createElement('button');
    toggle.className = 'toe-theme-toggle';
    toggle.type = 'button';

    function paintToggle() {
      var cur = document.documentElement.getAttribute('data-theme');
      // Show the destination: moon while light, sun while dark.
      toggle.innerHTML = cur === 'light' ? MOON : SUN;
      toggle.setAttribute('aria-label',
        cur === 'light' ? 'Switch to dark (dusk)' : 'Switch to light (dawn)');
    }
    paintToggle();

    toggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light'
        ? 'dark' : 'light';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      paintToggle();
      document.dispatchEvent(
        new CustomEvent('themechange', { detail: { theme: next } }));
    });

    var nav = buildNav();

    var menu = document.createElement('button');
    menu.className = 'toe-menu-toggle';
    menu.type = 'button';
    menu.innerHTML = MENU;
    menu.setAttribute('aria-label', 'Open site menu');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-controls', 'toe-nav');

    var scrim = document.createElement('div');
    scrim.className = 'toe-scrim';

    function setOpen(open) {
      bar.setAttribute('data-open', open ? 'true' : 'false');
      scrim.setAttribute('data-open', open ? 'true' : 'false');
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-label', open ? 'Close site menu' : 'Open site menu');
      menu.innerHTML = open ? CLOSE : MENU;
    }
    setOpen(false);

    menu.addEventListener('click', function () {
      setOpen(bar.getAttribute('data-open') !== 'true');
    });
    scrim.addEventListener('click', function () { setOpen(false); });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bar.getAttribute('data-open') === 'true') {
        setOpen(false);
        menu.focus();
      }
    });
    // Crossing into rail territory leaves no menu button to close with.
    try {
      window.matchMedia('(min-width: 1100px)')
        .addEventListener('change', function () { setOpen(false); });
    } catch (e) {}

    var actions = document.createElement('div');
    actions.className = 'toe-bar-actions';
    actions.appendChild(toggle);
    actions.appendChild(menu);

    bar.appendChild(lockup);
    bar.appendChild(nav);
    bar.appendChild(actions);
    document.body.appendChild(bar);
    document.body.appendChild(scrim);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildBar);
  } else {
    buildBar();
  }
})();
