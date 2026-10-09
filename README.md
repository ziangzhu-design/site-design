# site-design

Custom CSS/JS for https://ziangzhu.site (Cargo 3), loaded through jsDelivr.

## Files
- `site.css` - styles
- `site.js` - behavior

## What's in it
- **Navigation bar** - fixed to the top with a hamburger on the right. The hamburger changes
  color to stand out from the page background (the list is `HAMBURGER_COLORS` at the top of
  `site.js`): olive page -> tan hamburger, tan page -> olive hamburger, near-black page ->
  sienna hamburger, sienna page -> near-black hamburger. Any other background keeps it white.
  The page content starts below the bar (a small gutter), and the page background behind that
  gutter is matched to Cargo's wallpaper color.
- **Site menu** - the hamburger opens and closes the "site menu" page designed in Cargo (an
  overlay, address `/site-menu`). Clicking it turns the hamburger into an X and the page slides in
  from the right over a darkened page; clicking the X (or Escape) slides it back out. `site.js`
  opens it the way a link to it would (it clicks a link to `/site-menu` on the page if there is
  one, or a text link "MENU"; otherwise it follows the address itself), and closes it with a text
  link "CLOSE" if there is one, or by Escape / a click outside it / following the link again. The
  names are `CARGO_MENU` at the top of `site.js`. The slide animation is in `site.css` (the
  overlay's id `E3223264275`, `--fx-menu-ms`); keep the overlay's own transition in Cargo on the
  default.
  If Cargo's menu does not open within a moment, the hamburger shows a built-in copy of the menu
  instead (`MENU_HTML` in `site.js`, look in `--fx-menu-*` in `site.css`), and writes
  "Cargo's menu did not open" to the browser console, so the button never goes dead.
- **Custom cursor** - white breathing ball (mouse devices only) that grows over clickable
  things and inverts over text, images, the clock, the hamburger and horizontal rules. Over
  expandable images (where the browser would show its zoom-in / zoom-out cursor) it morphs into
  a square, with the same breathing and inverting. It also looks inside Cargo's own components
  (gallery, columns, clock), which keep part of their content in an open "shadow" layer.

## Loading it in Cargo
Paste these two lines into Cargo's site-wide HTML panel, replacing `COMMIT` with the latest
commit id (a fixed id avoids stale cached copies):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ziangzhu-design/site-design@COMMIT/site.css">
<script src="https://cdn.jsdelivr.net/gh/ziangzhu-design/site-design@COMMIT/site.js" defer></script>
```
