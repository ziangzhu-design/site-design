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
- **Site menu** - clicking the hamburger turns it into an X and slides a panel in from the right
  over a darkened page; clicking the X, the darkened page or Escape slides it back. The look is
  copied from the "site menu" page designed in Cargo (30% wide, olive, 1.5rem padding, lines
  around the entries; the values are `--fx-menu-*` at the top of `site.css`). The entries are
  `MENU_HTML` at the top of `site.js` - it is a copy, so editing that page in Cargo does not change
  the site menu until `MENU_HTML` is updated. (It is not Cargo's own overlay: Cargo only lets its
  editor link open those, and documents no way to open one from code.)
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
