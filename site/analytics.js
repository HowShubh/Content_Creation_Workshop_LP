/* Analytics, shared by all five pages.

   Every other behaviour in this funnel is duplicated per page rather than
   shared, because a shared file costs each page an extra request. This one
   is the exception: the code is identical everywhere, it has to stay
   identical for the numbers to mean anything, and it is already about to
   fetch two much larger third-party scripts — so one more same-origin
   request is not what makes this page slow.

   Both tags are injected rather than pasted in as <script> tags, so a page
   with an unset ID makes no request at all. That matters: the landing page
   otherwise touches no third party until someone presses play on a
   testimonial, and an empty config should not quietly cost it that.

   No consent banner. The audience is India, the previous page had none,
   and adding one is a decision about the business rather than the markup —
   if that changes, gate the two calls at the bottom of this file. */

const ANALYTICS = {
  /* GA4 measurement ID — the G-XXXXXXXXXX from
     Admin > Data streams > your web stream, NOT the numeric stream ID.

     One property for the whole of kkcreate.in, not a second one for this
     subdomain: GA4 sets its cookie on the registrable domain, so a visitor
     who reads kkcreate.in and then lands here is one session either way.
     Split them into two properties and that journey disappears. */
  ga4: '',

  // Microsoft Clarity project. Session recordings and heatmaps.
  clarity: 'yd55hj8iln',

  /* Meta Pixel, deliberately off. When it goes in, the Purchase event
     belongs on /ccboto and /tybundle — the two pages TagMango redirects to
     after payment — not here, and not on both this and TagMango's own
     pixel setting, or every sale is counted twice. */
  metaPixel: ''
};

/* Google Analytics 4. gtag.js is ~90KB, so it is async and arrives after
   the page has painted; GA4 backdates the pageview off its own timing, so
   nothing is lost by not blocking on it. */
if (ANALYTICS.ga4) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', ANALYTICS.ga4);

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + ANALYTICS.ga4;
  document.head.appendChild(tag);
}

/* Microsoft Clarity, as their own snippet does it: queue calls against
   window.clarity immediately, then load the tag that drains the queue. */
if (ANALYTICS.clarity) {
  window.clarity = window.clarity || function () {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.clarity.ms/tag/' + ANALYTICS.clarity;
  document.head.appendChild(tag);
}
