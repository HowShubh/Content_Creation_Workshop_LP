/* Thank-you pages (/tycontent101 and /tybundle): link wiring with UTM
   passthrough, the calendar links, the one-time-offer countdown and the
   referral copy button.

   Both pages load this. Everything below no-ops when its markup is absent,
   so /tybundle simply never starts a countdown. */

const TY = {
  /* ---- The session itself -------------------------------------------
     The one place the date and time are computed from. The same date is
     also written into the markup of both pages (the boarding pass, the
     calendar card and the stub note) — grep for "20 Sept" to find all of
     it if the workshop ever moves. */
  event: {
    title: 'Content Creation for Beginners — KK Create Live Workshop',
    // 20 Sept 2026, 12:00-16:00 IST, as UTC. IST is UTC+5:30 year-round,
    // so there is no daylight-saving case to handle.
    startUtc: '20260920T063000Z',
    endUtc: '20260920T103000Z'
  },

  /* ---- The calendar venue -------------------------------------------
     /zoomlink, as an absolute URL. Both the Google Calendar link and the
     .ics use it as the venue: the Zoom link does not exist on the day
     someone saves this event, and /zoomlink's address never changes, so it
     is the one venue that is correct weeks early and still correct at noon
     on 20 Sept.

     Hard-coded rather than derived from window.location. This string is
     copied into someone's calendar and has to survive the page being opened
     from a preview host or from behind TagMango's redirect domain, where
     window.location.origin is not the public site.

     KEEP IN STEP WITH tools/make-ics.py (ZOOM_LINK_URL), and re-run it
     after changing either — the .ics is a static file and cannot read this. */
  zoomLinkUrl: 'https://contentcreation.kkcreate.in/zoomlink',

  // WhatsApp community. Reminders, the Zoom link on the day, and Q&A.
  whatsappUrl: '',

  // The Complete Creator Bundle offer page. Its own CTA goes to TagMango.
  otoUrl: '/ccboto',

  // Learning portal. Sign-in is by the email or phone used at checkout,
  // with an OTP, which is why no page here promises a password.
  lmsUrl: 'https://learn.kkcreate.in',

  // Support WhatsApp. The number is shown on the page too, so keep the two
  // in step if it ever changes.
  supportNumber: '+91 8700105418',
  supportUrl: 'https://wa.me/918700105418',

  // What the referral button copies: the landing page, plain. Hard-coded
  // rather than derived from window.location, so it stays the public URL
  // even when this page is opened from a preview host or with tracking
  // params on it.
  //
  // It stays opted out of param forwarding (see wire() below). Inheriting
  // whatever brought the buyer here would credit every referred signup to
  // the referrer's ad, which is the opposite of the point — so a student
  // sharing this passes on a clean link.
  referralUrl: 'https://contentcreation.kkcreate.in',

  /* How long the offer stays open per visitor, from the moment they first
     see it — which is normally /ccboto, since that is the page checkout
     lands on. The deadline is stored in localStorage, so refreshing does not
     restart the clock — and because /ccboto and the strip on this page are
     the same offer, they share one deadline under one key.

     At zero only the countdown goes: the strip and its button stay live,
     because a dead clock next to a working CTA reads as a bug.

     KEEP IN STEP WITH oto.js: minutes and the key are duplicated there
     rather than pulled from a shared file, which would cost every page an
     extra request. If you change one, change the other. */
  otoMinutes: 8
};

const OTO_CLOCK_KEY = 'ccb-oto-end';

/* ---------- Links ---------- */

/* Whatever params this page was opened with (TagMango forwards the UTMs
   through its redirect) continue on to the offer page, so the upsell sale
   is attributed to the same source as the original. */
function withPageParams(url) {
  const page = new URLSearchParams(window.location.search);
  if (![...page.keys()].length) return url;
  const target = new URL(url, window.location.href);
  page.forEach((value, key) => {
    if (!target.searchParams.has(key)) target.searchParams.set(key, value);
  });
  return target.toString();
}

/* An unset URL leaves the element's authored href alone rather than
   pointing it at nothing — see the pending links listed in the README.

   Params are forwarded by default, so a link added later is tracked unless
   someone deliberately says otherwise. The opt-outs below are the
   destinations that cannot record a UTM, where appending one only makes the
   URL longer and dirtier. */
function wire(selector, url, opts) {
  if (!url) return;
  const { passParams = true, newTab = true } = opts || {};
  document.querySelectorAll(selector).forEach(el => {
    el.href = passParams ? withPageParams(url) : url;
    if (newTab) { el.target = '_blank'; el.rel = 'noopener'; }
  });
}

/* Until /zoomlink has a public URL the venue says where the link will land
   rather than pointing at nothing, so an invite saved today is still useful.
   tools/make-ics.py carries the same pair of strings. */
const ZOOM_LINK_NAME = 'the KK Create Zoom link page';

function eventVenue() {
  return TY.zoomLinkUrl || 'Zoom — join link on ' + ZOOM_LINK_NAME;
}

function eventDetails() {
  return 'Your seat is confirmed.\n\nOn 20 Sept the join button appears on '
    + (TY.zoomLinkUrl || ZOOM_LINK_NAME) + '. We also send the link in the '
    + 'WhatsApp group and to the email you registered with, shortly before '
    + 'we start.';
}

function googleCalendarUrl(e) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: e.startUtc + '/' + e.endUtc,
    details: eventDetails(),
    location: eventVenue()
  });
  return 'https://calendar.google.com/calendar/render?' + p;
}

/* No params on the two WhatsApp links: a chat.whatsapp.com group invite and
   a wa.me deep link both drop everything they do not recognise, so there is
   nothing on the other side to read a UTM — and a group invite gets pasted
   around, which is the last URL that wants tracking on it. */
wire('[data-wa]', TY.whatsappUrl, { passParams: false });
wire('[data-support]', TY.supportUrl, { passParams: false });

// The portal is ours, so this one is worth attributing.
wire('[data-lms]', TY.lmsUrl);

/* The Google Calendar link's query string *is* the event — title, dates,
   venue. Extra params would be written into the URL and read by nobody. */
wire('[data-cal]', googleCalendarUrl(TY.event), { passParams: false });

wire('[data-oto]', TY.otoUrl, { newTab: false });

/* The support button shows the number itself — someone who would rather
   save it than tap through should not have to open WhatsApp to read it. */
document.querySelectorAll('[data-support-number]').forEach(el => {
  el.textContent = TY.supportNumber;
});

/* ---------- One-time-offer countdown ---------- */

/* Storage can be unavailable outright, not just unwritable: in Safari's
   private mode and wherever site data is blocked, reading it throws too. An
   uncaught throw here would leave the clock frozen on its markup
   placeholder, which is the one state this strip cannot afford. */
function readDeadline() {
  try { return parseInt(localStorage.getItem(OTO_CLOCK_KEY), 10) || 0; }
  catch (e) { return 0; }
}

function writeDeadline(end) {
  try { localStorage.setItem(OTO_CLOCK_KEY, String(end)); } catch (e) { /* private mode */ }
}

function initOtoClock() {
  const strip = document.querySelector('[data-oto-strip]');
  if (!strip) return;

  /* Normally the clock is already running by the time anyone reads this
     strip: checkout lands on /ccboto, which issues the deadline, and this
     page is where they arrive after declining it. The fallback covers the
     other route in — someone reopening this page from their history, or a
     visitor whose storage was cleared between the two.

     Either way it is issued once and then left alone: refreshing never buys
     another minute, and one that has already lapsed stays lapsed here.
     Reissuing is /ccboto's job, not this page's — someone who bounces off
     the offer and comes back should not find the clock wound back. */
  let end = readDeadline();
  if (!end) {
    end = Date.now() + TY.otoMinutes * 60000;
    writeDeadline(end);
  }

  const hEl = strip.querySelector('[data-clock-h]');
  const mEl = strip.querySelector('[data-clock-m]');
  const sEl = strip.querySelector('[data-clock-s]');
  const hUnit = strip.querySelector('[data-unit-h]');
  const pad = n => String(n).padStart(2, '0');

  /* Only the countdown expires. The strip and its button carry on working,
     so at zero the clock is removed rather than the offer being closed off
     — a dead 00:00 next to a live CTA reads as a bug. Runs on the first
     tick too, so someone returning after their window has lapsed lands
     straight in this state. */
  function expire() {
    strip.querySelectorAll('[data-timer]').forEach(el => { el.hidden = true; });
  }

  function tick() {
    const left = Math.max(0, end - Date.now());
    const hrs = Math.floor(left / 3600000);
    if (hUnit) hUnit.hidden = hrs === 0;
    if (hEl) hEl.textContent = pad(hrs);
    if (mEl) mEl.textContent = pad(Math.floor(left / 60000) % 60);
    if (sEl) sEl.textContent = pad(Math.floor(left / 1000) % 60);
    if (left <= 0) {
      expire();
      clearInterval(timer);
    }
  }

  const timer = setInterval(tick, 1000);
  tick();
}
initOtoClock();

/* ---------- Referral copy ---------- */

function initReferral() {
  const btn = document.querySelector('[data-referral]');
  if (!btn) return;
  /* No public landing page URL yet means nothing to share, so the whole
     card goes rather than leaving a heading above a dead button. */
  if (!TY.referralUrl) {
    const card = btn.closest('[data-referral-card]');
    if (card) card.hidden = true;
    return;
  }
  const label = btn.textContent;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(TY.referralUrl);
      btn.textContent = 'Copied!';
    } catch (e) {
      btn.textContent = 'Copy failed';
    }
    setTimeout(() => { btn.textContent = label; }, 2000);
  });
}
initReferral();
