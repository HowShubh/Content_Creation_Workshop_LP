#!/usr/bin/env python3
"""Regenerate site/assets/content-creation-101.ics.

The workshop details live here and in site/ty.js (TY.event) — the .ics is a
static file, so it cannot read the JS config. If the date or time moves,
change both, then run:  python3 tools/make-ics.py
"""
import os

# The /zoomlink page, as an absolute URL: the venue of this event.
#
# The Zoom link does not exist on the day this invite is saved, but
# /zoomlink's address never changes and the join button appears there, so it
# is the one venue that is correct weeks early and still correct on the day.
#
# KEEP IN STEP WITH TY.zoomLinkUrl in site/ty.js, which is where the Google
# Calendar link reads the same value, then re-run this script.
ZOOM_LINK_URL = 'https://contentcreation.kkcreate.in/zoomlink'

# Until that URL exists the invite names the page instead of linking it,
# rather than shipping a venue that points at nothing. Matches the fallback
# in site/ty.js.
ZOOM_LINK_NAME = 'the KK Create Zoom link page'
VENUE = ZOOM_LINK_URL or 'Zoom - join link on ' + ZOOM_LINK_NAME

EVENT = {
    'uid': 'content-creation-101-2026-09-20@kkcreate.in',
    # 20 Sept 2026, 12:00-16:00 IST as UTC. IST is UTC+5:30 year-round.
    'start': '20260920T063000Z',
    'end': '20260920T103000Z',
    'stamp': '20260904T000000Z',
    'summary': 'Content Creation for Beginners - Live Workshop (KK Create)',
    'description': (
        'Live on Zoom, 12:00-4:00 PM IST.\\n\\n'
        'The join button appears on ' + (ZOOM_LINK_URL or ZOOM_LINK_NAME)
        + ' on 20 Sept. We also send the link in the WhatsApp group and to '
        'the email you registered with, shortly before we start.'
    ),
    'location': VENUE,
    # URL: is what Apple Calendar and Outlook turn into the clickable line,
    # so it only carries a real link — never the fallback prose.
    'url': ZOOM_LINK_URL,
}

def fold(line):
    """RFC 5545 caps a content line at 75 octets; continuations start with
    one space. Folding on characters would split a multi-byte codepoint, so
    the measuring is done on the encoded bytes."""
    raw = line.encode('utf-8')
    if len(raw) <= 75:
        return line
    out, cur = [], b''
    for ch in line:
        b = ch.encode('utf-8')
        if len(cur) + len(b) > (75 if not out else 74):
            out.append(cur.decode('utf-8'))
            cur = b''
        cur += b
    out.append(cur.decode('utf-8'))
    return '\r\n '.join(out)

e = EVENT
lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KK Create//Content Creation for Beginners//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    f"UID:{e['uid']}",
    f"DTSTAMP:{e['stamp']}",
    f"DTSTART:{e['start']}",
    f"DTEND:{e['end']}",
    f"SUMMARY:{e['summary']}",
    f"DESCRIPTION:{e['description']}",
    f"LOCATION:{e['location']}",
    # Omitted entirely while the Zoom-link URL is unset: an empty URL: is a
    # malformed property, and Outlook renders it as a dead "no location" row.
    *([f"URL:{e['url']}"] if e['url'] else []),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Content Creation for Beginners is tomorrow at 12 PM IST',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Content Creation for Beginners starts in 30 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
]

dst = os.path.join(os.path.dirname(__file__), '..', 'site', 'assets',
                   'content-creation-101.ics')
# CRLF throughout, which RFC 5545 requires and Outlook actually enforces.
with open(dst, 'w', newline='') as f:
    f.write('\r\n'.join(fold(l) for l in lines) + '\r\n')
print('wrote', os.path.normpath(dst))
