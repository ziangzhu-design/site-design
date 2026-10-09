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
  // it by clicking a link made in Cargo's own editor (Cmd+K > Link to Page, on a pinned page so it
  // exists on every page): found by its address, or by its text - openLinkText. Cargo only treats
  // a link made that way as "open as overlay": the code never builds an address of its own, because
  // Cargo would take that for an ordinary page and jump to it. If there is no such link, or Cargo
  // does not open the menu over the page (the address changes, nothing appears), whatever Cargo did
  // is undone and the built-in menu below is shown instead.
  // To slide it away again it uses a "Close Overlay" link inside the menu page (Cmd+K > Navigate >
  // Close Overlay) with the text closeLinkText - optional - else Escape, else a click outside it.
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
    function pageBackground(skipMenu) {
      var r = burger.getBoundingClientRect();
      var px = r.left + r.width / 2, py = r.top + r.height / 2;
      var spots = [".fx-menu-panel", '[id="' + CARGO_MENU.pageId + '"] .page-content', ".backdrop", ".page", ".pages", ".content", ".wallpaper", "body", "html"];
      if (skipMenu) spots = spots.slice(2);   // the page behind the menu, not the menu itself
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
    function partnerFor(bg) {
      for (var i = 0; i < HAMBURGER_COLORS.length; i++) {
        var p = fromHex(HAMBURGER_COLORS[i].page);
        var d = Math.sqrt(Math.pow(p.r - bg.r, 2) + Math.pow(p.g - bg.g, 2) + Math.pow(p.b - bg.b, 2));
        if (d <= COLOR_TOLERANCE) return HAMBURGER_COLORS[i];
      }
      return null;
    }
    function hamburgerFor(bg) {
      var pair = partnerFor(bg);
      return pair ? pair.icon : DEFAULT_HAMBURGER;
    }

    // --- the menu's colors follow the site background (the wallpaper) ---
    // The same pairs as the hamburger: the menu takes the background's own color, and its text and
    // lines take the partner color. site.css paints it (html.fx-menu-themed); a background that is not
    // in the list leaves the menu as designed in Cargo.
    var themedFor = "";
    function themeMenu() {
      var bg = wallpaperColor() || pageBackground(true), pair = bg ? partnerFor(bg) : null;
      var key = pair ? pair.page + ">" + pair.icon : "";
      if (key !== themedFor) {
        themedFor = key;
        if (pair) {
          root.style.setProperty("--fx-menu-paper", pair.page);
          root.style.setProperty("--fx-menu-ink", pair.icon);
          root.classList.add("fx-menu-themed");
        } else {
          root.style.removeProperty("--fx-menu-paper");
          root.style.removeProperty("--fx-menu-ink");
          root.classList.remove("fx-menu-themed");
        }
      }
      // A line drawn as a filled strip (no border) needs the color as its background; a bordered one
      // needs it as its border color. Tell site.css which kind each line in the menu is.
      var rules = document.querySelectorAll('.fx-menu-panel hr, [id="' + CARGO_MENU.pageId + '"] .page-content hr, .page[page-url="' + CARGO_MENU.slug + '"] .page-content hr');
      for (var i = 0; i < rules.length; i++) {
        var kind = parseFloat(getComputedStyle(rules[i]).borderTopWidth) > 0 ? "border" : "fill";
        if (rules[i].getAttribute("data-fx-rule") !== kind) rules[i].setAttribute("data-fx-rule", kind);
      }
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

    // --- Cargo's own overlay: opened and closed only through links made in Cargo ---
    var LEAVE_MS = 450;        // how long the slide-away takes (keep in step with --fx-menu-ms in site.css)
    var OPEN_WAIT_MS = 900;    // give up waiting for Cargo's menu to appear after this long
    var SETTLE_MS = 700;       // it must stay up this long with the address unchanged to count as opened
    var WATCH_MS = 2200;       // the menu's appearance is watched this long after the click
    var JUMP_WATCH_MS = 6000;  // the address is watched this long after the click, whatever else happens: a late jump to the menu page is undone
    var RETRY_AFTER_MS = 60000; // after a failed attempt, go straight to the built-in menu for this long
    var FAIL_KEY = "fx-cargo-menu-failed";
    var menuPath = "/" + CARGO_MENU.slug;
    function pathOf(p) { return (p || "/").replace(/\/+$/, "") || "/"; }
    function nowPath() { return pathOf(location.pathname); }

    // Count what Cargo's router does to the address (nothing is changed: every call goes straight through),
    // so a jump to the menu as an ordinary page can be undone exactly.
    var pushes = 0, replaces = 0;
    ["pushState", "replaceState"].forEach(function (k) {
      try {
        var orig = history[k];
        history[k] = function () { if (k === "pushState") pushes++; else replaces++; return orig.apply(this, arguments); };
      } catch (e) {}
    });

    var failedAt = 0;
    function failedRecently() {
      var t = failedAt;
      try { t = Math.max(t, +sessionStorage.getItem(FAIL_KEY) || 0); } catch (e) {}
      return !!t && Date.now() - t < RETRY_AFTER_MS;
    }
    function rememberFailure() {
      failedAt = Date.now();
      try { sessionStorage.setItem(FAIL_KEY, String(failedAt)); } catch (e) {}
    }
    // A note kept while the link is being clicked: if the browser reloads onto the menu page (a link Cargo
    // did not take as an overlay), the new page finds it and sends the visitor straight back.
    var NOTE_KEY = "fx-cargo-menu-attempt";
    function noteAttempt(url) { try { sessionStorage.setItem(NOTE_KEY, JSON.stringify({ u: url, t: Date.now() })); } catch (e) {} }
    function clearNote() { try { sessionStorage.removeItem(NOTE_KEY); } catch (e) {} }
    try {
      var left = JSON.parse(sessionStorage.getItem(NOTE_KEY) || "null");
      if (left) sessionStorage.removeItem(NOTE_KEY);
      if (left && Date.now() - left.t < 15000 && nowPath() === menuPath && pathOf(new URL(left.u).pathname) !== menuPath) {
        rememberFailure();
        console.warn("[fx] The link to the site menu took the browser to the menu page instead of opening it over this page - going back and using the built-in menu. In Cargo, check that the site menu page is set to Overlay (right-click it in the Pages panel) and that the MENU link was made with Cmd+K > Link to Page.");
        location.replace(left.u);
      }
    } catch (e) {}

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
    function squash(t) { return t.replace(/\s+/g, " ").trim().toUpperCase(); }
    // Does a link go to the menu page? (an address-less link, or one to some other page, does not)
    function pointsToMenu(a) {
      var h = (a.getAttribute("href") || "").trim();
      if (!h || h === "#" || /^javascript:/i.test(h)) return false;
      try {
        var u = new URL(h, location.href);
        return u.origin === location.origin && pathOf(u.pathname) === menuPath;
      } catch (e) { return false; }
    }
    // A link that stays on this site (or has no address at all)
    function sameSite(a) {
      var h = (a.getAttribute("href") || "").trim();
      if (!h || h === "#" || /^javascript:/i.test(h)) return true;
      try { return new URL(h, location.href).origin === location.origin; } catch (e) { return false; }
    }
    // The link made in Cargo that opens the menu: by its address first, then by its text. Never one of
    // ours, one inside the menu page itself, or one that leaves the site. One that is on screen is
    // preferred over one on a page that is not showing.
    function findOpenLink() {
      var all = document.querySelectorAll("a"), cargo = cargoEl(), want = squash(CARGO_MENU.openLinkText || "");
      var byAddress = null, byText = null;
      for (var i = 0; i < all.length; i++) {
        var a = all[i];
        if (a.closest(".fx-nav, .fx-menu, [data-fx]") || (cargo && cargo.contains(a))) continue;
        if (a.target === "_blank" || a.hasAttribute("download") || typeof a.click !== "function") continue;
        var to = pointsToMenu(a), seen = a.getClientRects().length > 0;
        if (to === true && (!byAddress || (seen && !byAddress.seen))) byAddress = { el: a, seen: seen };
        else if (want && squash(a.textContent) === want && sameSite(a) && (!byText || (seen && !byText.seen))) byText = { el: a, seen: seen };
      }
      return byAddress ? byAddress.el : byText ? byText.el : null;
    }
    // A link to some other page of the site (or off it): never the "Close Overlay" link
    function leavesPage(a) {
      var h = (a.getAttribute("href") || "").trim();
      if (!h || h === "#" || /^javascript:/i.test(h)) return false;
      try {
        var u = new URL(h, location.href), p = pathOf(u.pathname);
        return u.origin !== location.origin || (p !== nowPath() && p !== menuPath);
      } catch (e) { return true; }
    }
    // The "Close Overlay" link: only ever looked for inside the menu page. By its text, or - for an icon -
    // by an aria-label / title that says "close".
    function findCloseLink() {
      var cargo = cargoEl(), want = squash(CARGO_MENU.closeLinkText || "");
      if (!cargo || !want) return null;
      var all = cargo.querySelectorAll("a, button, [role='button']");
      for (var i = 0; i < all.length; i++) {
        var a = all[i], label = (a.getAttribute("aria-label") || a.getAttribute("title") || "");
        if (a.tagName === "A" && leavesPage(a)) continue;
        if (squash(a.textContent) === want || squash(label).indexOf(want) >= 0) return a;
      }
      return null;
    }
    function pressEscape() {
      var ev = new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true });
      ev.fxOwn = true;   // our own handler below ignores it
      document.dispatchEvent(ev);
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
    // Ask Cargo to close its menu, the ways Cargo documents, one after the other, until it is gone:
    // the Close Overlay link, Escape, a click outside the menu. It never follows a link to a page.
    function closeCargoNow(done) {
      var tries = [
        function () { var l = findCloseLink(); if (!l) return false; l.click(); return true; },
        function () { pressEscape(); return true; },
        function () {
          var e = cargoEl();
          if (!e) return false;
          ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(function (t) {
            e.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
          });
          return true;
        }
      ];
      var startPath = nowPath();
      (function next(i) {
        if (!cargoOn()) return done(true);
        if (i >= tries.length) return done(false);
        if (!tries[i]()) return next(i + 1);
        whenThat(function () { return !cargoOn() || nowPath() !== startPath; }, 500, function () {
          // gone: finished. The address moved (Cargo's own way of closing it): stop trying more.
          if (!cargoOn() || nowPath() !== startPath) return done(!cargoOn());
          next(i + 1);
        });
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
    var open = false, busy = false, viaCargo = false, ignoreSyncUntil = 0, noLinkNoted = false;
    function showState(on) {
      open = on;
      burger.setAttribute("aria-expanded", on ? "true" : "false");
      burger.setAttribute("aria-label", on ? "Close menu" : "Open menu");
      burger.setAttribute("aria-controls", viaCargo ? CARGO_MENU.pageId : "fx-menu");
      refreshHamburger();   // the icon now sits on the panel, so it takes the panel's partner color
      burstRefresh(900);    // ...and follows the panel while it slides in or out
    }
    var burstUntil = 0, bursting = false;
    function burstRefresh(ms) {
      burstUntil = performance.now() + ms;
      if (bursting) return;
      bursting = true;
      (function tick() {
        refreshHamburger();
        if (performance.now() < burstUntil) requestAnimationFrame(tick); else bursting = false;
      })();
    }
    function ownOpen() { viaCargo = false; ownSet(true); showState(true); }

    var stopWatch = null;   // ends the watch over a just-opened Cargo menu (set while there is one)

    // Undo a jump to the menu page as an ordinary page, exactly as far as Cargo's router took it
    function undoJump(startUrl, startLen, p0, r0, done) {
      var pushed = pushes - p0, replaced = replaces - r0, grown = history.length - startLen;
      if (pushed >= 1 && pushed <= 3) history.go(-pushed);
      else if (pushed === 0 && replaced >= 1) {
        history.replaceState(history.state, "", startUrl);
        window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
      } else if (grown >= 1 && grown <= 3) history.go(-grown);
      setTimeout(function () {
        if (nowPath() === menuPath) location.replace(startUrl);   // still stuck on the menu page: the page we started on
        done();
      }, 700);
    }

    function openMenu() {
      if (busy || open) return;
      var link = failedRecently() ? null : findOpenLink();
      if (!link) {
        if (!failedRecently() && !noLinkNoted) {
          noLinkNoted = true;
          console.info("[fx] No link to the site menu was found in Cargo, so the built-in menu is shown. To open Cargo's own overlay, put a text link MENU on a pinned page (not on the menu page itself) and make it with Cmd+K > Link to Page > site menu.");
        }
        return ownOpen();
      }
      // Click the link Cargo made, then watch: the menu must appear, over this page, with the address
      // not turning into the menu's. If Cargo went to the menu as an ordinary page, or ignored the
      // click, that is undone and the built-in menu is shown instead.
      var startUrl = location.href, startPath = nowPath(), startLen = history.length, p0 = pushes, r0 = replaces;
      var t0 = performance.now(), shownSince = 0, everShown = false, settled = false, finished = false;
      function stop() {
        finished = true; busy = false; stopWatch = null;
        clearNote();
      }
      stopWatch = stop;
      function bail(reason) {
        finished = true; stopWatch = null;
        rememberFailure(); clearNote();
        console.warn("[fx] Cargo's menu did not open as an overlay (" + reason + ") - showing the built-in menu instead. In Cargo, check that the site menu page is set to Overlay (right-click it in the Pages panel) and that the MENU link was made with Cmd+K > Link to Page.");
        ignoreSyncUntil = performance.now() + 2500;
        ownOpen();
        busy = false;
        // a slow Cargo may still put its menu up late: it must not stay on top of the built-in one
        var b0 = performance.now(), closingLate = false;
        (function look() {
          if (!closingLate && !viaCargo && cargoOn() && !(nowPath() === menuPath && startPath !== menuPath)) {
            closingLate = true;
            var e = cargoEl(); if (e) e.classList.add("fx-leaving");
            closeCargoNow(function () { var x = cargoEl(); if (x) x.classList.remove("fx-leaving"); closingLate = false; });
          }
          if (performance.now() - b0 < WATCH_MS + 1500) setTimeout(look, 60);
        })();
      }
      // The jump guard: whatever else happens (the menu opens, the visitor closes it again at once, the
      // watch gives up), Cargo turning the click into a visit to the menu page is always undone.
      var jumpHandled = false;
      function jumpGuard() {
        if (jumpHandled) return;
        if (nowPath() === menuPath && startPath !== menuPath) {
          jumpHandled = true; finished = true; stopWatch = null;
          rememberFailure(); clearNote();
          console.warn("[fx] Cargo's menu did not open as an overlay (Cargo took the link as an ordinary page: the address changed to " + location.pathname + ") - going back and showing the built-in menu instead. In Cargo, check that the site menu page is set to Overlay (right-click it in the Pages panel) and that the MENU link was made with Cmd+K > Link to Page.");
          ignoreSyncUntil = performance.now() + 2500;
          if (open && viaCargo) ownOpen();   // the visitor still wants a menu; if they closed it already, leave it closed
          busy = true;
          return undoJump(startUrl, startLen, p0, r0, function () { busy = false; });
        }
        if (performance.now() - t0 < JUMP_WATCH_MS) setTimeout(jumpGuard, 40);
      }
      noteAttempt(startUrl);
      viaCargo = true; busy = true; showState(true);
      // Cargo's own handler runs first; a click it did not take must not turn into the browser leaving the page
      function guard(e) { if (!e.defaultPrevented) e.preventDefault(); }
      function unguard() { document.removeEventListener("click", guard); window.removeEventListener("click", guard); }
      document.addEventListener("click", guard);   // on document too: it still runs when a handler there stops the click from reaching window
      window.addEventListener("click", guard);
      try { link.click(); } catch (err) { unguard(); return bail("the link could not be clicked"); }
      unguard();
      // a menu page Cargo keeps around (hidden) must slide in again each time
      var again = cargoEl();
      if (again) [again, again.querySelector(".page-layout")].forEach(function (n) { if (n) { n.style.animation = "none"; void n.offsetWidth; n.style.animation = ""; } });
      jumpGuard();
      (function watch() {
        if (finished) return;
        var t = performance.now(), path = nowPath();
        if (jumpHandled) return;
        if (path === menuPath && startPath !== menuPath) return;   // the jump guard deals with it
        if (path !== startPath) return stop();   // the visitor (or Cargo) went on to another page: not ours to judge
        if (cargoShown()) {
          everShown = true; busy = false;        // up: the visitor may already close it
          if (!shownSince) shownSince = t;
          if (!settled && t - shownSince >= SETTLE_MS) { settled = true; clearNote(); }
        } else {
          shownSince = 0;
          if (everShown) return stop();          // it came up and then went away (closed by the visitor or by Cargo)
          if (t - t0 > OPEN_WAIT_MS) return bail("it did not appear");
        }
        if (t - t0 > WATCH_MS) return stop();
        setTimeout(watch, 40);
      })();
    }
    function closeMenu() {
      if (busy || !open) return;
      if (stopWatch) stopWatch();
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
    // The menu can also be opened/closed by Cargo itself (a click outside it, a link inside it, a visit
    // straight to its address...): keep the icon in step with what stays on screen.
    var diffSince = 0;
    function syncMenuState() {
      if (busy || performance.now() < ignoreSyncUntil) return;
      var real = cargoShown();
      if ((!viaCargo && !real) || real === open) { diffSince = 0; return; }
      var t = performance.now();
      if (!diffSince) diffSince = t;
      if (t - diffSince < 250) return;   // Cargo's own transitions: only follow what stays
      diffSince = 0;
      viaCargo = true;
      showState(real);
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
      e.stopPropagation();   // the click that opens the menu must not reach Cargo's "click outside" and close it again
      var was = wasOpen !== null ? wasOpen : (open || cargoShown());
      wasOpen = null;
      if (was) { if (!open) open = true; closeMenu(); } else openMenu();
    });
    // Built-in menu only: clicking the darkened page, or a link inside, closes it. (Cargo's own menu
    // closes itself on those; the sync above keeps the icon right.)
    document.addEventListener("click", function (e) {
      if (e.isTrusted && open && !viaCargo && !burger.contains(e.target) && !panel.contains(e.target)) closeMenu();
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (!e.fxOwn && open && e.key === "Escape") { closeMenu(); burger.focus(); }
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
    refreshNav = function () { syncMenuState(); themeMenu(); refreshHamburger(); };
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
    console.log("[fx] navigation + cursor v33 loaded");
    keepInSync();
    whenStyled(fxNav);
    fxCursor();
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
