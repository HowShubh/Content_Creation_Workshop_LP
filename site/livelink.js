/* Live-link page (/livelink): the countdown, and the swap from "the link
   lands here" to the actual join button.

   This page is meant to be shared early — on a slide, in the calendar
   invite, as a QR code — so its address has to be stable and it has to say
   something useful weeks before the session as well as on the day. */

const LIVE = {
  /* The Zoom join link. Empty until Zoom issues it.

     While it is empty the page shows where the link will be instead of a
     dead button, and hides the QR block — a QR code pointing at nothing is
     worse than no QR code. Fill this in, run `python3 tools/make-qr.py`,
     and both switch on. */
  joinUrl: '',

  // Set true once tools/make-qr.py has written assets/live-qr.svg.
  hasQr: false,

  /* The WhatsApp group. The link is sent there as well as appearing on this
     page, so the waiting panel names it — and while this is empty the button
     goes rather than sitting there pointing at nothing.

     Same group as TY.whatsappUrl in ty.js. Set both. */
  whatsappUrl: '',

  // Session start, as UTC. Same instant as TY.event.startUtc in ty.js —
  // 20 Sept 2026, 12:00 PM IST. Keep the two in step.
  startsAt: Date.UTC(2026, 8, 20, 6, 30, 0),

  // How long the room stays open, so the page keeps saying "live now"
  // rather than flipping back the moment the clock hits zero.
  liveMinutes: 260
};

/* ---------- The link ---------- */

function applyLink() {
  const join = document.querySelector('[data-join]');
  const wait = document.querySelector('[data-wait]');
  const qr = document.querySelector('[data-qr]');

  if (LIVE.joinUrl) {
    join.href = LIVE.joinUrl;
    join.hidden = false;
    wait.hidden = true;
    if (LIVE.hasQr && qr) {
      const img = qr.querySelector('[data-qr-src]');
      if (img) img.src = img.dataset.qrSrc;
      qr.hidden = false;
    }
  }
}

/* The group invite is the one thing on this page that can be acted on
   before the day, so it stays visible after the join button appears. */
function applyWhatsApp() {
  const btn = document.querySelector('[data-wa]');
  if (!btn) return;
  if (!LIVE.whatsappUrl) {
    btn.hidden = true;
    return;
  }
  btn.href = LIVE.whatsappUrl;
  btn.target = '_blank';
  btn.rel = 'noopener';
  btn.hidden = false;
}

/* ---------- Countdown ---------- */

function initCountdown() {
  const box = document.querySelector('[data-countdown]');
  const title = document.querySelector('[data-live-note]');
  if (!box) return;

  const cells = {
    d: box.querySelector('[data-d]'),
    h: box.querySelector('[data-h]'),
    m: box.querySelector('[data-m]'),
    s: box.querySelector('[data-s]')
  };
  const pad = n => String(n).padStart(2, '0');
  const endsAt = LIVE.startsAt + LIVE.liveMinutes * 60000;

  function tick() {
    const now = Date.now();
    const left = LIVE.startsAt - now;

    if (left > 0) {
      cells.d.textContent = String(Math.floor(left / 86400000));
      cells.h.textContent = pad(Math.floor(left / 3600000) % 24);
      cells.m.textContent = pad(Math.floor(left / 60000) % 60);
      cells.s.textContent = pad(Math.floor(left / 1000) % 60);
      return;
    }

    /* Once it starts, a counter running backwards from zero is noise. The
       room is open for liveMinutes, then the page reads as finished. */
    box.hidden = true;
    if (title) {
      title.textContent = now < endsAt
        ? 'We are live right now — come on in.'
        : 'This session has finished. The recording goes into your Learning Portal.';
    }
    clearInterval(timer);
  }

  const timer = setInterval(tick, 1000);
  tick();
}

applyLink();
applyWhatsApp();
initCountdown();
