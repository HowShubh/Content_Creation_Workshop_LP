/* One-time-offer page (/ccboto): the Complete Creator Bundle.

   The page quotes no price of its own — the amount is shown at checkout,
   so a price change never means editing markup here. The offer strip on
   /tycontent101 does quote it, because it is the thing being clicked. */

const OTO = {
  /* TagMango checkout for the Complete Creator Bundle. A different product
     from the workshop seat, so this is not the landing page's link.

     If it is ever emptied again, every [data-buy] keeps its authored
     `#get` href and simply scrolls to the offer card, rather than sending
     anyone to a dead page. */
  checkoutUrl: 'https://learn.kkcreate.in/web/checkout/6a9943a01481b84eed49d575',

  /* Where "I'll figure it out myself" goes: the plain thank-you page. This
     page is where the workshop checkout lands, so declining is the only way
     most buyers reach their confirmation — it is the exit from the funnel,
     not a dead end, and the seat is already paid for either way. */
  declineUrl: '/tycontent101',

  /* How long the offer stays open per visitor, from the moment they first
     see it — normally this page, since checkout redirects here before the
     thank-you page.

     A deadline that has already lapsed is reissued when this page loads:
     the offer is worth more live than spent, so someone coming back later
     gets a new window rather than a dead 00:00. Renewing writes the shared
     key, so the thank-you strip reads as live again too.

     KEEP IN STEP WITH ty.js: otoMinutes and the key are duplicated there
     rather than pulled from a shared file, which would cost every page an
     extra request. If you change one, change the other. */
  minutes: 8
};

const OTO_CLOCK_KEY = 'ccb-oto-end';

/* The UTMs that arrived with the visitor continue on to checkout, so the
   upsell sale is attributed to the same source as the original. */
function withPageParams(url) {
  const page = new URLSearchParams(window.location.search);
  if (![...page.keys()].length) return url;
  const target = new URL(url, window.location.href);
  page.forEach((value, key) => {
    if (!target.searchParams.has(key)) target.searchParams.set(key, value);
  });
  return target.toString();
}

/* ---------- Links ---------- */

function applyConfig() {
  if (OTO.checkoutUrl) {
    document.querySelectorAll('[data-buy]').forEach(el => {
      el.href = withPageParams(OTO.checkoutUrl);
      el.target = '_blank';
      el.rel = 'noopener';
    });
  }
  if (OTO.declineUrl) {
    document.querySelectorAll('[data-decline]').forEach(el => {
      el.href = withPageParams(OTO.declineUrl);
    });
  }
}

/* ---------- Offer countdown ---------- */

/* Storage can be unavailable outright, not just unwritable: in Safari's
   private mode and wherever site data is blocked, reading it throws too.
   Unreadable storage just means the window lasts as long as the page view,
   rather than both clocks freezing on their markup placeholder. */
function readDeadline() {
  try { return parseInt(localStorage.getItem(OTO_CLOCK_KEY), 10) || 0; }
  catch (e) { return 0; }
}

function writeDeadline(end) {
  try { localStorage.setItem(OTO_CLOCK_KEY, String(end)); } catch (e) { /* private mode */ }
}

function initClock() {
  /* Time still on the clock is kept, so no amount of refreshing buys
     another minute. Only a lapsed deadline is reissued. */
  let end = readDeadline();
  if (end <= Date.now()) {
    end = Date.now() + OTO.minutes * 60000;
    writeDeadline(end);
  }

  const mEls = document.querySelectorAll('[data-clock-m]');
  const sEls = document.querySelectorAll('[data-clock-s]');
  const tEls = document.querySelectorAll('[data-clock-text]');
  const pad = n => String(n).padStart(2, '0');

  /* Only the countdown expires. The offer stays open and every [data-buy]
     keeps working, so at zero the clock leaves rather than sitting there
     spent — nobody is shown a dead 00:00 next to a live button. */
  function expire() {
    document.querySelectorAll('[data-timer]').forEach(el => { el.hidden = true; });
  }

  function tick() {
    const left = Math.max(0, end - Date.now());
    const mm = pad(Math.floor(left / 60000));
    const ss = pad(Math.floor(left / 1000) % 60);
    mEls.forEach(el => { el.textContent = mm; });
    sEls.forEach(el => { el.textContent = ss; });
    tEls.forEach(el => { el.textContent = mm + ':' + ss; });
    if (left <= 0) {
      expire();
      clearInterval(timer);
    }
  }

  const timer = setInterval(tick, 1000);
  tick();
}

/* ---------- Showing the fixed bar ---------- */

/* The bar duplicates the hero's own CTA, so it stays out of the way until
   the hero is gone. Two identical buttons in one viewport is noise, and on
   a phone the bar lands over the covers — the thing being sold — before
   anyone has read the offer.

   The hero panel is what gets observed, not the button inside it, and the
   difference matters. An observer only fires when the target crosses the
   threshold, so watching the button misses any jump that skips the crossing
   — a click on one of this page's own #get links, or the browser restoring
   a scroll position — because the button is off screen below beforehand and
   off screen above afterwards, and neither state is intersecting. The panel
   runs from the top of the page down past the button, so "overlaps the
   viewport" and "scrolled past" really are different states and an instant
   jump between them fires.

   If IntersectionObserver is missing the bar simply stays visible, which is
   the behaviour this page shipped with. */
function initBar() {
  const bar = document.querySelector('.bar');
  const hero = document.querySelector('.hero');
  if (!bar || !hero || !window.IntersectionObserver) return;

  // Applied here rather than in the markup so that a page whose JS never
  // runs still shows the bar.
  bar.classList.add('is-tucked');

  new IntersectionObserver(([entry]) => {
    bar.classList.toggle('is-tucked', entry.isIntersecting);
  }).observe(hero);
}

/* ---------- Clearing the fixed bar ---------- */

/* The bar's height is not knowable from CSS: it stacks on narrow screens,
   and how tall it stacks depends on the CTA label, the font once it loads
   and the safe-area inset. The stylesheet's padding-bottom is a no-JS
   fallback; the real gap is measured here, so the footer is never clipped
   no matter what the copy becomes. */
function trackBarHeight() {
  const bar = document.querySelector('.bar');
  if (!bar) return;
  const apply = () => {
    document.body.style.paddingBottom = (bar.offsetHeight + 16) + 'px';
  };
  apply();
  // Both, not either: the observer catches the bar rewrapping on its own
  // (a longer label, the clock leaving at zero), the resize listener
  // catches an orientation change, which is what actually happens on a
  // phone mid-page.
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  if (window.ResizeObserver) new ResizeObserver(apply).observe(bar);
  // Web fonts land after first paint and can reflow the bar by a line.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
}

applyConfig();
initClock();
initBar();
trackBarHeight();
