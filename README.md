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
- **Site menu** - the hamburger opens and closes the "site menu" page designed in Cargo (set as an
  Overlay in Cargo: right-click the page in the Pages panel > Overlay). Clicking it turns the
  hamburger into an X and the page slides in from the right over a darkened page; clicking the X
  (or Escape) slides it back out.
  - **Opening:** `site.js` clicks a link that was made in Cargo's own editor (Cmd+K > Link to Page >
    site menu, on a pinned page): found by its address (`/site-menu`), or by its text, `MENU`. It
    never builds an address of its own - Cargo takes a plain address for an ordinary page and jumps
    to it. After the click it watches the address for about two seconds; if Cargo went to the menu
    as an ordinary page, or ignored the click, that is undone (exactly as far as Cargo's router took
    it) and the built-in menu is shown instead, with a line in the browser console saying why. With
    no such link at all the built-in menu opens straight away.
  - **Closing:** a link `CLOSE` inside the menu page (Cmd+K > Navigate > Close Overlay; an icon works
    if its aria-label or title says "close") if there is one, else Escape, else a click outside it.
    It never follows a link to a page. The names are `CARGO_MENU` at the top of `site.js`; the slide
    animation is in `site.css` (the overlay's id `E3223264275`, `--fx-menu-ms`). Keep the overlay's
    own transition in Cargo on the default.
  - **The built-in copy** (`MENU_HTML` in `site.js`, look in `--fx-menu-*` in `site.css`) is also what
    shows if Cargo's menu does not open, so the button never goes dead. After a failed attempt the
    built-in menu is used straight away for a minute (kept in `sessionStorage`).
  - **Text size:** big - `--fx-menu-font` at the top of `site.css` (36px on a phone, 58px at 1440px
    wide, 72px at most); it replaces the size of Cargo's text style.
  - **Links:** ABOUT goes to `/about-me` and WORKS to `/home` (`MENU_LINKS` at the top of `site.js`; the
    word `WORK` also matches, whole words only, in any capitals). A link looks exactly like the text round
    it: the same color and no underline. In the built-in menu they are real links. In Cargo's own menu page
    the words are Cargo's text, which `site.js` never edits or restyles: it lays a real, invisible link
    exactly over each word in a layer of its own, so they work with a click or tap, the keyboard (Tab,
    Enter, with a focus ring), screen readers, middle- and ctrl-click and the context menu. If you make
    real links in Cargo instead (select the word, Cmd+K > Link to Page), those are left alone and look the
    same (no underline, the text's own color).
  - **Colors:** they follow the site background (the `.wallpaper`), with the same pairs as the
    hamburger (`HAMBURGER_COLORS`): the menu takes the background's own color and its text and lines
    take the partner color - #5E6B4E background: #D6C6B0 text and lines, #D6C6B0: #5E6B4E,
    #2B2A28: #A0522D, #A0522D: #2B2A28. Any other background leaves the menu as designed in Cargo.
- **Clock in the menu** - at the bottom of the site menu, drawn from the artwork: an analog face
  (olive tile, twelve tan dots on one true circle at the hour positions, centered in the tile, near-black hour and minute hands with round tails, a thin tan second hand)
  next to a near-black panel with the digital time (`02:35PM`) and the date (`DEC 1st`), set in
  Inter Semibold. It shows the visitor's own local time; the hands sweep continuously (once a second
  for visitors whose device asks for less motion). It has a very soft, centered drop shadow
  (`--fx-clock-shadow` at the top of `site.css`), slides in and out with the menu, never takes a
  click, and is hidden on screens 520px tall or less. A longer date ("OCT 10th") is made just small
  enough to fit. The time, line and date sit a little smaller in the middle of their panel for more
  breathing room (`--fx-clock-text-scale` at the top of `site.css`: 1 = the artwork's size, smaller = more
  space), and the dot beside the date fades out and in (`--fx-clock-blink`, 2s; steady for visitors who
  ask for less motion, paused while the menu is closed). The font is Inter 600 from jsDelivr's copy of the npm package `@fontsource/inter`
  (SIL Open Font License), declared as "FX Inter" in `site.css`. The drawing is built in `site.js`
  (design units 1003 x 442, measured from the artwork); the colors are in `site.css`.
  The clock's colors change with the color of the menu (the site background): the artwork's own set
  for the tan menu and for any other background, and a set for each of the olive, near-black and
  sienna menus - olive menu: tan face, olive dots, sweeping hand and middle dot; near-black menu: sienna
  face, near-black dots, sweeping hand and middle dot, tan hour and minute hands, olive center block,
  tan digital panel with olive time, line, date and dot; sienna menu: the same but with a near-black face
  and sienna dots, sweeping hand and middle dot. They are the `--fx-clock-*` colors in `site.css`
  (site.js puts the menu's color on `<html>` as `data-fx-menu-bg`).
- **Custom cursor** - white breathing ball (mouse devices only) that grows over clickable
  things and inverts over text, images, Cargo's own clock, the clock in the menu, the hamburger and
  horizontal rules. Over
  expandable images (where the browser would show its zoom-in / zoom-out cursor) it morphs into
  a square, with the same breathing and inverting. The color flip is instant (no fade between the
  white and the inverted ball); only the cursor's first appearance, its growth over links and the
  circle-to-square change are animated. It also looks inside Cargo's own components
  (gallery, columns, clock), which keep part of their content in an open "shadow" layer.

## Loading it in Cargo
Paste these two lines into Cargo's site-wide HTML panel, replacing `COMMIT` with the latest
commit id (a fixed id avoids stale cached copies):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ziangzhu-design/site-design@COMMIT/site.css">
<script src="https://cdn.jsdelivr.net/gh/ziangzhu-design/site-design@COMMIT/site.js" defer></script>
```
