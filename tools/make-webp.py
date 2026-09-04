#!/usr/bin/env python3
"""Convert every PNG/JPG under site/assets to WebP (quality 82, alpha kept).

Run after dropping new images into site/assets:  python3 tools/make-webp.py
Then reference the .webp file in the HTML. Skips files whose .webp is already
newer than the source.

Subdirectories are walked too, so site/assets/home/ (the landing page's
artwork) is covered by the same command as the top level.
"""
import os

from PIL import Image

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'site', 'assets')

# The favicons stay PNG — WebP favicons are not universally supported — so
# converting them only leaves an unreferenced file behind.
SKIP = {'favicon.png', 'apple-touch-icon.png'}

for root, dirs, files in os.walk(ASSETS):
    # Fonts hold no rasters, and walking them is just noise.
    dirs[:] = sorted(d for d in dirs if d != 'fonts')
    for name in sorted(files):
        base, ext = os.path.splitext(name)
        if ext.lower() not in ('.png', '.jpg', '.jpeg') or name in SKIP:
            continue
        src = os.path.join(root, name)
        dst = os.path.join(root, base + '.webp')
        label = os.path.relpath(dst, ASSETS)
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            print(f'  up to date  {label}')
            continue
        im = Image.open(src)
        im.save(dst, 'WEBP', quality=82, method=6)
        a, b = os.path.getsize(src) // 1024, os.path.getsize(dst) // 1024
        print(f'  {os.path.relpath(src, ASSETS)}  {a} KB  ->  {label}  {b} KB'
              f'  ({100 - b * 100 // max(a, 1)}% smaller)')
