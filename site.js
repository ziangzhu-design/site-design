/* Portfolio effects - loaded into Cargo via jsDelivr */
(function () {
  if (window.__fxLoaded) return;
  window.__fxLoaded = true;
  console.log("[fx] portfolio effects loaded");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = new WeakSet();

  var io = "IntersectionObserver" in window && !reduce
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("fx-in");
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.1 })
    : null;

  function scan() {
    document.querySelectorAll("img, video, h1, h2, h3").forEach(function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      if (el.tagName === "IMG") el.classList.add("fx-hover");
      if (io) {
        el.classList.add("fx-reveal");
        io.observe(el);
      }
    });
  }

  scan();
  // Cargo loads pages dynamically, so re-scan when content changes
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();
