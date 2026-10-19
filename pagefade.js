/* Page change fade - loaded into Cargo through jsDelivr, as its OWN script (see README.md).
   Clicking a link to another page of the site fades a plain rectangle, in the color of the page being opened, over the
   whole page and away again: about a quarter of a second in all, easing in and out.

   It stands completely on its own: it does not touch site.js, the hamburger, the menu, the clock or the cursor, it never
   holds back, changes or cancels a click, and it never changes the address or the page. Everything in it is wrapped so
   that whatever goes wrong, the page carries on as if this file were not there. The rectangle can never stay: it starts to
   go within MAX_MS of starting whatever the page does, and a watchdog clears it in any case. Plain ES5, so it parses
   everywhere. */
(function () {
  "use strict";

  // ---- what can be set here ------------------------------------------------------------------------------
  // The color of a page is read from the page itself (its background / wallpaper) and remembered in the visitor's
  // browser, so from the second visit the rectangle has the right color from the first moment. To have it right from
  // the very first click, list the page here: "/about-me": "#D6C6B0"
  var PAGE_COLORS = {
  };
  // Pages that open over the page without the address changing (Cargo overlays): no rectangle for links to them
  var SKIP_PATHS = [];
  var MENU_PATH = "/site-menu";            // the site menu's own address (never a page change)
  var MENU_ID = "E3223264275";             // the id of Cargo's site menu page
  var FADE_IN = 120, FADE_OUT = 130;       // ms; --fx-fade-in / --fx-fade-out in a stylesheet can change them
  var MAX_MS = 350;                        // the rectangle starts to go this long after it started, at the latest
  // ----------------------------------------------------------------------------------------------------------

  var SETTLE_MS = 40;       // the new page must have stopped changing this long before the rectangle goes
  var QUICK_IN = 50, QUICK_START = 0.8, QUICK_GIVE_UP = 200;   // a rectangle started by a click (touch, keyboard) comes up this fast: the page changes in the same moment
  var RUN_MAX_MS = 800;     // a run of presses can keep the rectangle up this long at the most
  var STORE_KEY = "fx-page-colors";

  var veil = null, cycle = null, seq = 0, watchdog = 0, off = false, runStart = 0, lastEnd = 0;
  var learned = {}, downAt = null, ids = 0, learnState = { path: "", key: "", n: 0, hex: "" };

  function warn(e) { try { console.warn("[fx] page fade stopped:", e); } catch (x) {} }

  // ---- colors ---------------------------------------------------------------------------------------------
  function parseColor(str) {
    if (!str) return null;
    if (!/^rgba?\(/.test(str)) {   // oklch(), lab(), color() ...: let a 1x1 canvas turn it into plain numbers
      try {
        if (!parseColor.cx) {
          var cv = document.createElement("canvas");
          cv.width = cv.height = 1;
          parseColor.cx = cv.getContext("2d", { willReadFrequently: true });
        }
        var cx = parseColor.cx;
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = "#010203";
        cx.fillStyle = str;
        if (cx.fillStyle === "#010203") return null;
        cx.fillRect(0, 0, 1, 1);
        var d = cx.getImageData(0, 0, 1, 1).data;
        return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
      } catch (e) { return null; }
    }
    var n = str.match(/[\d.]+/g);
    if (!n || n.length < 3) return null;
    var a = n.length > 3 ? parseFloat(n[3]) : 1;
    if (a > 1) a = a / 100;
    return { r: +n[0], g: +n[1], b: +n[2], a: a };
  }
  function rgb(c) { return "rgb(" + c.r + "," + c.g + "," + c.b + ")"; }
  function hexOf(c) { return "#" + [c.r, c.g, c.b].map(function (v) { return (v < 16 ? "0" : "") + v.toString(16); }).join("").toUpperCase(); }
  function fromHex(h) {
    h = String(h).replace(/^#/, "");
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function inMenu(el) { return !!(el.closest && el.closest('[id="' + MENU_ID + '"], .page[page-url="site-menu"], .fx-menu')); }
  function fadedOut(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (parseFloat(getComputedStyle(e).opacity) < 0.05) return true;
    }
    return false;
  }
  // The color of the page as it is on screen: the page's own background layer (.backdrop), its page wrappers, the
  // site wallpaper (where Cargo's site background lives), then body and html. Of several the last one wins (it is painted
  // on top); a hidden, see-through or faded-out one, and anything in the menu, is ignored. null if no color is found.
  function pageColor() {
    var spots = [".backdrop", ".page", ".pages", ".content", ".wallpaper", "body", "html"];
    var vx = window.innerWidth / 2, vy = window.innerHeight / 2;
    for (var i = 0; i < spots.length; i++) {
      var hosts = document.querySelectorAll(spots[i]);
      for (var j = hosts.length - 1; j >= 0; j--) {
        var el = hosts[j], cs = getComputedStyle(el), c = parseColor(cs.backgroundColor);
        if (!c || c.a <= 0.5 || cs.visibility === "hidden" || inMenu(el) || fadedOut(el)) continue;
        if (spots[i] !== "body" && spots[i] !== "html" && spots[i] !== ".wallpaper") {
          var b = el.getBoundingClientRect();
          if (vx < b.left || vx > b.right || vy < b.top || vy > b.bottom) continue;
        }
        return c;
      }
    }
    return null;
  }

  // ---- the pages in the DOM (Cargo: .pages > .page[page-url]) -----------------------------------------------
  function shown(el) {
    var cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.05;
  }
  function pagesKey() {   // changes when a page comes in, goes out, or is shown / hidden
    var ps = document.querySelectorAll(".page"), out = [];
    for (var i = 0; i < ps.length; i++) {
      if (inMenu(ps[i])) continue;
      if (!ps[i].__fxId) ps[i].__fxId = ++ids;
      out.push(ps[i].__fxId + ":" + (ps[i].getAttribute("page-url") || "") + ":" + (shown(ps[i]) ? 1 : 0));
    }
    return out.join("|");
  }
  function pagesShown() {
    var ps = document.querySelectorAll(".page"), n = 0;
    for (var i = 0; i < ps.length; i++) if (!inMenu(ps[i]) && shown(ps[i])) n++;
    return n;
  }
  function pageState(path) {   // the page for an address: 0 = not in the DOM, 1 = in but not shown, 2 = shown ("/" is the home page)
    var want = path.replace(/^\//, ""), last = want.split("/").pop(), ps = document.querySelectorAll(".page"), found = 0;
    for (var i = 0; i < ps.length; i++) {
      var u = (ps[i].getAttribute("page-url") || "").replace(/^\/|\/$/g, "");
      if (!u || inMenu(ps[i]) || !(u === want || u === last || (path === "/" && u === "home"))) continue;
      if (shown(ps[i])) return 2;
      found = 1;
    }
    return found;
  }

  // ---- what is remembered ----------------------------------------------------------------------------------
  function pathOf(p) { return (p || "/").replace(/\/+$/, "") || "/"; }
  function nowPath() { return pathOf(location.pathname); }
  function loadStore() { try { learned = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (e) { learned = {}; } }
  function learn(path, c) {
    var h = hexOf(c);
    if (learned[path] === h) return;
    learned[path] = h;
    var keys = Object.keys(learned);
    if (keys.length > 200) delete learned[keys[0]];
    try { localStorage.setItem(STORE_KEY, JSON.stringify(learned)); } catch (e) {}
  }
  function colorOf(path) {
    var h = PAGE_COLORS[path] || learned[path];
    return h && /^#[0-9a-f]{6}$/i.test(h) ? fromHex(h) : null;
  }
  function menuOpen() {
    var el = document.getElementById(MENU_ID);
    if (el) {
      var r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && shown(el)) return true;
    }
    return !!document.querySelector(".fx-menu.fx-open");
  }
  // Every so often: when the address and the pages have stayed the same for a moment, and exactly one page is showing,
  // its color is remembered for the address (a color in the middle of a fade, an overlay's color, or the old page's color
  // while a new page is still arriving are never taken: the check starts again whenever the address or the pages change)
  function learnTick() {
    try {
      if (cycle || off || document.hidden) return;
      var path = nowPath(), key = pagesKey(), st = learnState;
      if (path !== st.path || key !== st.key) { learnState = { path: path, key: key, n: 0, hex: "" }; return; }
      st.n++;
      var c = pageColor(), hex = c ? hexOf(c) : "";
      var prev = st.hex;
      st.hex = hex;
      if (st.n < 2 || !hex || hex !== prev || path === MENU_PATH || menuOpen()) return;
      if (document.querySelector(".page") && (pagesShown() !== 1 || pageState(path) === 1)) return;
      learn(path, c);
    } catch (e) {}
  }

  // ---- the rectangle ------------------------------------------------------------------------------------------
  function ms(name, dflt) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(), n = parseFloat(v);
      if (isNaN(n)) return dflt;
      return /ms$/.test(v) ? n : /s$/.test(v) ? n * 1000 : n;
    } catch (e) { return dflt; }
  }
  function fadeIn(c, quick) {
    var t = quick ? QUICK_IN : ms("--fx-fade-in", FADE_IN);
    if (parseFloat(getComputedStyle(veil).opacity) < 0.02) {   // coming up from nothing: the color is set first, with no fade of its own
      veil.style.transition = "none";
      veil.style.backgroundColor = rgb(c);
      if (quick) veil.style.opacity = String(QUICK_START);   // (the page changes in this very frame: the change is under the color from the start)
      void veil.offsetWidth;
    }
    veil.style.transition = "opacity " + t + "ms " + (quick ? "ease-out" : "ease-in-out") + ", background-color 100ms ease";
    veil.style.backgroundColor = rgb(c);
    veil.style.opacity = "1";
    return t;
  }
  function fadeOut(c, quick) {
    var t = quick ? 80 : ms("--fx-fade-out", FADE_OUT);
    veil.style.transition = "opacity " + t + "ms ease-in-out, background-color " + t + "ms ease";
    if (c) veil.style.backgroundColor = rgb(c);
    veil.style.opacity = "0";
  }
  function clearAll() {   // whatever has happened: the rectangle goes
    seq++;
    cycle = null;
    lastEnd = performance.now();
    clearTimeout(watchdog);
    if (veil) fadeOut(null);
  }
  function cancelPress() {   // a press that is not going to be a click (drag, moved away, released elsewhere): the rectangle goes at once
    if (!cycle || cycle.how !== "down" || cycle.clicked) return;
    seq++;
    cycle = null;
    lastEnd = performance.now();
    clearTimeout(watchdog);
    fadeOut(null, true);
  }

  function begin(path, how) {
    var now = performance.now();
    if (cycle && cycle.path === path) return;   // (pressing the same link again does not start it over)
    var live = !!cycle || parseFloat(getComputedStyle(veil).opacity) >= 0.02;
    if (!runStart || (!live && now - lastEnd > 600)) runStart = now;   // (presses less than 0.6 s apart are one run)
    if (now - runStart > RUN_MAX_MS) return;   // (a long run of presses cannot keep the rectangle up)
    var from = pageColor(), dest = colorOf(path), c = dest || from;
    if (!c) return;
    var my = ++seq;
    clearTimeout(watchdog);
    var quick = how === "click";
    cycle = { id: my, t0: now, addr0: location.pathname + location.search, key: pagesKey(), pagesAt: 0, addrAt: 0, hexAt: now, hex: "", guess: !dest, vc: c, path: path, how: how, clicked: false, inMs: 0 };
    cycle.inMs = fadeIn(c, quick);
    watchdog = setTimeout(function () { if (seq === my) clearAll(); }, MAX_MS + 700);   // (the rectangle can never stay)
    tick(my);
  }
  // Watches until the page has changed and settled (a page came in / was shown / was hidden, or the address changed and the
  // page for it is showing) and the rectangle has come up, then lets it go; at the latest MAX_MS after it started, whatever
  // the page is doing. If the page's color is not the one the rectangle has, the rectangle turns into it as it goes.
  function tick(my) {
    try {
      if (seq !== my || !cycle) return;
      var now = performance.now(), cy = cycle, key = pagesKey(), addr = location.pathname + location.search;
      if (key !== cy.key) { cy.key = key; cy.pagesAt = now; }
      var path = nowPath(), st = pageState(path), hasPages = !!document.querySelector(".page");
      if (addr !== cy.addr0 && !cy.addrAt && (!hasPages || st === 2)) cy.addrAt = now;   // (an address that changed while its page has not come yet is not an arrival)
      var c = pageColor(), hex = c ? hexOf(c) : "";
      if (hex !== cy.hex) { cy.hex = hex; cy.hexAt = now; }   // (the page's color is still fading while it changes)
      var changed = cy.pagesAt || cy.addrAt, since = now - cy.t0;
      var up = parseFloat(getComputedStyle(veil).opacity) >= 0.95 || since >= cy.inMs + 120;
      var quiet = now - Math.max(cy.pagesAt, cy.addrAt, cy.hexAt);
      var arrived = changed && quiet >= SETTLE_MS && up && st !== 1 && (pagesShown() > 0 || !hasPages);
      if (arrived || since >= MAX_MS || (!changed && cy.how === "click" && since >= QUICK_GIVE_UP)) {   // (a click that changed nothing at once: no page change, the rectangle goes sooner)
        var d = c && cy.vc ? Math.max(Math.abs(c.r - cy.vc.r), Math.abs(c.g - cy.vc.g), Math.abs(c.b - cy.vc.b)) : 0;
        var again = arrived && path !== MENU_PATH && !inMenuOpen() && d > 24 ? c : null;   // the page has another color than the rectangle (it was not known, or has changed): the rectangle turns into it as it goes
        cycle = null;
        lastEnd = now;
        clearTimeout(watchdog);
        fadeOut(again);
        return;
      }
      setTimeout(function () { tick(my); }, 30);
    } catch (e) { warn(e); clearAll(); }
  }
  function inMenuOpen() { try { return menuOpen(); } catch (e) { return false; } }

  // ---- clicks (only watched: never held back, changed or cancelled) -----------------------------------------------------------
  function linkOf(e) {
    var path = e.composedPath ? e.composedPath() : [], a = null;
    for (var i = 0; i < path.length && !a; i++) {
      var n = path[i];
      if (n && n.nodeType === 1 && n.tagName === "A" && n.hasAttribute("href")) a = n;
    }
    if (!a && e.target && e.target.closest) a = e.target.closest("a[href]");
    return a && a.tagName === "A" ? a : null;
  }
  // The address a click or press on this event's link would lead to, if it is another page of this site: otherwise ""
  function targetOf(e) {
    var a = linkOf(e);
    if (!a || (a.closest && a.closest("[contenteditable='true'], [contenteditable='']"))) return "";
    var tg = (a.getAttribute("target") || "").toLowerCase();
    if ((tg && tg !== "_self") || a.hasAttribute("download")) return "";
    var u = new URL(a.getAttribute("href"), location.href), p = pathOf(u.pathname);
    if (!/^https?:$/.test(u.protocol) || u.origin !== location.origin) return "";
    if (p === MENU_PATH || nowPath() === MENU_PATH || SKIP_PATHS.indexOf(p) >= 0 || /\.[a-z0-9]{2,5}$/i.test(p)) return "";
    if (p === nowPath() && u.search === location.search) return "";
    if (pageState(p) === 2) return "";   // the page for that address is the one already showing ("/" and "/home"): nothing changes
    return p;
  }
  function ok(e) {
    if (off || !veil || !e.isTrusted || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return false;
    try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false; } catch (x) {}
    return true;
  }
  // With a mouse the rectangle starts when the button goes down (a press and release take about a tenth of a second), so
  // it is already coming up when the page changes. Touch and the keyboard start it with the click (and then it comes up fast).
  function onDown(e) {
    downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (!ok(e) || e.pointerType !== "mouse" || e.isPrimary === false) return;
    var p = targetOf(e);
    if (p) begin(p, "down");
  }
  function onMove(e) {   // a press that moves away from where it started is a drag, not a click
    if (cycle && cycle.how === "down" && !cycle.clicked && downAt && Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y) > 12) cancelPress();
  }
  function onUp() {   // a click follows the release at once; if none does, the press was not a click
    if (!cycle || cycle.how !== "down" || cycle.clicked) return;
    var my = cycle.id;
    setTimeout(function () { try { if (seq === my) cancelPress(); } catch (e) {} }, 60);
  }
  function onClick(e) {
    if (cycle && cycle.how === "down") cycle.clicked = true;
    if (!ok(e)) return;
    if (e.detail > 0 && downAt && performance.now() - downAt.t < 3000 && Math.sqrt(Math.pow(e.clientX - downAt.x, 2) + Math.pow(e.clientY - downAt.y, 2)) > 8) return;   // the end of a drag, not a click
    if (cycle && cycle.how === "down" && performance.now() - cycle.t0 < 3000) return;   // already started with the press
    if (!cycle && performance.now() - lastEnd < 500) return;   // (the rectangle has only just gone: no second one on its heels)
    var p = targetOf(e);
    if (p) begin(p, "click");
  }

  function start() {
    try {
      if (!document.body || document.getElementById("fx-fade")) return;
      var st = document.createElement("style");
      st.id = "fx-fade-style";
      st.textContent = ".fx-fade{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147482999;pointer-events:none;opacity:0;}" +
        "@media print{.fx-fade{display:none !important;}}";
      document.head.appendChild(st);
      veil = document.createElement("div");
      veil.id = "fx-fade";
      veil.className = "fx-fade";
      veil.setAttribute("aria-hidden", "true");
      document.body.appendChild(veil);
      loadStore();
      window.addEventListener("pointerdown", function (e) { try { onDown(e); } catch (err) { warn(err); clearAll(); } }, true);
      window.addEventListener("click", function (e) { try { onClick(e); } catch (err) { warn(err); clearAll(); } }, true);
      window.addEventListener("pointermove", function (e) { try { onMove(e); } catch (err) { clearAll(); } }, true);
      window.addEventListener("pointerup", function () { try { onUp(); } catch (err) { clearAll(); } }, true);
      window.addEventListener("pointercancel", function () { try { cancelPress(); } catch (err) { clearAll(); } }, true);
      window.addEventListener("dragstart", function () { try { cancelPress(); } catch (err) { clearAll(); } }, true);
      window.addEventListener("pageshow", function (e) { if (e.persisted) { try { seq++; cycle = null; veil.style.transition = "none"; veil.style.opacity = "0"; } catch (x) {} } });
      setInterval(learnTick, 700);
    } catch (e) { off = true; warn(e); try { if (veil && veil.parentNode) veil.parentNode.removeChild(veil); } catch (x) {} }
  }

  if (window.__fxFadeLoaded) return;
  window.__fxFadeLoaded = true;
  try {
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
  } catch (e) { warn(e); }
})();
