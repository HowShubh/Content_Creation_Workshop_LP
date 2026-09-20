/* GET /api/tagline?city=<name>  ->  { city, state, tagline, source }

   The one line of handwriting on the Creator Pass — "From the land of
   Mithila painting, Madhubani's next storyteller." — written for whatever
   city the student types on /certificate, plus the state it is in for
   the "Madhubani, Bihar" line on the story version. One model call per
   city, and only per city: the response is cached at Vercel's edge for a
   month, so the second person from Patna costs nothing.

   The call goes through OpenRouter (an OpenAI-shaped chat endpoint), so
   it needs OPENROUTER_API_KEY in the Vercel project's environment
   variables — the only setting it reads; the model is MODEL below. Plain
   fetch, no SDK — Node has had fetch since 18, and this is the only thing
   in the repo that talks to a server. Without a key the function still
   answers, with the plain default line the page would have shown anyway
   — the pass never waits on this. */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
/* Haiku: a one-line job, and at ~400 tokens in and ~30 out it is a
   fraction of a paisa per city. Any OpenRouter slug goes here. */
const MODEL = 'anthropic/claude-haiku-4.5';
const TIMEOUT_MS = 8000;

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

/* One chat completion, as text. Throws on anything but a clean answer;
   the caller turns every throw into the default line. */
async function complete(key, model, city) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        // Optional on OpenRouter's side; they credit the app on their site.
        'HTTP-Referer': 'https://contentcreation.kkcreate.in',
        'X-Title': 'KK Create Creator Pass'
      },
      body: JSON.stringify({
        model,
        max_tokens: 100,   // two short lines; a hard reason to go this low
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: city }
        ]
      })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const choice = data && data.choices && data.choices[0];
    const content = choice && choice.message && choice.message.content;
    if (typeof content !== 'string') throw new Error('no content in reply');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

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

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    /* Not an error the page can do anything about — answer with the
       default and do not cache it, so setting the key takes effect on
       the next request. */
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ city, state: '', tagline: plain(city), source: 'unconfigured' });
    return;
  }
  let text = '';
  try {
    text = await complete(key, MODEL, city);
  } catch (e) {
    /* Rate-limited, upstream down, or the timeout — the page gets the
       default line either way. Logged so it shows in Vercel's function
       logs; the message is the status or the abort, never the key. */
    console.error('tagline: ' + (e && e.name === 'AbortError' ? 'timeout' : (e && e.message)) + ' for ' + city);
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
