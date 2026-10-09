/* Portfolio effects (navigation bar + custom cursor) - loaded into Cargo via jsDelivr */
(function () {
  if (window.__fxLoaded) return;
  window.__fxLoaded = true;

  // ===========================================================================
  // 1) NAVIGATION BAR - fixed to the top, hamburger on the right. The hamburger's color
  //    follows the page's background color. Clicking it turns it into an X and slides the site
  //    menu in from the right (Cargo's own overlay page, or the built-in copy); clicking again
  //    slides it back.
  // ===========================================================================

  // Hamburger color for each page background color. A background that is not listed here
  // keeps the default white.
  var HAMBURGER_COLORS = [
    { page: "#5E6B4E", icon: "#D6C6B0" },
    { page: "#D6C6B0", icon: "#5E6B4E" },
    { page: "#2B2A28", icon: "#A0522D" },
    { page: "#A0522D", icon: "#2B2A28" }
  ];
  var DEFAULT_HAMBURGER = "#FFFFFF";

  // The site menu is the overlay page designed in Cargo (address /site-menu). The hamburger opens
  // it the way a link to it would: it clicks a link to that page if there is one in Cargo (found by
  // its address, or by its text - openLinkText - for a text link added with Cmd+K, Link to Page,
  // on a pinned page so it exists on every page), and otherwise follows the address itself.
  // To slide it away again it uses a "Close Overlay" text link (Cmd+K, Navigate, Close Overlay)
  // with the text closeLinkText - optional - or clicks outside it, or the open link once more.
  // pageId / slug identify the page, as in its CSS in Cargo ([id="..."]) and its address; site.css
  // needs the same ones for the slide animation.
  var CARGO_MENU = { slug: "site-menu", pageId: "E3223264275", openLinkText: "MENU", closeLinkText: "CLOSE" };

  // If that does not open Cargo's menu the hamburger shows this built-in copy of the menu instead,
  // so the site never ends up with a dead button. It is the content of the
  // "site menu" page (a line, the entries, a line); its look (30% wide, olive, padding, darkened
  // page) is in site.css. Edit the entries here. To make one a link, write it like
  // <a href="/works">WORKS</a>.
  var MENU_HTML =
    '<hr>' +
    '<div style="text-align: left;"><span class="cmsubtitlebasic">ABOUT<br>WORKS</span></div>' +
    '<hr>';
  var COLOR_TOLERANCE = 8;   // how far off (in RGB steps) a page color may be and still count as a match

  // --- reading colors from the page (shared by the bar and the background matching) ---
  function parseColor(str) {
    if (!str) return null;
    if (!/^rgba?\(/.test(str)) {
      // oklch(), lab(), color(), color-mix() ...: let a 1x1 canvas turn it into plain sRGB numbers
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
        if (cx.fillStyle === "#010203") return null;   // not understood
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
  function fromHex(h) {
    h = String(h).replace(/^#/, "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  // True when an element, or anything around it, is faded out (a page that is fading away)
  function fadedOut(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (parseFloat(getComputedStyle(e).opacity) < 0.05) return true;
    }
    return false;
  }

  // The site wallpaper's color, wherever the wallpaper sits (Cargo draws the site background
  // there). Of several, the last one is painted on top; a hidden or see-through one is ignored.
  function wallpaperColor() {
    var hosts = document.querySelectorAll(".wallpaper");
    for (var j = hosts.length - 1; j >= 0; j--) {
      var cs = getComputedStyle(hosts[j]);
      var c = parseColor(cs.backgroundColor);
      if (c && c.a > 0.5 && cs.visibility !== "hidden" && !fadedOut(hosts[j])) return c;
    }
    return null;
  }

  // The gutter strip above the page content shows the page behind the wallpaper (plain white in
  // Cargo), so html + body are given the wallpaper's color (site.css does the painting). It is
  // taken away again when the wallpaper has no plain color, so Cargo's own look comes back.
  var root = document.documentElement;
  function matchBackground() {
    var w = wallpaperColor();
    if (w) {
      var v = rgb(w);
      if (root.style.getPropertyValue("--fx-wallpaper") !== v) root.style.setProperty("--fx-wallpaper", v);
      if (!root.classList.contains("fx-bg-matched")) root.classList.add("fx-bg-matched");
    } else {
      if (root.style.getPropertyValue("--fx-wallpaper")) root.style.removeProperty("--fx-wallpaper");
      if (root.classList.contains("fx-bg-matched")) root.classList.remove("fx-bg-matched");
    }
  }

  // Cargo changes the page without telling us (page swaps, color fades), so keep checking:
  // right after DOM changes, when the tab comes back, and on a steady beat for the rest.
  var refreshNav = function () {};   // replaced once the bar exists
  function refreshAll() {
    if (document.hidden) return;
    matchBackground();
    refreshNav();
  }
  function keepInSync() {
    refreshAll();
    window.addEventListener("load", refreshAll);
    document.addEventListener("visibilitychange", refreshAll);
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; refreshAll(); });
    }).observe(document.body, { childList: true, subtree: true });
    setInterval(refreshAll, 250);
  }

  function fxNav() {
    function mk(tag, cls) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      return e;
    }

    // The page's background color. Checked from the page-specific background layer Cargo draws
    // (.backdrop), through its page wrappers and the site ".wallpaper" (where the site's
    // background color actually lives), down to the body (plain white on this site).
    // Of several matching elements the last one wins (it is painted on top), and one that is
    // hidden or doesn't reach the hamburger is ignored. The wallpaper counts wherever it sits.
    // null if no color is found.
    function pageBackground() {
      var r = burger.getBoundingClientRect();
      var px = r.left + r.width / 2, py = r.top + r.height / 2;
      var spots = [".fx-menu-panel", '[id="' + CARGO_MENU.pageId + '"] .page-content', ".backdrop", ".page", ".pages", ".content", ".wallpaper", "body", "html"];
      for (var i = 0; i < spots.length; i++) {
        if (spots[i] === ".wallpaper") {
          var wc = wallpaperColor();
          if (wc) return wc;
          continue;
        }
        var hosts = document.querySelectorAll(spots[i]);
        for (var j = hosts.length - 1; j >= 0; j--) {
          var cs = getComputedStyle(hosts[j]);
          var c = parseColor(cs.backgroundColor);
          if (!c || c.a <= 0.5 || cs.visibility === "hidden" || fadedOut(hosts[j])) continue;
          if (spots[i] !== "body" && spots[i] !== "html") {
            var b = hosts[j].getBoundingClientRect();
            if (px < b.left || px > b.right || py < b.top || py > b.bottom) continue;
          }
          return c;
        }
      }
      return null;
    }

    // --- hamburger color: the partner of the page background in HAMBURGER_COLORS ---
    function hamburgerFor(bg) {
      for (var i = 0; i < HAMBURGER_COLORS.length; i++) {
        var p = fromHex(HAMBURGER_COLORS[i].page);
        var d = Math.sqrt(Math.pow(p.r - bg.r, 2) + Math.pow(p.g - bg.g, 2) + Math.pow(p.b - bg.b, 2));
        if (d <= COLOR_TOLERANCE) return HAMBURGER_COLORS[i].icon;
      }
      return DEFAULT_HAMBURGER;
    }
    var lastIcon = "";
    function refreshHamburger() {
      var bg = pageBackground();
      var icon = bg ? hamburgerFor(bg) : DEFAULT_HAMBURGER;
      if (icon === lastIcon) return;
      lastIcon = icon;
      nav.style.setProperty("--fx-nav-auto", icon);
    }

    // --- build the bar ---
    var nav = mk("nav", "fx-nav");
    nav.setAttribute("aria-label", "Main");

    var burger = mk("button", "fx-nav-burger");
    burger.type = "button";
    burger.setAttribute("aria-label", "Open menu");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-controls", "fx-menu");
    burger.innerHTML = '<span class="fx-burger" data-fx-reflect><span></span><span></span><span></span></span>';

    nav.appendChild(burger);

    // --- Cargo's own overlay: found, opened and closed through the links you added in Cargo ---
    var LEAVE_MS = 450;   // how long the slide-away takes (keep in step with --fx-menu-ms in site.css)
    function cargoEl() {
      return document.getElementById(CARGO_MENU.pageId) || document.querySelector('[page-url="' + CARGO_MENU.slug + '"]');
    }
    // on screen = there, taking up room, not hidden and not faded out (Cargo may hide the page instead of removing it)
    function cargoOn() {
      var el = cargoEl();
      return !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && !fadedOut(el));
    }
    function cargoShown() {
      var el = cargoEl();
      return cargoOn() && !el.classList.contains("fx-leaving");
    }
    function findLink(text) {
      if (!text) return null;
      var want = text.trim().toUpperCase(), all = document.querySelectorAll("a, button, [role='button']");
      for (var i = 0; i < all.length; i++) {
        if (all[i].closest(".fx-nav, .fx-menu")) continue;
        if (all[i].textContent.replace(/\s+/g, " ").trim().toUpperCase() === want) return all[i];
      }
      return null;
    }
    // A real link to the menu page in Cargo: by its address first, then by its text
    function findOpenLink() {
      var slug = CARGO_MENU.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), at = new RegExp("(^|/)" + slug + "/?($|[?#])");
      var all = document.querySelectorAll("a[href]");
      for (var i = 0; i < all.length; i++) {
        if (!all[i].closest(".fx-nav, .fx-menu") && at.test(all[i].getAttribute("href"))) return all[i];
      }
      return findLink(CARGO_MENU.openLinkText);
    }
    // No link in the page: follow the menu page's address as if a link to it had been clicked. If
    // nothing in Cargo takes the click, it is cancelled, so the visitor never leaves the page.
    function openByAddress() {
      var a = document.createElement("a");
      a.href = "/" + CARGO_MENU.slug;
      a.tabIndex = -1;
      a.setAttribute("aria-hidden", "true");
      a.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden";
      document.body.appendChild(a);
      function guard(e) { if (!e.defaultPrevented) e.preventDefault(); }
      window.addEventListener("click", guard);   // the last stop for a click: runs after Cargo's own handlers
      a.click();
      window.removeEventListener("click", guard);
      setTimeout(function () { a.remove(); }, 1500);
    }
    function clickOpenTrigger() {
      var link = findOpenLink();
      if (link) link.click(); else openByAddress();
    }
    // Look every 40ms for up to ms milliseconds until test() is true, then call then(true/false)
    function whenThat(test, ms, then) {
      var t0 = performance.now();
      (function look() {
        if (test()) return then(true);
        if (performance.now() - t0 > ms) return then(false);
        setTimeout(look, 40);
      })();
    }
    // Ask Cargo to close its menu: try the ways Cargo documents, one after the other, until it is gone
    function closeCargoNow(done) {
      var tries = [
        function () { var l = findLink(CARGO_MENU.closeLinkText); if (l) { l.click(); return true; } return false; },
        function () { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true })); return true; },
        function () {   // a press on the dimmed area, as a visitor clicking outside the menu would do
          var e = cargoEl();
          if (!e) return false;
          ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(function (t) {
            e.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
          });
          return true;
        },
        function () { clickOpenTrigger(); return true; }   // following the link again closes it
      ];
      (function next(i) {
        if (!cargoOn()) return done(true);
        if (i >= tries.length) return done(false);
        if (!tries[i]()) return next(i + 1);
        whenThat(function () { return !cargoOn(); }, 300, function (gone) { if (gone) done(true); else next(i + 1); });
      })(0);
    }

    // --- the built-in copy of the menu: a dimmed page with a panel that slides in from the right ---
    var menu = mk("div", "fx-menu");
    menu.id = "fx-menu";
    menu.setAttribute("inert", "");
    var panel = mk("nav", "fx-menu-panel");
    panel.setAttribute("aria-label", "Site menu");
    panel.innerHTML = MENU_HTML;
    menu.appendChild(panel);
    function ownSet(on) {
      menu.classList.toggle("fx-open", on);
      if (on) menu.removeAttribute("inert"); else menu.setAttribute("inert", "");
    }

    // --- open / close: the icon changes between the hamburger and an X, the menu slides ---
    var open = false, busy = false, viaCargo = false;
    function showState(on) {
      open = on;
      burger.setAttribute("aria-expanded", on ? "true" : "false");
      burger.setAttribute("aria-label", on ? "Close menu" : "Open menu");
      burger.setAttribute("aria-controls", viaCargo ? CARGO_MENU.pageId : "fx-menu");
      refreshHamburger();   // the icon now sits on the panel, so it takes the panel's partner color
    }
    var cargoBroken = false;   // set when Cargo's menu did not open, so the next click goes straight to the built-in one
    function openMenu() {
      if (busy || open) return;
      var link = findOpenLink();
      if (cargoBroken && !link) { viaCargo = false; ownSet(true); showState(true); return; }
      viaCargo = true; busy = true; showState(true);
      var startPath = location.pathname;
      if (link) link.click(); else openByAddress();
      whenThat(cargoShown, 800, function (ok) {
        busy = false;
        // if Cargo went to the menu page as an ordinary page instead of opening it over this one, undo that
        if (ok && location.pathname !== startPath) { history.back(); ok = false; }
        if (ok) return refreshHamburger();
        cargoBroken = true;
        console.warn("[fx] Cargo's menu did not open - showing the built-in menu instead");
        viaCargo = false; ownSet(true); showState(true);
      });
    }
    function closeMenu() {
      if (busy || !open) return;
      if (!viaCargo) { ownSet(false); showState(false); return; }
      busy = true;
      var el = cargoEl();
      if (el) el.classList.add("fx-leaving");   // site.css slides it away, then Cargo is asked to close it
      showState(false);
      setTimeout(function () {
        closeCargoNow(function (ok) {
          busy = false;
          var e = cargoEl();
          if (e) e.classList.remove("fx-leaving");   // Cargo may keep the page around, hidden: it must be ready for the next time
          if (ok) return;
          console.warn("[fx] could not close Cargo's menu");
          showState(true);
        });
      }, el ? LEAVE_MS : 0);
    }
    // The menu can also be opened/closed by Cargo itself (a click outside it, a link inside it...):
    // keep the icon in step with what is really on screen.
    function syncMenuState() {
      if (busy) return;
      var real = cargoShown();
      if (!viaCargo && !real) return;
      if (real !== open) { viaCargo = true; showState(real); }
    }

    // Cargo may close its menu on the very press on the hamburger ("click outside"), so remember
    // whether it was open when the press began, and don't re-open it by accident.
    var wasOpen = null;
    burger.addEventListener("pointerdown", function () { wasOpen = open || cargoShown(); }, true);
    // While Cargo's menu is open, a press on the hamburger is kept away from Cargo's "click outside
    // closes it" listeners: the hamburger closes the menu itself, sliding it away first.
    ["pointerdown", "mousedown", "touchstart"].forEach(function (t) {
      burger.addEventListener(t, function (e) { if (cargoShown() || (viaCargo && open)) e.stopPropagation(); });
    });
    burger.addEventListener("click", function (e) {
      var was = wasOpen !== null ? wasOpen : (open || cargoShown());
      wasOpen = null;
      if (was) { e.stopPropagation(); if (!open) open = true; closeMenu(); } else openMenu();
    });
    // Built-in menu only: clicking the darkened page, or a link inside, closes it. (Cargo's own menu
    // closes itself on those; the sync above keeps the icon right.)
    document.addEventListener("click", function (e) {
      if (open && !viaCargo && !burger.contains(e.target) && !panel.contains(e.target)) closeMenu();
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (open && e.key === "Escape") { closeMenu(); burger.focus(); }
    });
    // While the built-in menu is open the page behind stays put: scrolling only works inside the panel
    function holdPage(e) {
      if (open && !viaCargo && (!panel.contains(e.target) || panel.scrollHeight <= panel.clientHeight)) e.preventDefault();
    }
    menu.addEventListener("wheel", holdPage, { passive: false });
    menu.addEventListener("touchmove", holdPage, { passive: false });
    panel.addEventListener("transitionend", refreshHamburger);

    document.body.appendChild(nav);
    document.body.appendChild(menu);

    // The first color is applied without a fade, so the bar never flashes in the wrong color.
    // The page itself may still be arriving (this script runs before it), so stay in that
    // "no fade" mode until it has been parsed, then look once more before fading is allowed.
    nav.classList.add("fx-nav-still");
    refreshHamburger();
    function endStill() {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { nav.classList.remove("fx-nav-still"); });
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { refreshHamburger(); endStill(); });
    } else {
      endStill();
    }

    // from now on the shared checker keeps the hamburger (and its open/closed look) in step
    refreshNav = function () { syncMenuState(); refreshHamburger(); };
  }

  // Only build the bar once site.css has loaded, so it never flashes unstyled.
  function whenStyled(cb, tries) {
    var ready = getComputedStyle(document.documentElement).getPropertyValue("--fx-nav-h").trim() !== "";
    if (ready) return cb();
    if ((tries || 0) > 100) return console.warn("[fx] site.css did not load; navigation bar skipped");
    setTimeout(function () { whenStyled(cb, (tries || 0) + 1); }, 50);
  }

  // ===========================================================================
  // 2) CUSTOM CURSOR - white breathing ball (mouse devices only)
  // ===========================================================================
  function fxCursor() {
    // Touch screens keep their normal behavior
    if (window.matchMedia("(hover: none)").matches) return;

    var CLICKABLE = "a, button, input, select, textarea, label, summary, [role='button'], [onclick]";

    // Two stacked balls: a plain white one, and one that inverts what's beneath it.
    // Blend modes can't animate, so we cross-fade between the two for a soft transition.
    var balls = ["", " fx-blend"].map(function (extra) {
      var el = document.createElement("div");
      el.className = "fx-cursor" + extra;
      el.innerHTML = '<div class="fx-cursor-inner"><div class="fx-cursor-dot"></div></div>';
      document.body.appendChild(el);
      return el;
    });
    function setClass(name, on) {
      balls.forEach(function (b) { b.classList.toggle(name, on); });
    }

    // True when the pointer is over text (not images/video), so the ball should blend
    // True only when the pointer is physically over a piece of text.
    // We look at every element under the pointer (including inside open shadow roots,
    // like the clock) and test the on-screen boxes of their text against the pointer.
    var PAD = 2;
    var MEDIA = /^(IMG|VIDEO|PICTURE)$/;
    function collect(root, px, py, out, depth) {
      var els = root.elementsFromPoint ? root.elementsFromPoint(px, py) : [];
      for (var i = 0; i < els.length; i++) {
        out.push(els[i]);
        if (els[i].shadowRoot && depth < 3) collect(els[i].shadowRoot, px, py, out, depth + 1);
      }
    }
    var range = document.createRange();
    function textHit(node, px, py) {
      range.selectNodeContents(node);
      var rects = range.getClientRects();
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        if (px >= r.left - PAD && px <= r.right + PAD && py >= r.top - PAD && py <= r.bottom + PAD) return true;
      }
      return false;
    }
    // Walk every text node inside a root (e.g. a clock's shadow root) and test each one
    function anyTextHit(root, px, py) {
      var w = document.createTreeWalker(root, 4 /* SHOW_TEXT */);
      for (var n = w.nextNode(), c = 0; n && c < 500; n = w.nextNode(), c++) {
        if (n.nodeValue.trim() && textHit(n, px, py)) return true;
      }
      return false;
    }
    // A real, visible picture - not a page-sized backdrop/background layer
    function isRealMedia(el) {
      if (!MEDIA.test(el.tagName)) return false;
      if (el.closest && el.closest(".backdrop")) return false;
      var r = el.getBoundingClientRect();
      if (r.width >= window.innerWidth * 0.95 && r.height >= window.innerHeight * 0.95) return false;
      if (parseFloat(getComputedStyle(el).opacity) < 0.05) return false;
      return true;
    }
    // Horizontal rules (<hr>) are only a pixel or two thick, so the pointer counts as "on" one
    // when it is within a few pixels of the line: the ball is much bigger than the line, and
    // it should flip as soon as it touches it. Along the line the pointer must be over it.
    var RULE_REACH = 6;
    function overRule(px, py) {
      var hrs = document.getElementsByTagName("hr");
      for (var i = 0; i < hrs.length; i++) {
        var r = hrs[i].getBoundingClientRect();
        if (px < r.left || px > r.right || py < r.top - RULE_REACH || py > r.bottom + RULE_REACH) continue;
        var cs = getComputedStyle(hrs[i]);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.05) continue;
        return true;
      }
      return false;
    }
    function overText(px, py) {
      if (overRule(px, py)) return true;
      var els = [];
      collect(document, px, py, els, 0);
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el === document.documentElement || el === document.body) continue;
        // Images and video: the whole picture counts
        if (isRealMedia(el)) return true;
        // The hamburger icon (marked data-fx-reflect in the nav code above)
        if (el.hasAttribute && el.hasAttribute("data-fx-reflect")) return true;
        for (var n = el.firstChild; n; n = n.nextSibling) {
          if (n.nodeType === 3 && n.nodeValue.trim() && textHit(n, px, py)) return true;
        }
        // Text hidden inside a shadow root (the clock's digits live here)
        if (el.shadowRoot && anyTextHit(el.shadowRoot, px, py)) return true;
        // Backup for the clock: if we can't see its text, use the box of the clock itself
        if (el.tagName === "DIGITAL-CLOCK") {
          var rs = el.getClientRects();
          for (var j = 0; j < rs.length; j++) {
            var r = rs[j];
            if (px >= r.left - PAD && px <= r.right + PAD && py >= r.top - PAD && py <= r.bottom + PAD) return true;
          }
        }
      }
      return false;
    }

    var x = -100, y = -100;   // mouse position
    var cx = x, cy = y;       // ball position (eases toward the mouse)
    var running = false;

    // --- zoom cursors ---
    // Over an expandable image (and over the image once it is open) Cargo asks the browser for
    // its zoom-in / zoom-out cursor. Our blanket "cursor: none" hides that request too, so for a
    // moment we lift it on the element under the pointer and its ancestors (the data-fx-probe
    // attribute, see site.css), read what the page itself asks for, and put it back - all in one
    // go, so the browser never paints the real cursor. The answer is remembered briefly.
    //
    // Cargo's own components (the gallery, the columns, the clock) keep part of their content in
    // a "shadow" layer that the page's stylesheet can't reach: neither to hide the real cursor
    // nor to be seen by ordinary lookups. So we look inside open shadow layers explicitly, and
    // give each one we meet the same "hide the real cursor" rule (closed ones can't be entered).
    var ZOOM = /\bzoom-(in|out)\b/;
    var probed = new WeakMap();

    var hideSheet = null, hiddenIn = new WeakSet();
    function hideRealCursorIn(root) {
      if (hiddenIn.has(root)) return;
      hiddenIn.add(root);
      var rule = "*:not([data-fx-probe]) { cursor: none !important; }";
      try {
        if (!hideSheet) { hideSheet = new CSSStyleSheet(); hideSheet.replaceSync(rule); }
        root.adoptedStyleSheets = root.adoptedStyleSheets.concat([hideSheet]);
      } catch (e) {   // older browsers: a plain <style> inside the layer does the same job
        var st = document.createElement("style");
        st.textContent = rule;
        root.appendChild(st);
      }
    }
    // The next element outwards, stepping out of a shadow layer onto its host
    function outwards(el) {
      return el.parentElement || (el.getRootNode && el.getRootNode().host) || null;
    }
    // The innermost element under the pointer, looking inside open shadow layers
    function deepestAt(px, py) {
      var el = document.elementFromPoint(px, py);
      for (var d = 0; el && el.shadowRoot && d < 6; d++) {
        hideRealCursorIn(el.shadowRoot);
        var inner = el.shadowRoot.elementFromPoint(px, py);
        if (!inner || inner === el) break;
        el = inner;
      }
      return el;
    }

    function pageWantsZoom(el) {
      var now = performance.now(), hit = probed.get(el);
      if (hit && now - hit.at < 600) return hit.zoom;
      var chain = [], n;
      for (n = el; n && n.nodeType === 1; n = outwards(n)) chain.push(n);
      for (var i = 0; i < chain.length; i++) chain[i].setAttribute("data-fx-probe", "");
      var cursor = getComputedStyle(el).cursor;
      for (var k = 0; k < chain.length; k++) chain[k].removeAttribute("data-fx-probe");
      var zoom = ZOOM.test(cursor);
      probed.set(el, { zoom: zoom, at: now });
      return zoom;
    }

    // Everything the ball reacts to, worked out for the element under the pointer
    function updateState() {
      var t = deepestAt(x, y), clickable = false;
      for (var n = t; n && !clickable; n = outwards(n)) clickable = !!(n.matches && n.matches(CLICKABLE));
      document.documentElement.classList.toggle("fx-over-text", overText(x, y));
      setClass("fx-link", clickable);
      setClass("fx-zoom", !!(t && t.nodeType === 1 && pageWantsZoom(t)));
    }

    // The page can change under a still pointer (an image opens, a page scrolls), so look again
    // shortly after clicks, scrolling and key presses (e.g. Escape closing an open image).
    var lookAgain = 0;
    function lookAgainSoon() {
      if (!running) return;
      clearTimeout(lookAgain);
      lookAgain = setTimeout(function () {
        probed = new WeakMap();
        updateState();
      }, 120);
    }

    function frame() {
      cx += (x - cx) * 0.25;
      cy += (y - cy) * 0.25;
      var tf = "translate3d(" + cx + "px," + cy + "px,0)";
      balls[0].style.transform = tf;
      balls[1].style.transform = tf;
      requestAnimationFrame(frame);
    }

    document.addEventListener("mousemove", function (e) {
      x = e.clientX;
      y = e.clientY;
      if (!running) {
        running = true;
        cx = x; cy = y;
        document.documentElement.classList.add("fx-cursor-on");
        setClass("fx-visible", true);
        frame();
      }
      updateState();
    }, { passive: true });
    document.addEventListener("click", function () { lookAgainSoon(); setTimeout(lookAgainSoon, 450); }, true);
    window.addEventListener("scroll", lookAgainSoon, { passive: true, capture: true });
    document.addEventListener("keyup", lookAgainSoon);

    document.addEventListener("mousedown", function () { setClass("fx-down", true); });
    document.addEventListener("mouseup", function () { setClass("fx-down", false); });
    document.documentElement.addEventListener("mouseleave", function () { setClass("fx-visible", false); });
    document.documentElement.addEventListener("mouseenter", function () { setClass("fx-visible", true); });
  }

  function start() {
    console.log("[fx] navigation + cursor v31 loaded");
    keepInSync();
    whenStyled(fxNav);
    fxCursor();
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
