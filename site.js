/* Custom cursor - loaded into Cargo via jsDelivr */
(function () {
  if (window.__fxLoaded) return;
  window.__fxLoaded = true;

  // Only on devices with a real mouse; touch screens keep default behavior
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  console.log("[fx] custom cursor loaded");

  var CLICKABLE = "a, button, input, select, textarea, label, summary, [role='button'], [onclick]";

  var ball = document.createElement("div");
  ball.className = "fx-cursor";
  ball.innerHTML = '<div class="fx-cursor-inner"></div>';
  document.body.appendChild(ball);

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
    ball.classList.toggle("fx-link", !!(t && t.closest && t.closest(CLICKABLE)));
  }, { passive: true });

  document.addEventListener("mousedown", function () { ball.classList.add("fx-down"); });
  document.addEventListener("mouseup", function () { ball.classList.remove("fx-down"); });
  document.documentElement.addEventListener("mouseleave", function () { ball.classList.remove("fx-visible"); });
  document.documentElement.addEventListener("mouseenter", function () { ball.classList.add("fx-visible"); });
})();
