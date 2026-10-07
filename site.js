/* Custom cursor - loaded into Cargo via jsDelivr */
(function () {
  if (window.__fxLoaded) return;
  window.__fxLoaded = true;

  // Only on devices with a real mouse; touch screens keep default behavior
  if (window.matchMedia("(hover: none)").matches) return;

  console.log("[fx] custom cursor v8 loaded");

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
  // Extra things that should invert too: the clock widget (by name), canvas drawings, clock embeds
  var REFLECT = "[class*='clock' i], [id*='clock' i], [data-clock], canvas, iframe[src*='clock' i], [class^='cmtext'], [class^='cmtitle'], [class*=' cmtext'], [class*=' cmtitle']";
  function overReflect(px, py) {
    var stack = document.elementsFromPoint(px, py);
    for (var i = 0; i < stack.length; i++) {
      if (stack[i].matches && stack[i].matches(REFLECT)) return true;
      if (stack[i].closest && stack[i].closest(REFLECT)) return true;
    }
    return false;
  }

  var NOT_TEXT = /^(IMG|VIDEO|CANVAS|SVG|IFRAME|HTML|BODY)$/;
  function overText(t) {
    if (!t || NOT_TEXT.test(t.tagName)) return false;
    for (var n = t.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.nodeValue.trim()) return true;
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
    document.documentElement.classList.toggle("fx-over-text", overText(t) || overReflect(x, y));
    setClass("fx-link", !!(t && t.closest && t.closest(CLICKABLE)));
  }, { passive: true });

  document.addEventListener("mousedown", function () { setClass("fx-down", true); });
  document.addEventListener("mouseup", function () { setClass("fx-down", false); });
  document.documentElement.addEventListener("mouseleave", function () { setClass("fx-visible", false); });
  document.documentElement.addEventListener("mouseenter", function () { setClass("fx-visible", true); });
})();
