#!/usr/bin/env python3
"""Normalise the four bundle covers, then write them as WebP.

The covers came out of the design bundle with wildly different amounts of
transparent padding baked in: the AI box sits inside 20% horizontal padding,
the YouTube box inside 9%. The box artwork itself is near-identical in shape
across all four (aspect ratios 0.681 to 0.694, under 2% apart), so the
padding is the whole reason a row of them reads as four different sizes —
laid out at one width the AI cover renders 11% smaller than the YouTube one.

No CSS fixes that. `object-fit` and a fixed box scale the *canvas*, and the
canvas is exactly what is inconsistent, so the padding just scales with it.
The art has to be re-cut.

So: trim each to its alpha bounding box, scale every box to one content
height, and centre it on a canvas sized for the widest of the four. All four
come out with identical pixel dimensions, which means they render identically
whether the CSS sizes them by width (the phone row) or by height (desktop and
the session breakdowns).

Run after replacing any cover:  python3 tools/make-covers.py
"""
import os
from PIL import Image

HERE = os.path.dirname(__file__)
SRC_DIR = os.path.join(HERE, '..', 'CCB Structure', 'uploads', 'oto')
OUT_DIR = os.path.join(HERE, '..', 'site', 'assets')

# The originals are named by upload hash, so the mapping lives here rather
# than in the filenames. Sizes are the source canvases, checked on load so a
# re-uploaded original cannot be silently paired with the wrong product.
COVERS = [
    ('1f2c0a0e-e0d3-4555-8a38-11d3593fecfe.png', 'bundle-ai.webp', (481, 606)),
    ('737729cb-0230-43c7-94bb-614e6f137284.png', 'bundle-editing.webp', (429, 606)),
    ('f9d4c682-9b1e-4025-89e8-eebb11739bfa.png', 'bundle-money.webp', (464, 599)),
    ('f10c7eff-173a-440b-95b1-64ce1605ea11.png', 'bundle-youtube.webp', (415, 578)),
]

# Content height every box is scaled to. Sits in the middle of the four
# source heights (547-567) so the resampling is under 3% either way, and it
# is still ~2x the 250px the covers are ever displayed at, which covers
# retina without paying for pixels nobody sees.
CONTENT_HEIGHT = 560

# A hairline of transparent margin. The drop shadow is a CSS filter and
# renders outside the element either way — this is only so the artwork's own
# edge pixels are not sitting on the canvas boundary.
PAD = 4

QUALITY = 82


def trimmed(path, expect_size):
    im = Image.open(path).convert('RGBA')
    if im.size != expect_size:
        raise SystemExit(
            f'{os.path.basename(path)} is {im.size}, expected {expect_size}. '
            'If the original was replaced, update COVERS.')
    box = im.getchannel('A').getbbox()
    if box is None:
        raise SystemExit(f'{os.path.basename(path)} is fully transparent.')
    return im.crop(box)


def main():
    boxes = [(out, trimmed(os.path.join(SRC_DIR, src), size))
             for src, out, size in COVERS]

    # Scale to one height first, then size the canvas to whichever box is
    # widest — so the canvas is derived from the art rather than guessed, and
    # no cover is ever cropped to fit it.
    scaled = []
    for out, im in boxes:
        w = max(1, round(im.width * CONTENT_HEIGHT / im.height))
        scaled.append((out, im.resize((w, CONTENT_HEIGHT), Image.LANCZOS)))

    canvas_w = max(im.width for _, im in scaled) + PAD * 2
    canvas_h = CONTENT_HEIGHT + PAD * 2

    for out, im in scaled:
        sheet = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
        # Centred horizontally; the boxes stand on a common baseline, so the
        # vertical placement is the same PAD for every one of them.
        sheet.paste(im, ((canvas_w - im.width) // 2, PAD))
        dst = os.path.join(OUT_DIR, out)
        sheet.save(dst, 'WEBP', quality=QUALITY, method=6)
        print(f'{out:22} {canvas_w}x{canvas_h}  '
              f'art {im.width}x{im.height}  {os.path.getsize(dst) // 1024} KB')

    print(f'\nAll four are {canvas_w}x{canvas_h}. '
          f'Use those in the markup\'s width/height attributes.')


if __name__ == '__main__':
    main()
