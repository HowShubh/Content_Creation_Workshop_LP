#!/usr/bin/env python3
"""Write site/assets/live-qr.svg for the Zoom join link.

Set LIVE.joinUrl in site/livelink.js first, put the same URL below, then:
    pip3 install segno && python3 tools/make-qr.py
and flip LIVE.hasQr to true. SVG rather than PNG so it stays sharp at any
size, including on a slide.
"""
import os, sys

URL = ''  # <- the Zoom join link, same as LIVE.joinUrl

if not URL:
    sys.exit('Set URL at the top of this file first (same as LIVE.joinUrl).')

import segno
dst = os.path.join(os.path.dirname(__file__), '..', 'site', 'assets', 'live-qr.svg')
# Error correction M survives a phone camera at an angle without bloating
# the module count the way H would on an already-long URL.
segno.make(URL, error='m').save(dst, scale=10, border=2, dark='#12222e')
print('wrote', os.path.normpath(dst))
