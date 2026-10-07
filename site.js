/* Custom cursor - loaded into Cargo via jsDelivr */
(function () {
  if (window.__fxLoaded) return;
  window.__fxLoaded = true;

  // Only on devices with a real mouse; touch screens keep default behavior
  if (window.matchMedia("(hover: none)").matches) return;

  console.log("[fx] custom cursor v12 loaded");

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
  var MEDIA = /^(IMG|VIDEO|CANVAS|PICTURE)$/;
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
  function overText(px, py) {
    var els = [];
    collect(document, px, py, els, 0);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el === document.documentElement || el === document.body) continue;
      // Images and video: the whole picture counts
      if (MEDIA.test(el.tagName)) return true;
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
})();
