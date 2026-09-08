#!/usr/bin/env python3
"""Compose the landing page's share card -> site/assets/home/og-share.png

    python3 tools/make-og.py

This is the picture WhatsApp, Instagram and Slack show when someone pastes
the link, so it has to carry the date without anyone opening the page. Re-run
it whenever HEADLINE or WHEN changes, and keep WHEN in step with the hero
badge in site/index.html.

1200x630 is the size every platform crops from. It is drawn at 2x and
downscaled, because PIL has no antialiasing of its own — circles and text
edges come out ragged at final size.

The type is the page's own Space Grotesk and JetBrains Mono, read straight
out of the woff2 files in site/assets/fonts and decompressed in memory, so the
card cannot drift to a different face than the page it advertises. That needs
fontTools + brotli; both come with the fonttools install.
"""
import io
import os

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
FONTS = os.path.join(ROOT, 'site', 'assets', 'fonts')
HOME = os.path.join(ROOT, 'site', 'assets', 'home')
OUT = os.path.join(HOME, 'og-share.jpg')

HEADLINE = ('Content Creation', 'For Beginners')
WHEN = '12:00PM IST  |  20 Sept (Sunday)'

# The page's own tokens. Flat values rather than alpha, because PIL has no
# compositing here: each is the page's rgba() already resolved over --night.
NIGHT = (7, 26, 41)          # --night, the ground
FG = (238, 246, 251)         # --fg, the headline
VOLT = (182, 238, 60)        # --volt, the second line and the date pill
INK = (8, 32, 47)            # the type on the pill, as on the button
ARCH = (38, 64, 44)          # the lime arch: --volt at 18%
RING = (39, 57, 70)          # the dashed ring: --fg at 14%

S = 2                      # supersampling factor
W, H = 1200 * S, 630 * S


def face(name, size):
    """Load a weight from the site's own woff2, as a PIL font."""
    f = TTFont(os.path.join(FONTS, name + '.woff2'))
    f.flavor = None                     # woff2 -> plain TTF, in memory
    buf = io.BytesIO()
    f.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


def dashed_circle(draw, box, colour, width, dash=9, gap=9):
    """PIL draws no dashes, so the ring is a run of short arcs."""
    import math
    r = (box[2] - box[0]) / 2
    step = math.degrees((dash + gap) / r)
    on = math.degrees(dash / r)
    a = 0.0
    while a < 360:
        draw.arc(box, a, min(a + on, 360), fill=colour, width=width)
        a += step


card = Image.new('RGB', (W, H), NIGHT)
draw = ImageDraw.Draw(card)

# ---- Right: the cut-out, standing on its arch ------------------------
photo = Image.open(os.path.join(HOME, 'hero-duo.webp')).convert('RGBA')
photo = photo.crop(photo.getchannel('A').getbbox())     # drop the empty margins
ph = int(548 * S)
photo = photo.resize((round(photo.width * ph / photo.height), ph), Image.LANCZOS)
px = W - photo.width + int(96 * S)     # the sari runs off the right edge
py = H - photo.height

# Sized off the figure so the two stay registered if the photo is ever
# recut, then clamped so the ring is never cut by the top edge — a dashed
# circle that runs off the canvas reads as a mistake rather than a shape.
acx = px + photo.width // 2
ar = min(int(photo.width * 0.44), (H - int(36 * S)) // 2)
acy = max(py + int(photo.height * 0.44), ar + int(18 * S))
draw.ellipse((acx - ar, acy - ar, acx + ar, acy + ar), fill=ARCH)
dashed_circle(draw, (acx - ar, acy - ar, acx + ar, acy + ar), RING, max(1, S),
              dash=4 * S, gap=4 * S)
card.paste(photo, (px, py), photo)

# ---- Left: the headline and the date ---------------------------------
x = int(72 * S)
big = face('space-grotesk-700-latin', 68 * S)
mid = face('space-grotesk-700-latin', 54 * S)
pill = face('jetbrains-mono-700-latin', 22 * S)

y = int(176 * S)
draw.text((x, y), HEADLINE[0], font=big, fill=FG)
y += int(76 * S)
draw.text((x, y), HEADLINE[1], font=mid, fill=VOLT)

y += int(108 * S)
tw = draw.textlength(WHEN, font=pill)
pad_x, pad_y = int(28 * S), int(16 * S)
ph2 = int(56 * S)
draw.rounded_rectangle((x, y, x + tw + pad_x * 2, y + ph2),
                       radius=ph2 // 2, fill=VOLT)
draw.text((x + pad_x, y + pad_y - int(2 * S)), WHEN, font=pill, fill=INK)

# JPEG, not PNG: it is a photograph, and a 500KB share card is a slow
# preview on the phone that is most likely to be shown it.
card.resize((1200, 630), Image.LANCZOS).save(OUT, 'JPEG', quality=88,
                                             optimize=True, progressive=True)
print(f'wrote {OUT}  ({os.path.getsize(OUT) // 1024} KB)')
