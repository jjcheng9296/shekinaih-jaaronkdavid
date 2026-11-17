/* Site shell behaviour (17 Nov 2026): header menu, chapter bar auto-hide, chapter panel keyboard focus. */
(function () {
  'use strict';
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  var FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

  function trap(container, e) {
    if (e.key !== 'Tab') return;
    var items = Array.prototype.filter.call(container.querySelectorAll(FOCUSABLE), function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  ready(function () {
    /* Header menu */
    var burger = document.querySelector('.ss-burger'), menu = document.getElementById('ssMenu');
    if (burger && menu) {
      var closeBtn = menu.querySelector('.ss-close');
      var open = function () {
        menu.hidden = false; document.body.classList.add('ss-open');
        burger.setAttribute('aria-expanded', 'true');
        (closeBtn || menu).focus();
      };
      var close = function () {
        if (menu.hidden) return;
        menu.hidden = true; document.body.classList.remove('ss-open');
        burger.setAttribute('aria-expanded', 'false'); burger.focus();
      };
      burger.addEventListener('click', open);
      if (closeBtn) closeBtn.addEventListener('click', close);
      menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); else trap(menu, e); });
      menu.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a') : null;
        if (a && a.getAttribute('href') && a.getAttribute('href').indexOf('#') !== -1) close();
      });
      window.addEventListener('resize', function () { if (window.innerWidth >= 1100) close(); });
    }

    /* Chapter bar: visible only at the end of the page or while focused */
    var bar = document.querySelector('.cx-bar');
    if (bar && !document.getElementById('cx-autohide')) {
      var update = function () {
        var atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 24;
        bar.classList.toggle('cx-hide', !atEnd && !bar.contains(document.activeElement));
      };
      update();
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      bar.addEventListener('focusin', function () { bar.classList.remove('cx-hide'); });
      bar.addEventListener('focusout', function () { setTimeout(update, 0); });
    }

    /* Chapter panel: announce state, move focus in, return it on close */
    var panel = document.getElementById('cxPanel');
    var opener = bar ? bar.querySelector('.cx-center') : null;
    if (panel && opener) {
      opener.setAttribute('aria-controls', 'cxPanel');
      opener.setAttribute('aria-expanded', 'false');
      var sheet = panel.querySelector('.cx-sheet');
      if (sheet) sheet.setAttribute('aria-modal', 'true');
      var wasOpen = false;
      new MutationObserver(function () {
        var isOpen = panel.classList.contains('cx-open');
        if (isOpen === wasOpen) return;
        wasOpen = isOpen;
        opener.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (isOpen) {
          var cur = panel.querySelector('.cx-list a.cx-cur, .cx-list a[aria-current]') || panel.querySelector('.cx-foot button') || panel.querySelector('a');
          if (cur) cur.focus();
        } else { opener.focus(); }
      }).observe(panel, { attributes: true, attributeFilter: ['class'] });
      panel.addEventListener('keydown', function (e) { if (sheet) trap(sheet, e); });
    }
  });
})();
