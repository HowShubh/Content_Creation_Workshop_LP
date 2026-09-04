# Content Creation for Beginners — funnel pages

The post-checkout pages for the KK Create *Content Creation for Beginners*
workshop, built from the Claude Design handoff bundle in `CCB Structure/`.

**The whole funnel now lives here**: the landing page at `/`, the one-time
offer, the two thank-you pages, and the join page for the day. The landing
page used to be a TagMango page-builder site at
`lp.kkcreate.in/content-creation`; it has been rebuilt here as hand-written
HTML at the same design, so there is one place to change a price or a date.

The workshop is **live on Sunday 20 September 2026, 12:00–4:00 PM IST, on
Zoom**. These pages are date-dependent: the date appears in the landing page's
hero badge, in the boarding pass, the calendar card and the stub note in both
thank-you pages' markup, and as the calendar event in `site/ty.js`. Grep for
`20 Sept` and `20260920` to find all of it.

Static HTML/CSS/JS — no build step, no dependencies.

## Run locally

```bash
python3 -m http.server 4321 --directory site
```

Then open http://localhost:4321/

## The funnel

```
  /  ──────────────────── the landing page
     │  TagMango workshop checkout
     ▼
  /ccboto ─────────────── the Complete Creator Bundle offer
     │        │
     │        │ "I'll figure it out myself"
     │        ▼
     │   /tycontent101 ─── seat confirmed
     │        │
     │        │ offer strip: "Get it for ₹299"
     │        └──────────► back up to /ccboto
     │
     │ TagMango bundle checkout
     ▼
  /tybundle ───────────── seat + bundle confirmed
```

**The offer comes first.** The workshop checkout redirects to `/ccboto`, not
to a thank-you page, so every buyer sees the bundle once before their
confirmation. `/tycontent101` is what declining lands on — it confirms the
seat and carries the offer strip as the second ask, which is the only way
back into `/ccboto`.

That makes `/ccboto` the page that has to work standing alone: it opens with
"Your registration is confirmed", because for most buyers it is the first
thing they see after paying.

Set TagMango's post-purchase redirects to `/ccboto` (workshop) and
`/tybundle` (bundle).

`/livelink` sits outside that flow. It is where the Zoom link appears on the
day, and it is the venue in the calendar invite, the target of the QR code
and of any short link — so it is reached from someone's calendar or phone,
never by clicking through these pages.

`/` is the **landing page**. Every Enroll button on it — hero, bonuses,
certificate, the closing card and the sticky bar — goes to the same TagMango
workshop checkout, which is the only link on the page:
`https://learn.kkcreate.in/web/checkout/6a99159a9cbde21f8b847e6b`. Change it
in `site/index.html`; it is written out at each button rather than injected,
so the page needs no script to be clickable.

**The date is on it twice over.** The hero badge reads `12:00PM | 20 Sept
(Sunday)` and the three facts beside it say the workshop is live, 3+ hours,
on Zoom. That is the same session `ty.js`, the boarding pass and the .ics
describe, so all of it moves together — grep for `20 Sept` and `20260920`.

Every page is noindexed — see Deploying below.

## Layout

```
vercel.json               static deploy config — serves site/
site/
  index.html              the landing page
  home.css / home.js      the landing page's styles and its three behaviours
  base.css                self-hosted type, the KK palette, shared primitives
  ty.css / ty.js          both thank-you pages
  oto.css / oto.js        the offer page
  livelink.css / .js      the live-link page
  tycontent101/           thank-you — seat only
  tybundle/               thank-you — seat plus bundle
  ccboto/                 the one-time offer
  livelink/               the join-link page for the day
  assets/                 fonts, logo, bundle covers, the .ics
  assets/home/            everything the landing page draws
tools/
  make-webp.py            PNG/JPG in site/assets -> WebP
  make-covers.py          normalise + convert the four bundle covers
  make-ics.py             regenerate the calendar file
  make-qr.py              QR code for the Zoom join link
```

## Deploying

Vercel, static, no build step. `vercel.json` sets `outputDirectory` to `site`,
so the repo root is not what gets served — `CCB Structure/` and `tools/` stay
out of the deployment.

`cleanUrls` plus `trailingSlash: false` make `/ccboto` the canonical URL for
`site/ccboto/index.html`, which is exactly the form every link in the code
already uses (`OTO.declineUrl`, `TY.otoUrl`, the review nav). Nothing needs
rewriting to match the host.

**Nothing here is indexable.** Each page carries a `noindex, nofollow` meta
tag and `vercel.json` adds an `X-Robots-Tag` header saying the same on every
route. `site/robots.txt` deliberately **allows** crawling: a crawler has to
fetch a page to see either of those, so disallowing the paths would hide the
noindex while leaving the URLs indexable from any external link — the
opposite of what it looks like it does.

Two things to change before this is a real launch rather than a review link:

- **Drop the `noindex`.** The landing page is now the public front of the
  funnel and wants to be crawlable, unlike the four post-checkout pages. That
  means removing the meta tag from `site/index.html` *and* narrowing the
  `X-Robots-Tag` rule in `vercel.json`, which currently applies to `/(.*)`.
  The review nav that used to sit on the holding page is gone with it; the
  funnel routes are `/ccboto`, `/tycontent101`, `/tybundle` and `/livelink`.
- **Revisit the asset cache headers.** `/assets/*` is currently served
  `max-age=0, must-revalidate` so a redeployed image is picked up
  immediately, which is what an in-progress design review wants and not what
  a live page wants. Fonts are already `immutable` for a year, since those
  never change. Note that the cover filenames do not carry a hash, so
  lengthening that cache means a changed cover can go stale — see Assets.

## Editing content

Links and timings live in the `TY` object at the top of `site/ty.js` and the
`OTO` object at the top of `site/oto.js`. Prices are markup: the offer strip
on `/tycontent101` quotes ₹299 against a ₹999 MRP, and the offer page quotes
nothing at all, so a price change is one file, not two.

The Learning Portal is presented as a sign-in pill carrying the address
itself (`learn.kkcreate.in` + SIGN IN), and the support button shows the
WhatsApp number rather than hiding it behind "Contact support" — `ty.js`
writes that number from `TY.supportNumber`, so the markup and the link
cannot drift apart.

## The landing page (/)

A rebuild of `lp.kkcreate.in/content-creation`, which was assembled in
TagMango's page builder. The design is unchanged and was matched against the
live page section by section; what changed is that it is hand-written, so it
sits in this repo with the rest of the funnel.

**One DOM, not two.** The builder shipped a desktop and a mobile copy of
every section, each hidden at the other width — which is why the exported
HTML contains every testimonial and every FAQ answer twice. Here the layout
changes at 900px and the copy exists once, so the two cannot drift apart.

**Four behaviours, in `site/home.js`.** The modules and the FAQ open one row
at a time; the testimonial strip scrolls by its arrows as well as by finger;
a poster becomes a player on click; and the sticky enrol bar arrives once the
hero's own button has scrolled away, so there are never two of the same
button on screen. With scripting off every panel is shut but every word is in
the markup, the strip still scrolls, and the bar reveals itself below — the
one thing that needs script is playing a clip, which is the trade that keeps
Vimeo off the page until someone wants it.

**Nothing on the page is third-party.** Swiper drove the testimonial
carousel; it is a `scroll-snap` strip now, the same gesture with no library.
Material Icons supplied the accordion chevrons and Font Awesome the check
marks; those are inline SVG.

The nine Vimeo clips are the interesting one. `loading="lazy"` does not save
this page: all nine slides sit at the same height, so the moment the strip
scrolls into view the browser loads every player — several hundred KB apiece
before one of them paints a frame. Each clip sits behind its own poster
instead (Vimeo's own thumbnail, served from here), and `home.js` swaps in the
real player, already playing, on the first click. Until someone presses one,
the page makes no request off this origin at all.

The five bands below the certificate carry `content-visibility: auto`, so
they are laid out and painted only as they come near the viewport. Each has a
`contain-intrinsic-size: auto <height>px` placeholder for the first pass;
`auto` makes the browser remember the real height afterwards, so scrolling
back up does not jump. `.lp-learn` and `.lp-cert` are deliberately left out —
the modules image is `position: sticky`, and containment would strand it.

### Its assets

`site/assets/home/` holds everything the page draws, pulled from
`tagmango.com/staticassets` and converted. The photographs were 1MB–3MB PNGs
at up to 3037px for a box a third that wide; they are WebP at 2x their
largest rendered size. The whole page — every image, font and stylesheet,
above the fold and below — is under 600KB and makes no third-party request.

Eight of the logos and social icons were Figma SVG exports that only wrapped
a full-size PNG in a `<pattern>`, which is a slow way to ship a raster. Those
are plain `.webp`: the Instagram one alone was 457KB for a 42px icon, and ITC
was 30KB for one sprite the SVG cropped twice, which is now the two `.webp`
files the tile actually shows.

The three hand-drawn heading rules were 36KB apiece of path data at full
float precision. `svgo --precision=1` takes each to ~2.5KB, which is more
than enough for a 258x9 squiggle.

The nine `tst-*.webp` are Vimeo's thumbnails for the testimonial clips,
fetched through its oEmbed API and re-encoded at 440px. They sit behind a
play button, so they are sized for that rather than for a full-quality
photograph.

**The rupee sign matters for the fonts.** ₹ (U+20B9) is in the latin-ext
subset, not latin, and this page sets prices in both Manrope and Poppins —
see the note at the top of `base.css`. Manrope 800 and Poppins 700 were added
to `base.css` for this page; every other weight it uses was already there.

## Attribution

Links forward whatever query params the page was opened with — the UTMs
TagMango passes through its redirect, plus `fbclid` / `gclid` — so the whole
funnel is attributed to the source that paid for the original click.
Forwarding is the **default** in `wire()` (`site/ty.js`) and in `applyConfig()`
(`site/oto.js`), so a link added later is tracked unless someone opts it out.

The landing page is where the chain starts, and it is the hop that decides
whether any of the rest means anything: a payment that reaches TagMango with
no params on it is booked as direct traffic whatever actually earned the
click. All five Enroll buttons carry `[data-buy]`, and `site/home.js` rewrites
their href on load.

Carried end to end, the chain is:

```
/?utm → workshop checkout?utm → /ccboto?utm → decline → /tycontent101?utm
                                            │                    │ strip
                                            │                    ▼
                                            │              /ccboto?utm
                                            └─ buy → bundle checkout?utm
                                                          → /tybundle?utm
                                                          → portal?utm
```

Three copies of `withPageParams` exist — one each in `home.js`, `ty.js` and
`oto.js` — for the same reason the countdown is duplicated: a shared file
would cost every page in the funnel an extra request. One behaviour, three
copies; change one, change all three.

Three links deliberately opt out, because nothing on the other side can read
a UTM and appending one only makes the URL longer:

- **`[data-wa]` and `[data-support]`** — `chat.whatsapp.com` group invites and
  `wa.me` deep links drop every param they do not recognise, and a group
  invite is the last URL that wants tracking on it, since it gets pasted on.
- **`[data-cal]`** — the Google Calendar link's query string *is* the event:
  title, dates, venue. Extra params get written into the URL and read by
  nobody.

The referral link is a separate case and must stay opted out: it carries its
own UTMs plus `ref=student` rather than inheriting the buyer's, because
passing their `utm_source` on would credit the referred signup to the
referrer's ad.

The `.ics` download and the in-page `#get` / `#calendar` / `#community` jumps
take no params either — one is a static file, the others never leave the page.

## The shared countdown

`/ccboto` and the offer strip on `/tycontent101` are the same offer, so they
share one deadline in localStorage (`ccb-oto-end`, 8 minutes — `TY.otoMinutes`
and `OTO.minutes`, which have to be changed together). A refresh never buys
more time.

The clock starts on `/ccboto`, since that is the page checkout lands on. By
the time the strip on `/tycontent101` is read it is normally already running,
and the strip just shows whatever is left — it issues a deadline only for
someone who reached that page another way.

The design bundle had these at 50 and 15 minutes respectively. Two clocks for
one offer means seeing 50:00 on the thank-you page and 15:00 one click later,
so they are unified — at 8 minutes, matching the Editing 101 funnel.

At zero **only the countdown is removed** — every page keeps its buttons
working, because a dead clock next to a live CTA reads as a bug. The strip
stays, the price stays, the CTA still goes to `/ccboto`.

Only `/ccboto` reissues a lapsed deadline; `/tycontent101` never does. So
someone who lets the clock run out on the thank-you page sees the offer
without a timer, and gets a fresh 8 minutes the moment they open the offer
page itself. Since the key is shared, that also puts a countdown back on the
thank-you strip. This asymmetry is deliberate and matches Editing 101 — the
page that has to close the sale is the one allowed to restart the clock.

## The offer bar on /ccboto

The fixed bar at the bottom starts tucked and slides in once the hero panel
has scrolled out of view. It exists to keep the CTA reachable from the FAQ
and the session breakdowns, so while the hero's own button is still on screen
it is just a second copy of the same button — and on a phone it lands over
the covers, which is the thing being sold.

Two details in `initBar()` (`site/oto.js`) are load-bearing:

- **It observes `.hero`, not the button inside it.** An IntersectionObserver
  only fires on a threshold crossing. The button is off screen *below* at
  load and off screen *above* once you have scrolled past, and neither state
  intersects — so any jump that skips the crossing (a click on one of the
  page's own `#get` links, or the browser restoring a scroll position) would
  never fire, and the bar would stay hidden. The panel spans both states, so
  it fires.
- **The tucked class is added by JS, not authored in the markup.** If the
  script never runs the bar behaves as it always did. A one-time offer whose
  only persistent CTA fails closed is worse than one that shows too eagerly.

It hides with `visibility`, not `display`, so it keeps its box and
`trackBarHeight()` can still measure it while out of sight — and so it leaves
the tab order while hidden.

## The two thank-you pages

They are the same page. `/tybundle` differs in four places: the confirmation
pill says `· BUNDLE INCLUDED`, the boarding pass subtitle names the bundle,
the offer strip is replaced by an "Also unlocked" list of the four recordings,
and the portal card mentions them. Everything else — the pass, the quick
actions, support, referral — is identical, and both load the same `ty.js`,
which no-ops the countdown when the strip is absent.

## Deliberate changes from the design bundle

- **The theme switcher is gone.** The bundle's header carried nine colour
  swatches and a dark-mode toggle. That is canvas chrome for picking a look,
  not part of the page; only the chosen "KK" light theme ships.
- **Outfit is not used.** The offer page was set in Outfit. It ships in Space
  Grotesk and Manrope — the faces the rest of KK Create already serves — so
  the funnel reads as one brand and no page pays for a fifth family.
- **The countdowns are unified at 8 minutes.** The bundle had 50 on the
  thank-you page and 15 on the offer page. See above.
- **The boarding-pass watermark is an alpha mask.** The bundle masked the KK
  lockup by luminance, which silently degrades to a solid dark rectangle
  where that is unsupported. The asset is baked to an alpha channel instead.

## Assets

After dropping a new PNG/JPG into `site/assets/`, run:

```bash
python3 tools/make-webp.py
```

then reference the generated `.webp` and delete the source (git history keeps
everything). `favicon.png` and `apple-touch-icon.png` stay PNG for favicon
support.

### The four bundle covers

These do **not** go through `make-webp.py`. They came out of the design
bundle with very different amounts of transparent padding baked in — the AI
box sits inside 20% horizontal padding, the YouTube box inside 9% — so laid
out at one width the AI cover rendered 11% smaller than the YouTube one and
the row read as four different sizes.

The box artwork itself is near-identical in shape (aspect ratios 0.681 to
0.694, under 2% apart), so the padding was the entire problem. No CSS fixes
it: `object-fit` and a fixed box scale the *canvas*, and the canvas is what
is inconsistent, so the padding scales along with it. The art has to be
re-cut.

`tools/make-covers.py` does that — trims each to its alpha bounding box,
scales every box to one content height, and centres it on a canvas sized for
the widest of the four. All four come out at **397x568**, which is why they
now render identically whether the CSS sizes them by width (the phone row) or
by height (desktop and the session breakdowns).

It reads the originals from `CCB Structure/uploads/oto/` and checks each
source canvas size, so a re-uploaded original cannot be silently paired with
the wrong product. After replacing a cover:

```bash
python3 tools/make-covers.py
```

Then put the printed dimensions in the markup's `width`/`height` attributes —
all eight `<img>` tags on `/ccboto`, four in the hero row and four in the
session breakdowns.

One deployment note: the filenames do not change, so anyone holding the old
covers in cache keeps them until it expires. If that matters on a live page,
bump the filenames rather than relying on a purge.

## Calendar

Both thank-you pages offer the session two ways, because one link does not
cover everyone:

- **Google** builds a Calendar template link from `TY.event` in `site/ty.js`,
  which is where the start and end times are written as UTC (IST is UTC+5:30
  year-round, so there is no daylight-saving case).
- **.ics** is `site/assets/content-creation-101.ics`, which is what Apple
  Calendar and Outlook actually want. It carries two alarms — one the day
  before, one 30 minutes out.

**The venue on both is `/livelink`**, not a Zoom URL. Nobody has the Zoom
link on the day this invite is saved, and `/livelink`'s address never
changes, so it is the one venue that is right the moment someone hits "add
to calendar" and still right at noon on 20 Sept. The invite body names the
other two routes — the WhatsApp group and the registered email.

Until that page has a public URL, both fall back to naming it in prose
rather than linking it, and the `.ics` omits its `URL:` property entirely —
an empty one is malformed, and Outlook renders it as a dead location row.
Set `TY.liveLinkUrl` and `LIVE_LINK_URL` together.

The two are generated from separate places and **must be changed together**:
edit `TY.event` / `TY.liveLinkUrl` in `site/ty.js` and `EVENT` /
`LIVE_LINK_URL` in `tools/make-ics.py`, then run:

```bash
python3 tools/make-ics.py
```

## The live-link page (/livelink)

The page the calendar invite, the QR code and any short link point at. Its
address never changes, which is the whole point: it can be printed on a slide
and shared weeks early, and on the day it becomes the join button without
anyone having to send a new link.

It has three states, driven by `LIVE` at the top of `site/livelink.js`:

- **Before the day, no Zoom link yet** (where it is now) — the date in the
  headline, a live countdown, and a panel saying the join button lands on
  this page on 20 Sept and that the link also goes out in the WhatsApp group
  and to the registered email. No dead button, and the QR block stays
  hidden, because a QR pointing at nothing is worse than no QR.
- **Link set** — set `LIVE.joinUrl`, run `python3 tools/make-qr.py` (after
  putting the same URL at the top of that file), and set `LIVE.hasQr = true`.
  The join button and the QR both appear.
- **During and after** — the countdown is replaced by "we are live right now"
  for `LIVE.liveMinutes`, then by a line pointing at the recording. A counter
  running backwards from zero is noise.

`LIVE.startsAt` is the same instant as `TY.event.startUtc` in `ty.js`. Keep
the two in step.

## Still needs real links

Each of these is empty in config, which leaves the button's authored href
alone rather than pointing it at a dead page:

- `TY.whatsappUrl` (`site/ty.js`) and `LIVE.whatsappUrl` (`site/livelink.js`)
  — the same WhatsApp group invite, needed in both files. On the thank-you
  pages an unset value leaves both "Join WhatsApp" buttons jumping to the
  community card; on `/livelink` the group button is hidden outright, since
  there is no card there for it to fall back to.
- `TY.liveLinkUrl` (`site/ty.js`) and `LIVE_LINK_URL` (`tools/make-ics.py`)
  — `/livelink` as an absolute URL, which is the venue in both calendar
  routes. Set both, then re-run `python3 tools/make-ics.py`. See Calendar
  below for what the unset state does.
- `TY.referralUrl` (`site/ty.js`) — the public landing page URL, with its own
  UTMs and `ref=student`. Until it is set the whole referral card is hidden,
  rather than showing a heading above a dead button.
- `LIVE.joinUrl` (`site/livelink.js`) — the Zoom join link, plus `hasQr` and
  the QR asset. See above.

`TY.supportUrl` and `TY.lmsUrl` are carried over from the Editing 101 funnel
and should be correct, but are worth confirming.
