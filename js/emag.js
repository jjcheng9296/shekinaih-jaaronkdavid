/* E-magazine reader: page-turn flipbook (two-page spread on wide screens, one page on phones),
   swipe/drag to turn, tap edges, pinch/double-tap zoom, page grid, text view, full screen. 19 Nov 2026. */
(function () {
  'use strict';
  var root = document.querySelector('.emag');
  if (!root) return;
  var BASE = root.getAttribute('data-base'), NUMS = root.getAttribute('data-pages').split(',').map(Number);
  var LAST = +root.getAttribute('data-last') || NUMS[NUMS.length - 1], NAME = root.getAttribute('data-name') || 'Magazine';
  var AR = 1219 / 1600, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function pad(n) { return ('00' + n).slice(-3); }
  var P = NUMS.map(function (n) { var f = BASE + 'p' + pad(n); return { n: n, s: f + '-640.jpg', m: f + '.jpg', h: f + '-hd.jpg', t: f + '-th.jpg' }; });
  var IC = {
    prev: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>', next: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/></svg>',
    text: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h11M4 18h13"/></svg>',
    zoom: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M11 8v6M8 11h6"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    exit: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>', plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
  };
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(cls, icon, label, aria) { var b = h('button', 'emag-btn ' + (cls || ''), icon + (label ? '<span>' + label + '</span>' : '')); b.type = 'button'; b.setAttribute('aria-label', aria || label); return b; }

  /* ---------- build the reader ---------- */
  var fallback = root.querySelector('.emag-fallback');
  var stage = h('div', 'emag-stage'), book = h('div', 'emag-book');
  book.setAttribute('role', 'group'); book.setAttribute('aria-roledescription', 'magazine'); book.setAttribute('aria-label', NAME + ', page reader');
  var L = h('div', 'emag-page l'), R = h('div', 'emag-page r'), cast = h('div', 'emag-cast');
  book.appendChild(L); book.appendChild(R);
  var bPrev = h('button', 'emag-nav prev', IC.prev), bNext = h('button', 'emag-nav next', IC.next);
  bPrev.type = bNext.type = 'button'; bPrev.setAttribute('aria-label', 'Previous page'); bNext.setAttribute('aria-label', 'Next page');
  stage.appendChild(book); stage.appendChild(bPrev); stage.appendChild(bNext);
  var bar = h('div', 'emag-bar'), track = h('div', 'emag-track'), where = h('div', 'emag-where'), range = h('input', 'emag-range');
  range.type = 'range'; range.min = 0; range.step = 1; range.setAttribute('aria-label', 'Move through the pages');
  var mPrev = h('button', 'emag-btn emag-tnav', IC.prev), mNext = h('button', 'emag-btn emag-tnav', IC.next);
  mPrev.type = mNext.type = 'button'; mPrev.setAttribute('aria-label', 'Previous page'); mNext.setAttribute('aria-label', 'Next page');
  track.appendChild(mPrev); track.appendChild(where); track.appendChild(range); track.appendChild(mNext);
  var tools = h('div', 'emag-tools');
  var bGrid = btn('', IC.grid, 'Pages', 'Show all pages'), bText = btn('keep', IC.text, 'Read text', 'Read the text of these pages'),
    bZoom = btn('', IC.zoom, 'Zoom', 'Zoom into this page'), bFull = btn('', IC.full, 'Full screen', 'Full screen');
  [bGrid, bText, bZoom, bFull].forEach(function (b) { tools.appendChild(b); });
  bar.appendChild(track); bar.appendChild(tools);
  var live = h('div', 'emag-sr'); live.setAttribute('aria-live', 'polite');
  if (fallback) fallback.parentNode.replaceChild(stage, fallback); else root.appendChild(stage);
  root.appendChild(bar); root.appendChild(live);
  root.classList.add('is-ready');

  /* ---------- views (spreads / single pages) ---------- */
  var mode = '', views = [], v = 0, pw = 0, ph = 0, tier = 'm', busy = null;
  function idxOf(n) { for (var i = 0; i < P.length; i++) if (P[i].n === n) return i; return -1; }
  function buildViews(spread) {
    var out = [];
    if (!spread) { P.forEach(function (_, i) { out.push([null, i]); }); return out; }
    for (var i = 0; i < P.length; i++) {
      var n = P[i].n;
      if (n === 1) { out.push([null, i]); continue; }
      if (n % 2 === 0) { var j = idxOf(n + 1); if (j > -1) { out.push([i, j]); i = j; } else out.push([i, null]); }
      else out.push([null, i]);
    }
    return out;
  }
  function viewWith(i) { for (var k = 0; k < views.length; k++) if (views[k][0] === i || views[k][1] === i) return k; return 0; }
  function firstIdx(vw) { return vw[0] != null ? vw[0] : vw[1]; }
  function src(i) { return i == null ? '' : P[i][tier]; }
  function pageLabel(vw) { var a = vw.filter(function (x) { return x != null; }).map(function (i) { return P[i].n; }); return a.join('–'); }

  function full() { return root.classList.contains('is-full') || document.fullscreenElement === root || document.webkitFullscreenElement === root; }
  function layout() {
    var W = Math.min(root.clientWidth, 1400) - (window.innerWidth < 700 ? 24 : 150);
    var barH = bar.offsetHeight || 110, vh = window.innerHeight, head = root.querySelector('.emag-head');
    var topBar = full() ? 0 : ((document.querySelector('.ss-bar') || {}).offsetHeight || 0), short = vh < 520;
    var headH = head && !short ? head.offsetHeight + 14 : 0;
    var H = full() ? vh - barH - 40 : Math.max(short ? 170 : 300, Math.min(vh - topBar - barH - headH - (short ? 36 : window.innerWidth < 700 ? 50 : 80), 1060));
    var hSpread = Math.min(H, W / 2 / AR), hSingle = Math.min(H, W / AR);
    var spread = W >= 620 && hSpread >= hSingle * 0.78;
    ph = Math.floor(spread ? hSpread : hSingle); pw = Math.floor(ph * AR);
    var need = pw * (window.devicePixelRatio || 1);
    tier = need <= 430 ? 's' : need <= 1250 ? 'm' : 'h';
    var m = spread ? 'spread' : 'single', keep = views.length ? firstIdx(views[v]) : startIdx;
    root.style.setProperty('--pw', pw + 'px'); root.style.setProperty('--ph', ph + 'px'); root.style.setProperty('--cols', spread ? 2 : 1);
    if (m !== mode) { mode = m; root.setAttribute('data-mode', m); views = buildViews(spread); range.max = views.length - 1; }
    v = viewWith(keep);
    render();
  }
  function setSlot(el, i) {
    el.classList.toggle('is-empty', i == null);
    var img = el.querySelector('img');
    if (i == null) { if (img) img.remove(); return; }
    if (!img) { img = new Image(); img.decoding = 'async'; img.draggable = false; el.appendChild(img); }
    var s = src(i); if (img.getAttribute('src') !== s) img.src = s;
    img.alt = NAME + ': page ' + P[i].n;
  }
  function offsetFor(vw) { if (mode !== 'spread') return 0; if (vw[0] == null) return -pw / 2; if (vw[1] == null) return pw / 2; return 0; }
  function render() {
    var vw = views[v];
    if (mode === 'spread') { setSlot(L, vw[0]); L.style.display = ''; } else { L.style.display = 'none'; }
    setSlot(R, vw[1]);
    book.style.setProperty('--off', offsetFor(vw) + 'px');
    bPrev.disabled = mPrev.disabled = v === 0; bNext.disabled = mNext.disabled = v === views.length - 1;
    range.value = v; range.style.setProperty('--fill', (views.length > 1 ? v / (views.length - 1) * 100 : 0) + '%');
    var lab = pageLabel(vw);
    where.innerHTML = lab + ' <small>/ ' + LAST + '</small>';
    range.setAttribute('aria-valuetext', 'Page ' + lab + ' of ' + LAST);
    live.textContent = 'Page ' + lab + ' of ' + LAST;
    preload();
    if (textOv.classList.contains('on')) fillText();
  }
  function preload() { [v + 1, v + 2, v - 1].forEach(function (k) { if (views[k]) views[k].forEach(function (i) { if (i != null) { var im = new Image(); im.src = src(i); } }); }); }

  /* ---------- page turn ---------- */
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function makeFlip(dir) {
    var to = v + dir; if (to < 0 || to >= views.length) return null;
    var A = views[v], B = views[to], leaf = h('div', 'emag-leaf' + (dir > 0 ? ' fwd' : '')), fr = h('div', 'emag-face front', '<i></i>'), bk = h('div', 'emag-face back', '<i></i>');
    function face(el, i) { if (i == null) { el.style.background = 'transparent'; return; } var im = new Image(); im.src = src(i); im.alt = ''; im.draggable = false; el.insertBefore(im, el.firstChild); }
    var spread = mode === 'spread', under, fi, bi, offA = offsetFor(A), offB = offsetFor(B);
    if (spread) {
      if (dir > 0) { fi = A[1]; bi = B[0]; leaf.style.left = pw + 'px'; leaf.style.transformOrigin = '0 50%'; under = R; setSlot(R, B[1]); }
      else { fi = A[0]; bi = B[1]; leaf.style.left = '0px'; leaf.style.transformOrigin = '100% 50%'; under = L; setSlot(L, B[0]); }
    } else {
      leaf.style.left = '0px'; leaf.style.transformOrigin = '0 50%';
      if (dir > 0) { fi = A[1]; bi = B[1]; under = R; setSlot(R, B[1]); }
      else { fi = B[1]; bi = A[1]; under = R; }
    }
    face(fr, fi); face(bk, bi); leaf.appendChild(fr); leaf.appendChild(bk); book.appendChild(leaf);
    if (under) under.appendChild(cast);
    var shF = fr.querySelector('i'), shB = bk.querySelector('i');
    function set(p) {
      var a;
      if (spread) a = dir > 0 ? -180 * p : 180 * p;
      else a = dir > 0 ? -180 * p : -180 * (1 - p);
      leaf.style.transform = 'rotateY(' + a + 'deg)';
      var s = Math.abs(Math.sin(a * Math.PI / 180));
      shF.style.opacity = s * .9; shB.style.opacity = s * .9;
      cast.style.opacity = spread ? s * .8 : (dir > 0 ? s * .7 : (1 - p) * .5);
      if (!spread) leaf.style.opacity = Math.abs(a) > 150 ? Math.max(0, (180 - Math.abs(a)) / 30) : 1;
      book.style.setProperty('--off', (offA + (offB - offA) * p) + 'px');
    }
    function end(done) {
      leaf.remove(); cast.style.opacity = 0; if (cast.parentNode) cast.parentNode.removeChild(cast);
      if (done) v = to;
      render();
    }
    return { set: set, end: end, p: 0 };
  }
  function animate(f, from, to, ms, cb) {
    if (reduce) { f.set(to); cb(); return; }
    var t0 = performance.now();
    function step(t) { var k = Math.min(1, (t - t0) / ms), p = from + (to - from) * ease(k); f.p = p; f.set(p); if (k < 1) busy = requestAnimationFrame(step); else { busy = null; cb(); } }
    busy = requestAnimationFrame(step);
  }
  var queue = 0, needLayout = false;
  function afterFlip() {
    root.classList.remove('is-drag');
    if (needLayout) { needLayout = false; layout(); }
    if (queue) { var q = queue; queue = 0; turn(q); }
  }
  function stopTurn() {
    if (busy) cancelAnimationFrame(busy); busy = null; queue = 0; dragging = null; pid = null;
    [].forEach.call(book.querySelectorAll('.emag-leaf'), function (x) { x.remove(); });
    cast.style.opacity = 0; if (cast.parentNode) cast.parentNode.removeChild(cast);
    root.classList.remove('is-drag');
    if (needLayout) { needLayout = false; layout(); }
  }
  function relayout() { if (busy || dragging) needLayout = true; else layout(); }
  function turn(dir) {
    if (busy || dragging) { queue = dir; return; }
    var f = makeFlip(dir); if (!f) return;
    root.classList.add('is-drag');
    animate(f, 0, 1, mode === 'spread' ? 700 : 560, function () { f.end(true); afterFlip(); });
  }
  function jump(k) { stopTurn(); v = Math.max(0, Math.min(views.length - 1, k)); render(); }
  function go(k) {
    k = Math.max(0, Math.min(views.length - 1, k)); if (k === v && !busy && !dragging) return;
    if (busy || dragging || Math.abs(k - v) !== 1) { jump(k); return; }
    turn(k - v);
  }
  function nearestIdx(n) { var i = idxOf(n); if (i > -1) return i; var best = 0; P.forEach(function (p, j) { if (Math.abs(p.n - n) < Math.abs(P[best].n - n)) best = j; }); return best; }
  function goPage(n) { go(viewWith(nearestIdx(n))); }

  /* ---------- drag, swipe, tap ---------- */
  var dragging = null, sx = 0, sy = 0, st = 0, moved = false, lastTap = 0, tapTimer = 0, pid = null, DT = 300;
  book.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || dragging) return;
    if (busy) { pid = null; return; }
    pid = e.pointerId; sx = e.clientX; sy = e.clientY; st = performance.now(); moved = false; dragging = null;
  });
  book.addEventListener('pointermove', function (e) {
    if (e.pointerId !== pid) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (!dragging && !moved) {
      if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
      moved = true;
      if (Math.abs(dx) < Math.abs(dy) * 1.15) { pid = null; return; }
      var d = dx < 0 ? 1 : -1, f = makeFlip(d); if (!f) { pid = null; return; }
      dragging = { f: f, d: d }; root.classList.add('is-drag');
      try { book.setPointerCapture(e.pointerId); } catch (x) { }
    }
    if (dragging) {
      var span = mode === 'spread' ? pw * 1.5 : pw * 1.05, p = Math.max(0, Math.min(1, (dragging.d > 0 ? -dx : dx) / span));
      dragging.f.p = p; dragging.f.set(p); e.preventDefault();
    }
  });
  function release(e) {
    if (e.pointerId !== pid) return; pid = null;
    var dt = performance.now() - st, dx = e.clientX - sx;
    if (dragging) {
      var g = dragging; dragging = null;
      var vel = Math.abs(dx) / Math.max(1, dt), done = g.f.p > .3 || (vel > .45 && g.f.p > .06);
      animate(g.f, g.f.p, done ? 1 : 0, Math.max(180, (done ? 1 - g.f.p : g.f.p) * 600), function () { g.f.end(done); afterFlip(); });
      return;
    }
    if (moved || dt > 450 || e.type === 'pointercancel') return;
    var r = book.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, now = performance.now();
    if (now - lastTap < DT) { clearTimeout(tapTimer); lastTap = 0; openZoom(pageAt(e.clientX)); return; }
    lastTap = now;
    tapTimer = setTimeout(function () { if (x > .62) turn(1); else if (x < .38) turn(-1); }, DT);
  }
  book.addEventListener('pointerup', release); book.addEventListener('pointercancel', release);
  book.addEventListener('dragstart', function (e) { e.preventDefault(); });
  function pageAt(cx) { var vw = views[v]; if (mode !== 'spread') return vw[1]; var r = R.getBoundingClientRect(); if (vw[0] == null) return vw[1]; if (vw[1] == null) return vw[0]; return cx >= r.left ? vw[1] : vw[0]; }

  bPrev.addEventListener('click', function () { turn(-1); }); mPrev.addEventListener('click', function () { turn(-1); }); mNext.addEventListener('click', function () { turn(1); });
  bNext.addEventListener('click', function () { turn(1); });
  range.addEventListener('input', function () { jump(+range.value); });
  var inView = false;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting && es[0].intersectionRatio > .45; }, { threshold: [0, .45, .7] }).observe(root);
  document.addEventListener('keydown', function (e) {
    if (ovStack.length) return;
    var a = document.activeElement, typing = a && (a.tagName === 'INPUT' && a !== range || a.tagName === 'TEXTAREA' || a.isContentEditable);
    var owned = full() || root.contains(a);
    if (typing || !(inView || owned)) return;
    if (a === range && /^Arrow/.test(e.key)) return;
    if (e.key === 'ArrowRight' || (owned && e.key === 'PageDown')) { turn(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || (owned && e.key === 'PageUp')) { turn(-1); e.preventDefault(); }
    else if (e.key === 'Home' && root.contains(a)) { go(0); e.preventDefault(); }
    else if (e.key === 'End' && root.contains(a)) { go(views.length - 1); e.preventDefault(); }
  });

  /* ---------- overlays ---------- */
  function overlay(cls, title) {
    var o = h('div', 'emag-ov ' + cls); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', title);
    var top = h('div', 'emag-ovbar'), t = h('div', 'emag-ovtitle', title), x = btn('', IC.x, 'Close', 'Close');
    top.appendChild(t); top.appendChild(x); o.appendChild(top);
    var body = h('div', 'emag-ovbody'); o.appendChild(body); document.body.appendChild(o);
    x.addEventListener('click', function () { closeOv(o); });
    o._t = t; o._b = body; o._x = x; return o;
  }
  var lastFocus = null, ovStack = [];
  function openOv(o) {
    lastFocus = document.activeElement; o.classList.add('on'); ovStack.push(o);
    document.documentElement.classList.add('emag-lock');
    var host = document.fullscreenElement || document.webkitFullscreenElement; if (host && o.parentNode !== host) host.appendChild(o);
    setTimeout(function () { o._x.focus(); }, 30);
  }
  function closeOv(o) {
    o.classList.remove('on'); ovStack = ovStack.filter(function (x) { return x !== o; });
    if (!ovStack.length && !root.classList.contains('is-full')) document.documentElement.classList.remove('emag-lock');
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) { }
  }
  document.addEventListener('keydown', function (e) {
    if (!ovStack.length) return;
    var o = ovStack[ovStack.length - 1];
    if (e.key === 'Escape') { closeOv(o); e.preventDefault(); }
    else if (e.key === 'Tab') {
      var f = [].filter.call(o.querySelectorAll('button,a[href],input,[tabindex="0"]'), function (el) { return !el.disabled && el.offsetParent !== null; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (!o.contains(document.activeElement)) { a.focus(); e.preventDefault(); }
      else if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); }
    }
  });

  /* pages grid */
  var gridOv = overlay('emag-pages', 'All pages'), grid = h('div', 'emag-grid');
  P.forEach(function (p, i) {
    var b = h('button', '', '<img alt="" decoding="async" data-src="' + p.t + '"><span>' + (p.n === 1 ? 'Cover' : 'Page ' + p.n) + '</span>');
    b.type = 'button'; b.setAttribute('aria-label', p.n === 1 ? 'Go to the cover' : 'Go to page ' + p.n);
    b.addEventListener('click', function () { closeOv(gridOv); go(viewWith(i)); });
    grid.appendChild(b);
  });
  gridOv._b.appendChild(grid);
  bGrid.addEventListener('click', function () {
    var cur = views[v]; [].forEach.call(grid.children, function (b, i) { b.classList.toggle('cur', cur[0] === i || cur[1] === i); var im = b.querySelector('img[data-src]'); if (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); } });
    openOv(gridOv); var c = grid.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'center' });
  });

  /* text view: the verbatim text of the pages on screen, from the full-text section */
  var textOv = overlay('emag-textov', 'Text'), textBox = h('div', 'emag-text'), tfoot = h('div', 'emag-ovfoot');
  var tPrev = btn('keep', IC.prev, 'Previous', 'Previous page'), tNext = btn('keep', IC.next, 'Next', 'Next page');
  tNext.innerHTML = '<span>Next</span>' + IC.next;
  tfoot.appendChild(tPrev); tfoot.appendChild(tNext); textOv._b.appendChild(textBox); textOv.appendChild(tfoot);
  var fts = 18; try { fts = +localStorage.getItem('emag-fts') || 18; } catch (e) { }
  var aMinus = btn('', '<b style="font-size:13px">A</b>', '', 'Smaller text'), aPlus = btn('', '<b style="font-size:19px">A</b>', '', 'Larger text'), aBox = h('div', 'emag-tools');
  aBox.appendChild(aMinus); aBox.appendChild(aPlus); textOv.firstChild.insertBefore(aBox, textOv._x);
  function setFts(n) { fts = Math.max(16, Math.min(28, n)); textBox.style.setProperty('--fts', fts + 'px'); aMinus.disabled = fts <= 16; aPlus.disabled = fts >= 28; try { localStorage.setItem('emag-fts', fts); } catch (e) { } }
  aMinus.addEventListener('click', function () { setFts(fts - 2); }); aPlus.addEventListener('click', function () { setFts(fts + 2); });
  setFts(fts);
  tPrev.addEventListener('click', function () { jump(v - 1); });
  tNext.addEventListener('click', function () { jump(v + 1); });
  function fillText() {
    var vw = views[v], html = '';
    vw.forEach(function (i) {
      if (i == null) return;
      var n = P[i].n, s = document.getElementById('text-p' + n);
      html += s ? s.outerHTML.replace(/\sid="[^"]*"/, '') : '<section class="ft-page"><p class="ft-pno">' + (n === 1 ? 'Cover' : 'Page ' + n) + '</p><p class="ft-note">Photographs</p></section>';
    });
    textBox.innerHTML = html;
    textOv._t.textContent = 'Text · ' + (vw.filter(function (x) { return x != null; }).map(function (i) { return P[i].n === 1 ? 'Cover' : 'Page ' + P[i].n; }).join(' & '));
    tPrev.disabled = v === 0; tNext.disabled = v === views.length - 1;
    textOv._b.scrollTop = 0;
  }
  bText.addEventListener('click', function () { fillText(); openOv(textOv); });

  /* zoom: pinch, drag, wheel, double-tap; swipe between pages when not zoomed */
  var zoomOv = overlay('emag-zoom', 'Zoom'), zimg = new Image(), zi = 0, zs = 1, zx = 0, zy = 0, fitW = 0, fitH = 0;
  zimg.alt = ''; zimg.draggable = false; zoomOv._b.appendChild(zimg);
  var zhint = h('div', 'emag-zhint', 'Pinch or double-tap to zoom · drag to move'); zoomOv._b.appendChild(zhint);
  var zfoot = h('div', 'emag-ovfoot'), zPrev = btn('keep', IC.prev, 'Previous', 'Previous page'), zMid = h('div', 'emag-tools'),
    zOut = btn('', IC.minus, '', 'Zoom out'), zIn = btn('', IC.plus, '', 'Zoom in'), zNext = btn('keep', '', 'Next', 'Next page');
  zNext.innerHTML = '<span>Next</span>' + IC.next; zMid.appendChild(zOut); zMid.appendChild(zIn);
  zfoot.appendChild(zPrev); zfoot.appendChild(zMid); zfoot.appendChild(zNext); zoomOv.appendChild(zfoot);
  function zbox() { return zoomOv._b.getBoundingClientRect(); }
  function zfit() { var r = zbox(); fitH = Math.min(r.height - 24, (r.width - 24) / AR); fitW = fitH * AR; zimg.style.width = fitW + 'px'; zimg.style.height = fitH + 'px'; }
  function zclamp() {
    var r = zbox(), w = fitW * zs, hh = fitH * zs;
    zx = w <= r.width ? (r.width - w) / 2 : Math.min(0, Math.max(r.width - w, zx));
    zy = hh <= r.height ? (r.height - hh) / 2 : Math.min(0, Math.max(r.height - hh, zy));
    zimg.style.transform = 'translate(' + zx + 'px,' + zy + 'px) scale(' + zs + ')';
  }
  function zto(s, cx, cy) { var r = zbox(); if (cx == null) { cx = r.width / 2; cy = r.height / 2; } s = Math.max(1, Math.min(5, s)); zx = cx - (cx - zx) * (s / zs); zy = cy - (cy - zy) * (s / zs); zs = s; zclamp(); }
  function zshow(i) {
    if (i == null || i < 0 || i >= P.length) return; zi = i; zs = 1;
    zimg.src = P[i].m; var hd = new Image(); hd.onload = function () { if (zi === i) zimg.src = P[i].h; }; hd.src = P[i].h;
    zimg.alt = NAME + ': page ' + P[i].n; zoomOv._t.textContent = P[i].n === 1 ? 'Cover' : 'Page ' + P[i].n;
    zfit(); zx = 0; zy = 0; zclamp(); zPrev.disabled = i === 0; zNext.disabled = i === P.length - 1;
  }
  function openZoom(i) { if (i == null) i = firstIdx(views[v]); openOv(zoomOv); zshow(i); zhint.style.opacity = 1; setTimeout(function () { zhint.style.opacity = 0; }, 2600); }
  bZoom.addEventListener('click', function () { openZoom(pageAt(R.getBoundingClientRect().left + 1)); });
  zIn.addEventListener('click', function () { zto(zs * 1.6); });
  zOut.addEventListener('click', function () { zto(zs / 1.6); });
  zPrev.addEventListener('click', function () { zshow(zi - 1); jump(viewWith(zi)); });
  zNext.addEventListener('click', function () { zshow(zi + 1); jump(viewWith(zi)); });
  var zp = {}, zpd = null, zlast = 0;
  function zpts() { return Object.keys(zp).map(function (k) { return zp[k]; }); }
  zoomOv._b.addEventListener('pointerdown', function (e) {
    zoomOv._b.setPointerCapture(e.pointerId); var r = zbox();
    zp[e.pointerId] = { x: e.clientX - r.left, y: e.clientY - r.top };
    var ps = zpts();
    if (ps.length === 1) { zpd = { x: ps[0].x, y: ps[0].y, zx: zx, zy: zy, t: performance.now(), sx: ps[0].x }; }
    else if (ps.length === 2) { zpd = { d: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), s: zs, cx: (ps[0].x + ps[1].x) / 2, cy: (ps[0].y + ps[1].y) / 2, zx: zx, zy: zy }; }
  });
  zoomOv._b.addEventListener('pointermove', function (e) {
    if (!zp[e.pointerId] || !zpd) return; var r = zbox(); zp[e.pointerId] = { x: e.clientX - r.left, y: e.clientY - r.top };
    var ps = zpts();
    if (ps.length === 2 && zpd.d) {
      var d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), s = Math.max(1, Math.min(5, zpd.s * d / zpd.d));
      var cx = (ps[0].x + ps[1].x) / 2, cy = (ps[0].y + ps[1].y) / 2;
      zx = cx - (zpd.cx - zpd.zx) * (s / zpd.s); zy = cy - (zpd.cy - zpd.zy) * (s / zpd.s); zs = s; zclamp();
    } else if (ps.length === 1 && zpd.x != null && zs > 1.01) { zx = zpd.zx + ps[0].x - zpd.x; zy = zpd.zy + ps[0].y - zpd.y; zclamp(); }
  });
  function zup(e) {
    if (!zp[e.pointerId]) return; var r = zbox(), x = e.clientX - r.left, y = e.clientY - r.top, single = zpts().length === 1 && zpd && zpd.t;
    delete zp[e.pointerId];
    if (single) {
      var dt = performance.now() - zpd.t, dx = x - zpd.sx;
      if (zs <= 1.01 && Math.abs(dx) > 60 && dt < 600) { zshow(zi + (dx < 0 ? 1 : -1)); jump(viewWith(zi)); }
      else if (Math.abs(dx) < 8 && dt < 300) { var now = performance.now(); if (now - zlast < 320) { zto(zs > 1.2 ? 1 : 2.6, x, y); zlast = 0; } else zlast = now; }
    }
    var ps = zpts(); zpd = ps.length === 1 ? { x: ps[0].x, y: ps[0].y, zx: zx, zy: zy, t: 0, sx: ps[0].x } : null;
  }
  zoomOv._b.addEventListener('pointerup', zup); zoomOv._b.addEventListener('pointercancel', zup);
  zoomOv._b.addEventListener('wheel', function (e) { e.preventDefault(); var r = zbox(); zto(zs * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  document.addEventListener('keydown', function (e) {
    if (!zoomOv.classList.contains('on')) return;
    if (e.key === 'ArrowRight') { zshow(zi + 1); jump(viewWith(zi)); } else if (e.key === 'ArrowLeft') { zshow(zi - 1); jump(viewWith(zi)); }
    else if (e.key === '+' || e.key === '=') zto(zs * 1.4); else if (e.key === '-') zto(zs / 1.4);
  });

  /* ---------- full screen ---------- */
  var canFS = !!(root.requestFullscreen || root.webkitRequestFullscreen) && (document.fullscreenEnabled || document.webkitFullscreenEnabled);
  function setFullBtn() { var on = full(); bFull.innerHTML = (on ? IC.exit : IC.full) + '<span>' + (on ? 'Exit full screen' : 'Full screen') + '</span>'; bFull.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen'); }
  bFull.addEventListener('click', function () {
    if (full()) {
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      root.classList.remove('is-full'); document.documentElement.classList.remove('emag-lock');
    } else if (canFS) { (root.requestFullscreen || root.webkitRequestFullscreen).call(root); }
    else { root.classList.add('is-full'); document.documentElement.classList.add('emag-lock'); }
    setTimeout(function () { setFullBtn(); relayout(); }, 60);
  });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) { document.addEventListener(ev, function () { setFullBtn(); relayout(); if (!(document.fullscreenElement || document.webkitFullscreenElement)) [gridOv, textOv, zoomOv].forEach(function (o) { if (o.parentNode !== document.body) document.body.appendChild(o); }); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.defaultPrevented && root.classList.contains('is-full') && !ovStack.length) bFull.click(); });

  /* ---------- links from the page grid and #page-N ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-emag-page]'); if (!a) return;
    e.preventDefault(); goPage(+a.getAttribute('data-emag-page')); root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
  var startIdx = 0, mh = /^#page-(\d+)$/.exec(location.hash);
  if (mh) { startIdx = nearestIdx(+mh[1]); setTimeout(function () { root.scrollIntoView({ block: 'start' }); }, 50); }
  window.addEventListener('hashchange', function () { var m = /^#page-(\d+)$/.exec(location.hash); if (m) { goPage(+m[1]); root.scrollIntoView({ block: 'start' }); } });
  var rz = 0;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { relayout(); if (zoomOv.classList.contains('on')) { zfit(); zclamp(); } }, 120); });
  layout(); setFullBtn();
})();
