/* GET /api/tagline?city=<name>  ->  { city, state, tagline, source }

   The one line of handwriting on the Creator Pass — "From the land of
   Mithila painting, Madhubani's next storyteller." — written for whatever
   city the student types on /certificate, plus the state it is in for
   the "Madhubani, Bihar" line on the story version. One Claude call per
   city, and only per city: the response is cached at Vercel's edge for a
   month, so the second person from Patna costs nothing.

   Needs ANTHROPIC_API_KEY in the Vercel project's environment variables.
   Without it the function still answers, with the plain default line the
   page would have shown anyway — the pass never waits on this. */

const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5';

const SYSTEM = `You write one line for a certificate that KK Create gives students who finish its "Content Creation for Beginners" workshop. The certificate is styled as a boarding pass from ZERO to HERO, and your line sits on it in handwriting, above the student's signature block.

You are given the name of a city, town or district — almost always in India. Write one line that names one real thing the place is genuinely known for (a craft, an art form, a food, a landmark, a river, a festival, a trade) and hands it to the student as the place's next storyteller.

Rules for the line:
- One sentence. At most 70 characters, spaces included. Shorter is better.
- English. One widely known Hindi or regional word is fine.
- It must end with the place's name and "'s next storyteller." — exactly the shape of the example.
- Only things the place is actually known for. If you are not confident of anything specific, the line is just: <Place>'s next storyteller.

Reply with exactly two lines and nothing else — no quotation marks, no emoji, no preamble, no explanation:
Line 1: the sentence.
Line 2: the Indian state or union territory the place is in, as its name alone (for example: Bihar). If the place is not in India or you are not sure, leave line 2 empty.

Example, for Madhubani:
From the land of Mithila painting, Madhubani's next storyteller.
Bihar`;

/* The default the page already shows; also what a refusal, a timeout or
   a missing key falls back to. */
const plain = city => city + "'s next storyteller.";

const titleCase = s => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'GET only' });
    return;
  }

  /* Letters, spaces and the odd hyphen or apostrophe: a place name, not a
     prompt. Anything else is a 400 rather than a guess. */
  const raw = String((req.query && req.query.city) || '').trim();
  if (!raw || raw.length > 40 || !/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(raw)) {
    res.status(400).json({ error: 'city must be a place name, up to 40 characters' });
    return;
  }
  const city = titleCase(raw.replace(/\s+/g, ' '));

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    /* Not an error the page can do anything about — answer with the
       default and do not cache it, so setting the key takes effect on
       the next request. */
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ city, state: '', tagline: plain(city), source: 'unconfigured' });
    return;
  }

  const client = new Anthropic({ apiKey: key, timeout: 8000, maxRetries: 1 });

  let text = '';
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 100,   // one line; a hard reason to go this low
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{ role: 'user', content: city }]
    });

    if (response.stop_reason !== 'refusal') {
      for (const block of response.content) {
        if (block.type === 'text') text += block.text;
      }
    }
  } catch (e) {
    /* Rate-limited, upstream down, or the 8s timeout — the page gets the
       default line either way. Logged so it shows in Vercel's function
       logs, with the class rather than the message so a key never leaks. */
    console.error('tagline: ' + (e && e.constructor && e.constructor.name) + ' for ' + city
      + (e instanceof Anthropic.APIError ? ' (' + e.status + ')' : ''));
  }

  /* Line one is the tagline, line two the state. Each is checked for the
     shape asked for; anything else is the default (and no state). */
  const clean = t => t.replace(/^["'“”\s]+|["'“”\s]+$/g, '').trim();
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  let tagline = lines[0] || '';
  const ok = tagline.length > 0 && tagline.length <= 90 && /storyteller\.?$/i.test(tagline);
  if (!ok) tagline = plain(city);
  if (!/\.$/.test(tagline)) tagline += '.';
  let state = ok && lines[1] ? lines[1].replace(/\.$/, '') : '';
  if (!/^[\p{L}\p{M}][\p{L}\p{M} &'-]{1,29}$/u.test(state)) state = '';

  /* Cache a written line for a month at the edge — the same city gets
     the same line without another call. A fallback is cached only
     briefly, so a hiccup does not pin the plain line to a city. */
  res.setHeader('Cache-Control', ok
    ? 'public, s-maxage=2592000, stale-while-revalidate=604800'
    : 'public, s-maxage=60');
  res.status(200).json({ city, state, tagline, source: ok ? 'model' : 'default' });
};
