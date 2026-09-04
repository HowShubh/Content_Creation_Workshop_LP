#!/usr/bin/env python3
"""Convert every PNG/JPG in site/assets to WebP (quality 82, alpha kept).

Run after dropping new images into site/assets:  python3 tools/make-webp.py
Then reference the .webp file in the HTML. Skips files whose .webp is already
newer than the source.
"""
import os, sys
from PIL import Image

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'site', 'assets')

for name in sorted(os.listdir(ASSETS)):
    base, ext = os.path.splitext(name)
    if ext.lower() not in ('.png', '.jpg', '.jpeg'):
        continue
    src = os.path.join(ASSETS, name)
    dst = os.path.join(ASSETS, base + '.webp')
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        print(f'  up to date  {base}.webp')
        continue
    im = Image.open(src)
    im.save(dst, 'WEBP', quality=82, method=6)
    a, b = os.path.getsize(src) // 1024, os.path.getsize(dst) // 1024
    print(f'  {name}  {a} KB  ->  {base}.webp  {b} KB  ({100 - b * 100 // max(a, 1)}% smaller)')
