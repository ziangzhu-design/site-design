/* Portfolio effects (navigation bar + custom cursor) - loaded into Cargo via jsDelivr */
(function () {
  if (window.__fxLoaded) return;
  window.__fxLoaded = true;

  // ===========================================================================
  // 1) NAVIGATION BAR - fixed to the top, hamburger on the right. The hamburger's color
  //    follows the page's background color. Clicking it turns it into an X and back, but it
  //    doesn't open a menu yet: the menu is still being designed (the earlier dropdown is in
  //    the git history, commit f145fa0).
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
  var COLOR_TOLERANCE = 8;   // how far off (in RGB steps) a page color may be and still count as a match

  // --- reading colors from the page (shared by the bar and the background matching) ---
  function parseColor(str) {
    if (!str || str.indexOf("color(") === 0) return null;
    var n = str.match(/[\d.]+/g);
    if (!n || n.length < 3) return null;
    var a = n.length > 3 ? parseFloat(n[3]) : 1;
    if (a > 1) a = a / 100;
    return { r: +n[0], g: +n[1], b: +n[2], a: a };
  }
  function rgb(c) { return "rgb(" + c.r + "," + c.g + "," + c.b + ")"; }
  function fromHex(h) {
    var n = parseInt(h.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  // The site wallpaper's color, wherever the wallpaper sits (Cargo draws the site background
  // there). Of several, the last one is painted on top; a hidden or see-through one is ignored.
  function wallpaperColor() {
    var hosts = document.querySelectorAll(".wallpaper");
    for (var j = hosts.length - 1; j >= 0; j--) {
      var cs = getComputedStyle(hosts[j]);
      var c = parseColor(cs.backgroundColor);
      if (c && c.a > 0.5 && cs.visibility !== "hidden" && parseFloat(cs.opacity) >= 0.05) return c;
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
      var spots = [".backdrop", ".page", ".pages", ".content", ".wallpaper", "body", "html"];
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
          if (!c || c.a <= 0.5 || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.05) continue;
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
    burger.innerHTML = '<span class="fx-burger" data-fx-reflect><span></span><span></span><span></span></span>';

    nav.appendChild(burger);

    // --- open / close: the icon changes between the hamburger and an X ---
    var open = false;
    function setOpen(on) {
      if (on === open) return;
      open = on;
      burger.setAttribute("aria-expanded", on ? "true" : "false");
      burger.setAttribute("aria-label", on ? "Close menu" : "Open menu");
    }
    burger.addEventListener("click", function () { setOpen(!open); });
    document.addEventListener("click", function (e) {
      if (open && !burger.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (open && e.key === "Escape") { setOpen(false); burger.focus(); }
    });

    document.body.appendChild(nav);

    // The first color is applied without a fade, so the bar never flashes in the wrong color.
    nav.classList.add("fx-nav-still");
    refreshHamburger();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { nav.classList.remove("fx-nav-still"); });
    });

    refreshNav = refreshHamburger;   // from now on the shared checker keeps the hamburger in step
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
      var t = e.target;
      document.documentElement.classList.toggle("fx-over-text", overText(x, y));
      setClass("fx-link", !!(t && t.closest && t.closest(CLICKABLE)));
    }, { passive: true });

    document.addEventListener("mousedown", function () { setClass("fx-down", true); });
    document.addEventListener("mouseup", function () { setClass("fx-down", false); });
    document.documentElement.addEventListener("mouseleave", function () { setClass("fx-visible", false); });
    document.documentElement.addEventListener("mouseenter", function () { setClass("fx-visible", true); });
  }

  function start() {
    console.log("[fx] navigation + cursor v24 loaded");
    keepInSync();
    whenStyled(fxNav);
    fxCursor();
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
