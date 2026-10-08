# site-design

Custom CSS/JS for https://ziangzhu.site (Cargo 3), loaded through jsDelivr.

## Files
- `site.css` - styles
- `site.js` - behavior

## What's in it
- **Navigation bar** - fixed to the top. Logo placeholder on the left, hamburger on the
  right. White icons that invert against the page. The hamburger opens a small menu whose
  links are the `NAV_LINKS` list at the top of `site.js`.
- **Custom cursor** - white breathing ball (mouse devices only) that grows over clickable
  things and inverts over text, images and the clock.

## Loading it in Cargo
Paste these two lines into Cargo's site-wide HTML panel, replacing `COMMIT` with the latest
commit id (a fixed id avoids stale cached copies):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ziangzhu-design/site-design@COMMIT/site.css">
<script src="https://cdn.jsdelivr.net/gh/ziangzhu-design/site-design@COMMIT/site.js" defer></script>
```
