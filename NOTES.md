# FE-03 — what shadcn/ui handled that I missed

Three components built from scratch against the W3C APG (`playground/`), then
compared against `shadcn@latest add dialog tabs`, which on this version wraps
**Base UI** (`@base-ui/react`) rather than Radix.

13 tests in `test/playground-a11y.test.tsx` cover the patterns I *did*
implement: roles, focus trap, focus return, Escape, roving tabindex, arrow
wrapping, Home/End, manual activation, and `aria-expanded`. The gaps below are
the things those tests did not think to ask about.

---

## 1 · The background is dimmed, not inert — and my own comment claimed otherwise

The worst finding, because the code lied about it. `playground/dialog.tsx`
carried the line:

```
 *  - content behind is hidden from assistive tech
```

It is not. The only `aria-hidden` in the file is on the backdrop `<div>`. Every
link, heading and button on the page behind the dialog stays in the
accessibility tree, so a screen-reader user can walk straight out of the modal
with the virtual cursor and interact with content that is visually dimmed and
unreachable by mouse. The focus trap catches Tab, and Tab only.

Base UI inerts the rest of the document while the dialog is open. Doing it by
hand means walking the body's children and toggling `inert` on each sibling of
the portal root, then restoring them — which is exactly why the primitive
earns its place.

I corrected the comment rather than quietly patching the behaviour: the
assignment asks what the library handled that I missed, and this is the answer.

## 2 · No portal — an ancestor can clip or trap the dialog

`shadcn`'s `DialogContent` renders inside `DialogPortal`, which mounts at the
document body. Mine renders inline where it is used.

`position: fixed` resolves against the nearest ancestor with a `transform`,
`filter`, or `contain` — not the viewport. Drop my dialog inside a card that
animates with `transform`, and it stops centring on the screen and starts
centring on the card. An ancestor with `overflow: hidden` clips it outright.
Neither shows up in a test that renders the component on its own, which is
precisely how I tested it.

## 3 · No `aria-describedby` for the body

shadcn ships a `DialogDescription` wired to the dialog's `aria-describedby`.
Mine sets `aria-labelledby` only, so a screen reader announces "Settings,
dialog" and then says nothing about the body text until the user navigates into
it. The announcement on open is the title alone.

## 4 · Scroll lock without width compensation

I set `document.body.style.overflow = "hidden"` on open. On any platform that
renders a classic scrollbar, removing the scrollbar widens the viewport and the
whole page jumps sideways by ~15px as the dialog opens, then jumps back on
close. Base UI compensates with padding. My version has the layout shift.

## 5 · Tabs are horizontal-only

Base UI's tabs take an `orientation` prop and swap the arrow keys to Up/Down
for vertical tablists. Mine hardcodes ArrowLeft/ArrowRight, so a vertical
tablist built from it would be keyboard-inoperable in the direction users
actually press.

## 6 · Activation mode is hardcoded

I chose manual activation (focus moves, Enter selects) and wrote the reasoning
into a comment. Base UI exposes it as a prop, because the right answer depends
on how expensive the panel is to render — a choice the component should not be
making on the application's behalf.

---

## What I take from this

The gaps split cleanly in two. Items 3, 5 and 6 are *features* — things I knew
about and scoped out. Items 1, 2 and 4 are *bugs*, and all three share a shape:
they are invisible when the component is tested in isolation, which is the only
way I tested it. A focus trap proves Tab is contained; it says nothing about
the virtual cursor. A rendered dialog proves the markup; it says nothing about
what an ancestor's `transform` will do to it.

That is the argument for the library. Not that the primitive is cleverer, but
that it has already been dropped into thousands of ancestor trees by people who
filed the bugs I have not hit yet.
