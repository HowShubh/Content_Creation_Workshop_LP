/* Home page (/) — Content Creation for Beginners.

   Five small behaviours, none of which the page depends on to be
   readable: the Enroll buttons pick up the campaign params, the modules
   and FAQ open, the testimonial strip scrolls by the arrows as well as
   by finger, a poster becomes a player on click, and the sticky enrol
   bar arrives once the hero has been passed.

   With scripting off every panel is shut but every word is in the
   markup, the strip still scrolls horizontally, the Enroll buttons
   still reach checkout (untracked), and the bar reveals itself below.
   The one thing that needs script outright is playing a clip — which is
   the trade that keeps Vimeo's player off the page until someone wants
   it. */

/* ---------- Checkout links ----------

   This is the funnel's first hop, so it is where attribution is won or
   lost: whatever brought someone here — utm_*, gclid, fbclid, a ref —
   is carried through to TagMango, and a payment that arrives with no
   params on it is recorded as direct traffic no matter what actually
   earned it.

   The checkout URL is authored on each button rather than injected, so
   the page is still clickable with scripting off; this only decorates
   hrefs that already work. A param the target already carries wins, so
   a link that pins its own utm_content is never overwritten.

   ty.js and oto.js carry their own copy of withPageParams for the same
   reason the countdown is duplicated: a shared file would cost every
   page in the funnel an extra request. Three copies, one behaviour —
   change one, change all three. */
function withPageParams(url) {
  const page = new URLSearchParams(window.location.search);
  if (![...page.keys()].length) return url;
  const target = new URL(url, window.location.href);
  page.forEach((value, key) => {
    if (!target.searchParams.has(key)) target.searchParams.set(key, value);
  });
  return target.toString();
}

document.querySelectorAll('[data-buy]').forEach((link) => {
  link.href = withPageParams(link.href);
});

/* ---------- Accordions ----------

   One handler covers both the six modules and the seven FAQ rows: each
   group is a [data-accordion] whose direct children each hold a button
   and the panel it controls. Only one row in a group is open at a
   time, which is how the original behaved and what keeps the FAQ from
   growing taller than the screen.

   The open state lives in two places on purpose — the `open` attribute
   for CSS, aria-expanded for assistive tech — because CSS cannot
   select on aria state in every browser this page still supports. */
document.querySelectorAll('[data-accordion]').forEach((group) => {
  const rows = [...group.children];

  rows.forEach((row) => {
    const button = row.querySelector('button');
    if (!button) return;

    button.addEventListener('click', () => {
      const wasOpen = row.hasAttribute('open');

      rows.forEach((other) => {
        other.removeAttribute('open');
        const b = other.querySelector('button');
        if (b) b.setAttribute('aria-expanded', 'false');
      });

      if (!wasOpen) {
        row.setAttribute('open', '');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
});

/* ---------- Testimonial strip ----------

   The arrows nudge the same overflow the finger scrolls, one card
   short of a full page so the card you were looking at stays partly in
   view and the jump reads as a scroll rather than a cut. They disable
   themselves at each end rather than wrapping — nine clips is a strip,
   not a carousel, and silently teleporting back to the first one is
   more disorienting than a dead arrow. */
document.querySelectorAll('[data-rail]').forEach((rail) => {
  const track = rail.querySelector('[data-rail-track]');
  const prev = rail.querySelector('[data-rail-prev]');
  const next = rail.querySelector('[data-rail-next]');
  if (!track) return;

  function page() {
    const slide = track.querySelector('.lp-slide');
    if (!slide) return track.clientWidth;
    /* The gap is read rather than hard-coded: it is a clamp in the
       stylesheet on some widths, and a stale constant here shows up
       as a card creeping out of alignment a few presses in. */
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = slide.getBoundingClientRect().width + gap;
    /* At least one card, otherwise as many whole cards as fit minus one. */
    return Math.max(step, Math.floor(track.clientWidth / step - 1) * step);
  }

  function sync() {
    /* 2px of slack: sub-pixel widths mean scrollLeft rarely lands
       exactly on the maximum. */
    const max = track.scrollWidth - track.clientWidth - 2;
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max;
  }

  if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -page() }));
  if (next) next.addEventListener('click', () => track.scrollBy({ left: page() }));

  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
});

/* ---------- Testimonial posters ----------

   Each clip sits behind its own poster until someone asks for it.
   Vimeo's player is several hundred KB of script and CSS before it
   paints a frame, and `loading="lazy"` does not save the page here:
   all nine slides share one vertical position, so the whole strip
   would load the moment it scrolled into view.

   The swap carries `autoplay=1`, because the press that replaced the
   poster was already the press that meant "play". That counts as a
   user gesture, so autoplay with sound is allowed. */
document.querySelectorAll('[data-vimeo]').forEach((poster) => {
  poster.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = 'https://player.vimeo.com/video/' + poster.dataset.vimeo +
                '?title=0&portrait=0&badge=0&autoplay=1';
    frame.title = poster.getAttribute('aria-label') || 'Student testimonial';
    frame.allow = 'autoplay; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    poster.replaceWith(frame);
    /* The strip is still keyboard-navigable, so focus follows the
       thing that replaced what was focused. */
    frame.focus({ preventScroll: true });
  });
});

/* ---------- Sticky enrol bar ----------

   Held back until the hero's own Enroll button has scrolled away.
   Showing both at once puts two identical buttons on screen and covers
   the hero art on a phone, which is the one screen the bar is meant to
   help. IntersectionObserver rather than a scroll listener so this
   costs nothing while the page is being read.

   If the hero button is missing for any reason the bar is shown rather
   than hidden — a missing checkout link is the worse failure. */
const stickyBar = document.querySelector('[data-sticky]');

if (stickyBar) {
  const heroCta = document.querySelector('.lp-hero-copy .lp-cta');

  if (!heroCta || !('IntersectionObserver' in window)) {
    stickyBar.classList.add('is-in');
  } else {
    new IntersectionObserver(
      ([entry]) => stickyBar.classList.toggle('is-in', !entry.isIntersecting),
      { rootMargin: '0px 0px -40px 0px' }
    ).observe(heroCta);
  }
}
