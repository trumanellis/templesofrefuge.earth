/**
 * document-loader.js — fetch a markdown file from the templesofrefuge.earth
 * repo and render it into #document-body, sharing the look-and-feel defined
 * by /shared/document.css.
 *
 * Why fetch from raw.githubusercontent.com instead of a relative URL?
 * GitHub Pages may run Jekyll on .md files and convert them to HTML, which
 * would break a relative fetch. The raw.githubusercontent.com URL serves
 * the file verbatim. This matches the pattern used by /articles/read.html.
 * A relative path is tried first as a fallback for non-GitHub deployments.
 *
 * Usage:
 *   <script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>
 *   <script src="/shared/document-loader.js"></script>
 *   <script>
 *     DocumentLoader.load({ path: 'COVENANT.md' });
 *   </script>
 *
 * The first markdown <h1> is suppressed by document.css; the .document-title
 * element in the page is the canonical title rendering.
 */
(function () {
  'use strict';

  // Repo coordinates — update if the canonical home of the documents moves.
  var REPO = 'trumanellis/templesofrefuge.earth';
  var BRANCH = 'main';

  function rawUrl(path) {
    return 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + path;
  }

  function showError(message) {
    var body = document.getElementById('document-body');
    var err = document.getElementById('error-state');
    if (body) body.style.display = 'none';
    if (err) {
      err.style.display = 'block';
      var text = err.querySelector('.error-text');
      if (text) text.textContent = message;
    }
  }

  function applyFadeUps(body) {
    body.querySelectorAll('h2, h3, blockquote').forEach(function (el) {
      el.classList.add('fade-up');
    });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach(function (el) {
      observer.observe(el);
    });
  }

  async function fetchMarkdown(path) {
    // Try relative path first. On GitHub Pages this works because
    // .nojekyll keeps the .md files served verbatim; on a local
    // static server (e.g. `python3 -m http.server`) it picks up
    // unsaved edits immediately. Only fall back to GitHub raw if
    // the local file isn't there (e.g. on a stripped-down mirror).
    try {
      var resp1 = await fetch('/' + path, { cache: 'no-cache' });
      if (resp1.ok) {
        var text = await resp1.text();
        // Guard against Jekyll-rendered HTML being returned instead of raw markdown
        if (!text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
          return text;
        }
      }
    } catch (e) { /* fall through */ }

    try {
      var resp2 = await fetch(rawUrl(path), { cache: 'no-cache' });
      if (resp2.ok) return await resp2.text();
    } catch (e) { /* fall through */ }

    return null;
  }

  async function load(opts) {
    opts = opts || {};
    var path = opts.path;
    var body = document.getElementById('document-body');

    if (!path) {
      showError('No source document specified');
      return;
    }
    if (typeof marked === 'undefined') {
      showError('Markdown renderer not loaded');
      return;
    }

    var markdown = await fetchMarkdown(path);
    if (markdown == null) {
      showError('Document not found at ' + path);
      return;
    }

    // Strip optional YAML frontmatter
    markdown = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');

    marked.use({ gfm: true, breaks: false });
    body.innerHTML = marked.parse(markdown);

    applyFadeUps(body);
  }

  window.DocumentLoader = { load: load };
})();
