/* Custom cursor - loaded into Cargo via jsDelivr */
(function () {
  if (window.__fxLoaded) return;
  window.__fxLoaded = true;

  // Only on devices with a real mouse; touch screens keep default behavior
  if (window.matchMedia("(hover: none)").matches) return;

  console.log("[fx] custom cursor v4 loaded");

  var CLICKABLE = "a, button, input, select, textarea, label, summary, [role='button'], [onclick]";

  var ball = document.createElement("div");
  ball.className = "fx-cursor";
  ball.innerHTML = '<div class="fx-cursor-inner"><div class="fx-cursor-dot"></div></div>';
  document.body.appendChild(ball);

  // True when the pointer is over text (not images/video), so the ball should blend
  var MEDIA = /^(IMG|VIDEO|CANVAS|PICTURE)$/;
  var NOT_TEXT = /^(IMG|VIDEO|CANVAS|SVG|IFRAME|HTML|BODY)$/;
  function overMedia(px, py) {
    var stack = document.elementsFromPoint(px, py);
    for (var i = 0; i < stack.length; i++) {
      if (MEDIA.test(stack[i].tagName) || (stack[i].closest && stack[i].closest("svg"))) return true;
    }
    return false;
  }
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
    ball.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
    requestAnimationFrame(frame);
  }

  document.addEventListener("mousemove", function (e) {
    x = e.clientX;
    y = e.clientY;
    if (!running) {
      running = true;
      cx = x; cy = y;
      document.documentElement.classList.add("fx-cursor-on");
      ball.classList.add("fx-visible");
      frame();
    }
    var t = e.target;
    ball.classList.toggle("fx-text", overText(t) || overMedia(x, y));
    ball.classList.toggle("fx-link", !!(t && t.closest && t.closest(CLICKABLE)));
  }, { passive: true });

  document.addEventListener("mousedown", function () { ball.classList.add("fx-down"); });
  document.addEventListener("mouseup", function () { ball.classList.remove("fx-down"); });
  document.documentElement.addEventListener("mouseleave", function () { ball.classList.remove("fx-visible"); });
  document.documentElement.addEventListener("mouseenter", function () { ball.classList.add("fx-visible"); });
})();
