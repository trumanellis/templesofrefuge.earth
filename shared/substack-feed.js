/**
 * Substack Feed v1.0
 * Shared article gallery widget for IndrasNetwork sites
 * templesofrefuge.earth / syncengine.earth / agualila.earth
 *
 * Usage:
 *   SubstackFeed.init({
 *     container: '#substack-articles',
 *     tag: 'SyncEngine',
 *     limit: 6,
 *     style: 'grid'
 *   });
 */
(function () {
  'use strict';

  /* ================================================================
     CONSTANTS
     ================================================================ */
  var API_URL = 'https://aeonmyths.substack.com/api/v1/posts?limit=50';
  var BASE_URL = 'https://aeonmyths.substack.com';
  var CACHE_KEY = 'substack-feed-cache';
  var CACHE_TTL = 1800000; // 30 minutes

  /* ================================================================
     STYLES
     ================================================================ */
  var FEED_CSS = '\
.sf-gallery{\
  max-width:1200px;\
  margin:0 auto;\
  padding:0 2rem;\
}\
.sf-grid{\
  display:grid;\
  grid-template-columns:repeat(auto-fill,minmax(320px,1fr));\
  gap:2rem;\
}\
.sf-list{\
  display:flex;\
  flex-direction:column;\
  gap:1.5rem;\
}\
.sf-card{\
  background:var(--t-cd,var(--color-forest,#1a1a1a));\
  border:1px solid var(--t-bc,var(--color-moss,rgba(255,255,255,0.1)));\
  border-radius:var(--s-radius,12px);\
  overflow:hidden;\
  text-decoration:none;\
  color:var(--t-tx,var(--color-light,#eee));\
  display:flex;\
  flex-direction:column;\
  transition:transform 200ms ease,box-shadow 200ms ease;\
}\
.sf-list .sf-card{\
  flex-direction:row;\
}\
.sf-card:hover{\
  transform:translateY(-4px);\
  box-shadow:0 8px 32px rgba(0,0,0,0.25),0 0 16px var(--t-bc,rgba(255,255,255,0.05));\
}\
.sf-card-image{\
  aspect-ratio:16/9;\
  overflow:hidden;\
  flex-shrink:0;\
}\
.sf-list .sf-card-image{\
  width:180px;\
  aspect-ratio:auto;\
  height:auto;\
  min-height:120px;\
}\
.sf-card-image img{\
  width:100%;\
  height:100%;\
  object-fit:cover;\
  display:block;\
}\
.sf-card-body{\
  padding:1.5rem;\
  display:flex;\
  flex-direction:column;\
  gap:0.5rem;\
  flex:1;\
}\
.sf-card-date{\
  font-size:0.7rem;\
  text-transform:uppercase;\
  letter-spacing:0.1em;\
  color:var(--t-mt,var(--color-sage,#888));\
  font-style:normal;\
}\
.sf-card-title{\
  font-family:var(--s-display,Georgia,serif);\
  font-size:1.1rem;\
  font-weight:600;\
  line-height:1.3;\
  margin:0;\
  color:var(--t-tx,var(--color-light,#eee));\
}\
.sf-card-subtitle{\
  font-size:0.875rem;\
  color:var(--t-t2,var(--color-mist,#aaa));\
  line-height:1.5;\
  margin:0;\
  flex:1;\
}\
.sf-card-link{\
  font-size:0.875rem;\
  font-weight:500;\
  color:var(--t-ac,var(--color-glow,#00d4aa));\
  margin-top:0.5rem;\
  display:inline-block;\
}\
.sf-empty{\
  text-align:center;\
  padding:3rem 2rem;\
  color:var(--t-t2,var(--color-mist,#aaa));\
  font-size:0.95rem;\
}\
.sf-fallback{\
  text-align:center;\
  padding:3rem 2rem;\
}\
.sf-fallback p{\
  color:var(--t-t2,var(--color-mist,#aaa));\
  margin-bottom:1rem;\
}\
.sf-fallback-link{\
  color:var(--t-ac,var(--color-glow,#00d4aa));\
  text-decoration:none;\
  font-weight:500;\
  font-size:1rem;\
}\
.sf-fallback-link:hover{\
  text-decoration:underline;\
}\
@media(max-width:640px){\
  .sf-grid{\
    grid-template-columns:1fr;\
  }\
  .sf-list .sf-card{\
    flex-direction:column;\
  }\
  .sf-list .sf-card-image{\
    width:100%;\
    aspect-ratio:16/9;\
    height:auto;\
  }\
}';

  /* ================================================================
     HELPERS
     ================================================================ */
  function injectStyle(id, css) {
    if (document.getElementById(id)) return;
    var s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function truncate(str, max) {
    if (!str) return '';
    if (str.length <= max) return str;
    return str.slice(0, max).replace(/\s+\S*$/, '') + '\u2026';
  }

  function matchesTag(bodyHtml, tag) {
    if (!bodyHtml || !tag) return false;
    var pattern = new RegExp('#' + tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    return pattern.test(bodyHtml);
  }

  /* ================================================================
     CACHE
     ================================================================ */
  function getCached() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.timestamp || !data.posts) return null;
      if (Date.now() - data.timestamp > CACHE_TTL) return null;
      return data.posts;
    } catch (e) {
      return null;
    }
  }

  function setCache(posts) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        posts: posts
      }));
    } catch (e) {
      // sessionStorage unavailable or quota exceeded — silently ignore
    }
  }

  /* ================================================================
     FETCH
     ================================================================ */
  function fetchPosts(callback) {
    var cached = getCached();
    if (cached) {
      callback(null, cached);
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status < 200 || xhr.status >= 300) {
        callback(new Error('HTTP ' + xhr.status));
        return;
      }
      try {
        var data = JSON.parse(xhr.responseText);
        var posts = Array.isArray(data) ? data : (data.posts || []);
        setCache(posts);
        callback(null, posts);
      } catch (e) {
        callback(new Error('JSON parse error: ' + e.message));
      }
    };
    xhr.onerror = function () {
      callback(new Error('Network error'));
    };
    xhr.send();
  }

  /* ================================================================
     RENDER
     ================================================================ */
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderFallback(container) {
    var div = document.createElement('div');
    div.className = 'sf-fallback';
    div.innerHTML = '<p>Visit our writings on Substack</p>' +
      '<a href="' + BASE_URL + '" target="_blank" rel="noopener" class="sf-fallback-link">' +
      'Read on Substack \u2192' +
      '</a>';
    container.appendChild(div);
  }

  function renderEmpty(container) {
    var div = document.createElement('div');
    div.className = 'sf-empty';
    div.textContent = 'No articles found.';
    container.appendChild(div);
  }

  function renderCard(post) {
    var url = BASE_URL + '/p/' + post.slug;
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'sf-card';

    var imageHtml = '';
    if (post.cover_image) {
      imageHtml =
        '<div class="sf-card-image">' +
        '<img src="' + escapeHtml(post.cover_image) + '" alt="" loading="lazy">' +
        '</div>';
    }

    var subtitle = truncate(post.subtitle || '', 120);
    var dateStr = formatDate(post.post_date);

    a.innerHTML = imageHtml +
      '<div class="sf-card-body">' +
      (dateStr ? '<time class="sf-card-date">' + dateStr + '</time>' : '') +
      '<h3 class="sf-card-title">' + escapeHtml(post.title || '') + '</h3>' +
      (subtitle ? '<p class="sf-card-subtitle">' + escapeHtml(subtitle) + '</p>' : '') +
      '<span class="sf-card-link">Read on Substack \u2192</span>' +
      '</div>';

    return a;
  }

  function renderGallery(container, posts, style) {
    var gallery = document.createElement('div');
    gallery.className = 'sf-gallery ' + (style === 'list' ? 'sf-list' : 'sf-grid');
    posts.forEach(function (post) {
      gallery.appendChild(renderCard(post));
    });
    container.appendChild(gallery);
  }

  /* ================================================================
     PUBLIC API
     ================================================================ */
  window.SubstackFeed = {
    /**
     * Initialize the Substack feed widget.
     * @param {Object} cfg
     * @param {string} cfg.container  - DOM selector (default: '#substack-articles')
     * @param {string} cfg.tag        - Hashtag to filter by, without # (default: '')
     * @param {number} cfg.limit      - Max cards to render (default: 6)
     * @param {string} cfg.style      - 'grid' or 'list' (default: 'grid')
     */
    init: function (cfg) {
      cfg = cfg || {};
      var selector = cfg.container || '#substack-articles';
      var tag = cfg.tag || '';
      var limit = typeof cfg.limit === 'number' ? cfg.limit : 6;
      var style = cfg.style === 'list' ? 'list' : 'grid';

      injectStyle('sf-styles', FEED_CSS);

      var container = document.querySelector(selector);
      if (!container) {
        console.warn('SubstackFeed: container not found:', selector);
        return;
      }

      fetchPosts(function (err, posts) {
        if (err) {
          console.warn('SubstackFeed: fetch failed —', err.message);
          renderFallback(container);
          return;
        }

        var filtered = posts.filter(function (post) {
          return tag ? matchesTag(post.body_html, tag) : true;
        });

        if (filtered.length === 0) {
          renderEmpty(container);
          return;
        }

        var limited = filtered.slice(0, limit);
        renderGallery(container, limited, style);
      });
    }
  };
})();
