/* Portfolio effects (navigation bar + custom cursor) - loaded into Cargo via jsDelivr */
(function () {
  if (window.__fxLoaded) return;
  window.__fxLoaded = true;

  // ===========================================================================
  // 1) NAVIGATION BAR - fixed to the top, hamburger on the right. The hamburger's color
  //    follows the page's background color.
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

  // Pages listed in the hamburger menu. Add more like: { label: "Work", href: "/work" }
  var NAV_LINKS = [
    { label: "Home", href: "/" }
  ];

  function fxNav() {
    function mk(tag, cls) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      return e;
    }

    // --- reading colors from the page ---
    function parseColor(str) {
      if (!str || str.indexOf("color(") === 0) return null;
      var n = str.match(/[\d.]+/g);
      if (!n || n.length < 3) return null;
      var a = n.length > 3 ? parseFloat(n[3]) : 1;
      if (a > 1) a = a / 100;
      return { r: +n[0], g: +n[1], b: +n[2], a: a };
    }
    function lum(c) {
      function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
      return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
    }
    function contrast(a, b) {
      var l1 = lum(a), l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
    function rgb(c) { return "rgb(" + c.r + "," + c.g + "," + c.b + ")"; }
    function fromHex(h) {
      var n = parseInt(h.slice(1), 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    // The page's background color. Checked from the page-specific background layer Cargo draws
    // (.backdrop) down to the body; of several matching elements the last one wins (it is
    // painted on top), and one that is hidden or doesn't reach the hamburger is ignored.
    // null if no background color is found.
    function pageBackground() {
      var r = burger.getBoundingClientRect();
      var px = r.left + r.width / 2, py = r.top + r.height / 2;
      var spots = [".backdrop", ".page", ".pages", ".content", "body", "html"];
      for (var i = 0; i < spots.length; i++) {
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
      if (document.hidden) return;
      var bg = pageBackground();
      var icon = bg ? hamburgerFor(bg) : DEFAULT_HAMBURGER;
      if (icon === lastIcon) return;
      lastIcon = icon;
      nav.style.setProperty("--fx-nav-auto", icon);
    }

    // --- the menu panel copies the page's background, text color and font ---
    function paintMenu() {
      var bg = pageBackground() || { r: 255, g: 255, b: 255 };
      var sample = document.querySelector("[class^='cmtext'], [class^='cmtitle'], [class*=' cmtext'], [class*=' cmtitle']") || document.body;
      var cs = getComputedStyle(sample);
      var fg = parseColor(cs.color);
      if (!fg || contrast(fg, bg) < 3) fg = lum(bg) > 0.4 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
      menu.style.setProperty("--fx-menu-bg", rgb(bg));
      menu.style.setProperty("--fx-menu-fg", rgb(fg));
      if (cs.fontFamily) menu.style.setProperty("--fx-menu-font", cs.fontFamily);
    }

    // --- build the bar ---
    var nav = mk("nav", "fx-nav");
    nav.setAttribute("aria-label", "Main");

    var burger = mk("button", "fx-nav-burger");
    burger.type = "button";
    burger.setAttribute("aria-label", "Open menu");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-controls", "fx-menu");
    burger.innerHTML = '<span class="fx-burger"><span></span><span></span><span></span></span>';

    nav.appendChild(burger);

    // --- build the menu panel ---
    var menu = mk("div", "fx-menu");
    menu.id = "fx-menu";
    var list = mk("ul");
    NAV_LINKS.forEach(function (item) {
      var li = mk("li");
      var a = mk("a", "fx-menu-link");
      a.href = item.href;
      a.textContent = item.label;
      li.appendChild(a);
      list.appendChild(li);
    });
    menu.appendChild(list);

    // --- open / close ---
    var open = false;
    function setOpen(on) {
      if (on === open) return;
      open = on;
      if (on) paintMenu();
      menu.classList.toggle("fx-open", on);
      burger.setAttribute("aria-expanded", on ? "true" : "false");
      burger.setAttribute("aria-label", on ? "Close menu" : "Open menu");
    }
    burger.addEventListener("click", function () { setOpen(!open); });
    menu.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("click", function (e) {
      if (open && !menu.contains(e.target) && !burger.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (open && e.key === "Escape") { setOpen(false); burger.focus(); }
    });

    document.body.appendChild(nav);
    document.body.appendChild(menu);

    // The first color is applied without a fade, so the bar never flashes in the wrong color.
    nav.classList.add("fx-nav-still");
    refreshHamburger();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { nav.classList.remove("fx-nav-still"); });
    });

    // Cargo changes the background without telling us (page swaps, fades), so keep checking.
    window.addEventListener("load", refreshHamburger);
    document.addEventListener("visibilitychange", refreshHamburger);
    setInterval(refreshHamburger, 400);
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
    function overText(px, py) {
      var els = [];
      collect(document, px, py, els, 0);
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el === document.documentElement || el === document.body) continue;
        // Images and video: the whole picture counts
        if (isRealMedia(el)) return true;
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
    console.log("[fx] navigation + cursor v18 loaded");
    whenStyled(fxNav);
    fxCursor();
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
