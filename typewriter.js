/* Typewriter - loaded into Cargo through jsDelivr, as its OWN script (see README.md).
   On the home page the two title sentences type themselves out, letter by letter, each letter fading in: each sentence
   in one second, with an uneven, human rhythm (small hesitations, a breath after a comma or a line end, the odd quick
   run of letters). The first sentence types as the page appears, the second right after it (or when it is scrolled to).
   The image above the first sentence fades in at the same time, over half a second (once it has loaded, so it never
   pops in half-way).

   It stands completely on its own: it does not touch site.js, pagefade.js, the hamburger, the menu, the clock or the
   cursor. It never moves anything: every letter keeps its place from the start (it is only see-through until its turn),
   so the layout never shifts. Everything in it is wrapped so that whatever goes wrong, the text simply shows as it
   always does. Plain ES5, so it parses everywhere. */
(function () {
  "use strict";

  // ---- what can be set here ------------------------------------------------------------------------------
  // The sentences to type, in order, as they read on the page (capitals, spaces, punctuation and line breaks do not
  // matter: they are found by their letters and numbers). Punctuation right after a sentence types with it.
  var SENTENCES = [
    "ZIANGZHU... is a multidisciplinary graphic designer",
    "Who constructs bridges between curiosities, identities, and aesthetics"
  ];
  var PAGE_URL = "home";     // only on this page (the page's address in Cargo, without the slash)
  var DURATION = 1000;       // ms each sentence takes, from its first letter starting to its last letter fully there
  var FADE = 170;            // ms each letter takes to fade in
  var PAUSE = 180;           // ms between the end of one sentence and the start of the next
  var IMAGE_FADE = 500;      // ms the image above the first sentence takes to fade in (as the page appears, once it has loaded)
  var IMAGE_WAIT = 3000;     // ms to wait at most for that image to load before it fades in anyway
  // ----------------------------------------------------------------------------------------------------------

  var CHAR = "fx-tw-c", ON = "fx-tw-on", WRAP = "fx-tw";
  var pics = [];
  var view = 0, lastPath = "", items = [], timer = 0, raf = 0, later = 0, off = false, styled = false;

  function warn(e) { try { console.warn("[fx] typewriter stopped:", e); } catch (x) {} }

  // ---- finding the sentences --------------------------------------------------------------------------------
  function isWord(ch) { return /[0-9a-zÀ-ɏ]/.test(ch); }
  function key(s) { var out = "", t = s.toLowerCase(); for (var i = 0; i < t.length; i++) if (isWord(t.charAt(i))) out += t.charAt(i); return out; }
  function textNodes(root) {
    var out = [], w = document.createTreeWalker(root, 4 /* text */, null), n;
    while ((n = w.nextNode())) {
      var p = n.parentNode;
      if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(p.nodeName)) continue;
      out.push(n);
    }
    return out;
  }
  // Where a sentence is: [{ node, from, to }] - the parts of the text nodes it covers, in order; null if it is not there
  function locate(root, sentence) {
    var want = key(sentence);
    if (!want) return null;
    var nodes = textNodes(root), chars = [], k = "";
    for (var a = 0; a < nodes.length; a++) {
      var t = nodes[a].nodeValue.toLowerCase();
      for (var i = 0; i < t.length; i++) if (isWord(t.charAt(i))) { chars.push({ n: a, i: i }); k += t.charAt(i); }
    }
    var at = k.indexOf(want);
    if (at < 0) return null;
    var first = chars[at], last = chars[at + want.length - 1];
    var endN = last.n, endI = last.i + 1;
    // punctuation right after the sentence (a period, a closing quote ...) types with it
    (function () {
      for (var b = endN; b < nodes.length; b++) {
        var v = nodes[b].nodeValue, j = b === endN ? endI : 0;
        while (j < v.length && /[.,;:!?…)\]"'”’]/.test(v.charAt(j))) j++;
        if (j > (b === endN ? endI : 0)) { endN = b; endI = j; }
        if (j < v.length) return;
      }
    })();
    var parts = [];
    for (var c = first.n; c <= endN; c++) {
      var from = c === first.n ? first.i : 0, to = c === endN ? endI : nodes[c].nodeValue.length;
      if (to > from) parts.push({ node: nodes[c], from: from, to: to });
    }
    return parts;
  }

  // ---- getting a sentence ready: every letter in its own span, see-through, in its place ---------------------
  function prepare(parts) {
    var steps = [], wraps = [], lastNode = null;
    for (var p = 0; p < parts.length; p++) {
      var part = parts[p], node = part.node, text = node.nodeValue, w = document.createElement("span");
      if (node.parentNode && node.parentNode.isContentEditable) break;   // (text being edited is never touched)
      w.className = WRAP;
      if (lastNode && brBetween(lastNode, node)) steps.push({ el: null, ch: "\n" });   // a line break: a breath
      if (part.from > 0) w.appendChild(document.createTextNode(text.slice(0, part.from)));
      var space = "";
      for (var i = part.from; i < part.to; i++) {
        var ch = text.charAt(i);
        if (/\s/.test(ch)) { space += ch; continue; }
        if (space) { w.appendChild(document.createTextNode(space)); steps.push({ el: null, ch: " " }); space = ""; }
        var s = document.createElement("span");
        s.className = CHAR;
        s.textContent = ch;
        w.appendChild(s);
        steps.push({ el: s, ch: ch });
      }
      if (space) { w.appendChild(document.createTextNode(space)); steps.push({ el: null, ch: " " }); }
      if (part.to < text.length) w.appendChild(document.createTextNode(text.slice(part.to)));
      node.parentNode.replaceChild(w, node);
      wraps.push({ wrap: w, orig: node });
      lastNode = w;
    }
    return { steps: steps, wraps: wraps };
  }
  function brBetween(a, b) {   // is there a <br> between these two nodes (in document order)?
    var w = document.createTreeWalker(document.body, 1 | 4, null), n, seen = false;
    w.currentNode = a;
    while ((n = w.nextNode())) {
      if (n === b) return seen;
      if (n.nodeName === "BR") seen = true;
    }
    return false;
  }

  // ---- the rhythm: uneven, like a hand on a keyboard, fitted to DURATION ----------------------------------------
  function schedule(steps) {
    var t = 0, times = [], prev = "", lastVisible = -1;
    for (var i = 0; i < steps.length; i++) {
      var ch = steps[i].ch, w;
      if (ch === "\n") w = 1.9;
      else if (ch === " ") w = 0.85 + Math.random() * 0.5;
      else {
        w = 0.55 + Math.random() * 0.9;                 // each key a little different
        var r = Math.random();
        if (r < 0.07) w *= 2.1;                          // a small hesitation now and then
        else if (r < 0.2) w *= 0.55;                     // a quick run of letters now and then
      }
      if (/[,.;:!?…]/.test(prev) && ch !== prev) w *= 2.2;   // a breath after punctuation
      if (i > 0) t += w;
      times.push(t);
      if (steps[i].el) lastVisible = i;
      prev = ch;
    }
    var span = lastVisible > 0 ? times[lastVisible] : 1, k = (DURATION - FADE) / span;
    for (var j = 0; j < times.length; j++) steps[j].at = Math.round(times[j] * k);
  }

  // ---- when a sentence may start: on screen, the page shown (Cargo fades the page in), no page-change veil -----------
  function minOpacity(el) {
    var m = 1;
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) m = Math.min(m, parseFloat(getComputedStyle(e).opacity));
    return m;
  }
  function onScreen(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < (window.innerHeight || 0) && r.right > 0 && r.left < (window.innerWidth || 0);
  }
  function veilUp() {
    var v = document.getElementById("fx-fade");
    return !!v && parseFloat(getComputedStyle(v).opacity) > 0.3;
  }
  function ready(item, now) {
    var el = item.steps.length && item.steps[0].el ? item.steps[0].el.parentNode : null;
    if (!el || !el.isConnected) return false;
    var seen = onScreen(el) && minOpacity(el) >= 0.05 && !veilUp();
    if (!seen) { item.seenAt = 0; return false; }
    if (!item.seenAt) item.seenAt = now;
    return now - item.seenAt >= 120;   // (the page is still fading in: let it get going)
  }

  // ---- the run: one loop for everything, revealing the letters whose time has come -------------------------------
  function pump() {
    raf = 0;
    later = 0;
    try {
      var now = performance.now(), busy = false, typing = false, waiting = false;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.state === "done") continue;
        busy = true;
        if (!connected(it)) { it.state = "done"; restore(it); it.page.__fxTwView = -1; continue; }   // (Cargo put new text in: the next look starts over on it)
        if (it.state === "wait") {
          var seen = it.el && onScreen(it.el);
          if (!seen) it.onAt = 0;
          else if (!it.onAt) it.onAt = now;
          else if (now - it.onAt > 6000) { finish(it); continue; }   // (never left hidden on the screen)
          var before = i > 0 && items[i - 1].page === it.page ? items[i - 1] : null;
          if (before && before.state === "wait" && seen && !(before.el && onScreen(before.el))) finish(before);   // (the sentence before is off the screen: it just shows, this one types)
          if (before && before.state !== "done") { waiting = true; continue; }
          if (before && before.doneAt && now - before.doneAt < PAUSE) { waiting = true; continue; }
          if (!ready(it, now)) { waiting = true; continue; }
          it.state = "typing";
          it.t0 = now;
        }
        if (it.state === "typing") {
          typing = true;
          var t = now - it.t0;
          while (it.next < it.steps.length && it.steps[it.next].at <= t) {
            var st = it.steps[it.next++];
            if (st.el) st.el.className = CHAR + " " + ON;
          }
          if (it.next >= it.steps.length && t >= DURATION) finish(it);
        }
      }
      for (var q = 0; q < pics.length; q++) {
        var pic = pics[q];
        if (pic.state === "done") continue;
        busy = true;
        if (!pic.el.isConnected) { pic.state = "done"; continue; }
        if (pic.state === "wait") {
          var shown = onScreen(pic.el) && (!pic.el.parentElement || minOpacity(pic.el.parentElement) >= 0.05) && !veilUp();
          if (!shown) { pic.seenAt = 0; continue; }
          if (!pic.seenAt) pic.seenAt = now;
          var waited = now - pic.seenAt;
          if (waited < 120 || (!picLoaded(pic.el) && waited < IMAGE_WAIT)) continue;   // (with the first sentence, and once the picture is really there)
          pic.el.style.transition = "opacity " + IMAGE_FADE + "ms ease-out";
          pic.el.style.opacity = "1";
          pic.state = "fading";
          pic.t0 = now;
        } else if (pic.state === "fading" && now - pic.t0 >= IMAGE_FADE + 60) restorePic(pic);
      }
      if (busy) {
        if (typing) raf = requestAnimationFrame(pump);
        else later = setTimeout(pump, 100);   // (only waiting - for the page to show, or to be scrolled to: look a little less often)
      }
    } catch (e) { warn(e); showAll(); }
  }
  function kick() {
    if (off) return;
    if (raf) return;
    if (later) { clearTimeout(later); later = 0; }
    raf = requestAnimationFrame(pump);
  }
  function connected(it) { for (var i = 0; i < it.wraps.length; i++) if (!it.wraps[i].wrap.isConnected) return false; return true; }
  function finish(it) {   // all there: the letters become plain text again, exactly as before
    it.state = "done";
    it.doneAt = performance.now();
    for (var i = 0; i < it.steps.length; i++) if (it.steps[i].el) it.steps[i].el.className = CHAR + " " + ON;
    setTimeout(function () { try { restore(it); } catch (e) {} }, FADE + 60);
  }
  function restore(it) {
    for (var i = 0; i < it.wraps.length; i++) {
      var w = it.wraps[i];
      if (w.wrap.parentNode) w.wrap.parentNode.replaceChild(w.orig, w.wrap);
    }
  }
  // ---- the image above the first sentence: see-through until the page shows (and the image has loaded), then it fades in
  function picLoaded(el) {
    var img = el.tagName === "IMG" ? el : (el.shadowRoot && el.shadowRoot.querySelector("img")) || el.querySelector("img");
    if (!img) return !!(el.shadowRoot || el.querySelector("video, svg, canvas"));   // (not an <img>: nothing to wait for)
    var src = img.currentSrc || img.src || "";
    return img.complete && img.naturalWidth > 2 && !/^data:/.test(src);   // (Cargo first shows a 1x1 placeholder)
  }
  function preparePics(page, root, anchor) {
    pics.forEach(function (pic) { if (pic.page === page && pic.state !== "done") restorePic(pic); });
    var all = root.querySelectorAll("media-item, img");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.tagName === "IMG" && el.closest("media-item")) continue;
      if (!(anchor.compareDocumentPosition(el) & 2 /* before it */)) continue;
      pics.push({ page: page, el: el, orig: el.getAttribute("style"), state: "wait", seenAt: 0 });
      el.style.transition = "none";
      el.style.opacity = "0";
    }
  }
  function restorePic(pic) {   // as it was: the style attribute exactly as Cargo left it
    pic.state = "done";
    if (pic.orig === null) pic.el.removeAttribute("style"); else pic.el.setAttribute("style", pic.orig);
  }
  function showAll() {   // whatever went wrong: everything shows, as it always does
    off = true;
    for (var k = 0; k < pics.length; k++) { try { if (pics[k].state !== "done") restorePic(pics[k]); } catch (e) {} }
    for (var i = 0; i < items.length; i++) { try { items[i].state = "done"; restore(items[i]); } catch (e) {} }
    try { var left = document.querySelectorAll("." + CHAR); for (var j = 0; j < left.length; j++) left[j].className = CHAR + " " + ON; } catch (e) {}
  }

  // ---- finding the home page and getting its sentences ready (also when Cargo puts the page in again) -----------------
  function current(page) {   // the page is the one being visited, and shown (not one on its way out)
    var path = location.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/" + PAGE_URL && path !== "/") return false;
    var cs = getComputedStyle(page);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }
  function editing(el) {
    if (document.designMode === "on" || el.isContentEditable) return true;
    try { if (window.self !== window.top) return true; } catch (e) { return true; }   // (inside a frame, e.g. Cargo's editor)
    return !!(el.querySelector && el.querySelector("[contenteditable]:not([contenteditable='false'])"));
  }
  function scan() {
    if (off) return;
    try {
      if (location.pathname !== lastPath) { lastPath = location.pathname; view++; }
      var pages = document.querySelectorAll('.page[page-url="' + PAGE_URL + '"]');
      for (var p = 0; p < pages.length; p++) {
        var page = pages[p], root = page.querySelector(".page-content") || page;
        if (editing(root) || !current(page)) continue;
        var mine = items.filter(function (it) { return it.page === page && it.state !== "done"; });
        if (mine.length && mine.every(connected) && page.__fxTwView === view) continue;   // (typing, or waiting to, in this visit)
        if (!mine.length && page.__fxTwView === view) continue;                         // (typed already in this visit)
        mine.forEach(function (it) { it.state = "done"; restore(it); });   // (left from an earlier visit, or Cargo put new text in: start over)
        page.__fxTwView = view;
        for (var s = 0; s < SENTENCES.length; s++) {
          var parts = locate(root, SENTENCES[s]);
          if (!parts || !parts.length) continue;
          if (s === 0 && page.__fxPicView !== view) {   // (once per visit: not again when Cargo only puts new text in)
            page.__fxPicView = view;
            try { preparePics(page, root, parts[0].node); } catch (e) { warn(e); }
          }
          if (parts[0].node.parentNode && parts[0].node.parentNode.closest && parts[0].node.parentNode.closest("." + WRAP)) continue;
          var made = prepare(parts);
          if (!made.steps.length) { restore(made); continue; }
          schedule(made.steps);
          var first = made.steps[0].el || (made.steps[1] && made.steps[1].el);
          items.push({ page: page, steps: made.steps, wraps: made.wraps, state: "wait", next: 0, preparedAt: performance.now(), seenAt: 0, el: first ? first.parentNode : null });
        }
      }
      items = items.filter(function (it) { return it.state !== "done" || (it.doneAt && performance.now() - it.doneAt < 1000); });
      pics = pics.filter(function (pic) { return pic.state !== "done"; });
      if (items.length || pics.length) kick();
    } catch (e) { warn(e); showAll(); }
  }

  function start() {
    try {
      if (!document.body) return;
      try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch (x) {}
      if (!styled) {
        var st = document.createElement("style");
        st.id = "fx-tw-style";
        st.textContent = "." + CHAR + "{opacity:0;transition:opacity " + FADE + "ms ease-out;}" + "." + CHAR + "." + ON + "{opacity:1;}" +
          "@media print{." + CHAR + "{opacity:1 !important;}}";
        (document.head || document.documentElement).appendChild(st);
        styled = true;
      }
      // arriving late (the page is already showing, e.g. a slow download of this file): this visit is left as it is
      if (parseFloat(getComputedStyle(document.body).opacity) >= 0.5) {
        lastPath = location.pathname;
        var shownNow = document.querySelectorAll('.page[page-url="' + PAGE_URL + '"]');
        for (var k = 0; k < shownNow.length; k++) shownNow[k].__fxTwView = view;
      }
      scan();
      // Cargo puts pages in (and changes them) as the visitor moves around the site: look again whenever the page changes
      new MutationObserver(function () { scan(); }).observe(document.body, { childList: true, subtree: true });
      timer = setInterval(scan, 400);   // (a page shown again without being put in anew)
    } catch (e) { warn(e); showAll(); }
  }

  if (window.__fxTypewriterLoaded) return;
  window.__fxTypewriterLoaded = true;
  try {
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
  } catch (e) { warn(e); }
})();
