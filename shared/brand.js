/**
 * brand.js — Temples of Earth site chrome.
 *
 * Replaces the old ThemeEngine skin switcher with the single brand
 * identity (see BRAND.md):
 *   1. Resolves dark/light before paint (localStorage "toe-theme",
 *      falling back to prefers-color-scheme, falling back to dark)
 *      and stamps data-theme on <html>.
 *   2. Injects the fixed 48px brand bar: fractal-icon + wordmark
 *      lockup on the left, a dark/light toggle on the right.
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

    bar.appendChild(lockup);
    bar.appendChild(toggle);
    document.body.appendChild(bar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildBar);
  } else {
    buildBar();
  }
})();
