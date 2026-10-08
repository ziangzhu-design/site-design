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
  Clicking it turns it into an X and back (Escape or a click elsewhere also closes it), but it
  does not open a menu for now - the menu is still being designed (the earlier dropdown is in
  the history at commit `f145fa0`). The page content starts below the bar (a small gutter), and
  the page background behind that gutter is matched to Cargo's wallpaper color.
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
