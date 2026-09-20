/* /certificate — the Creator Pass generator.

   Five jobs: open the form when "Customise" is pressed, write what is
   typed into both cards as it is typed, put the chosen photo in the
   frames, ask /api/tagline for the city's line, and turn whichever card
   is showing into a PNG. Nothing here is saved anywhere — the pass
   exists on this screen until it is downloaded.

   With scripting off the page still shows the sample pass; the buttons
   simply do nothing. */

const CG = {
  /* The sample on the card as delivered. It stays on the card until the
     matching field has something in it, so the pass always looks
     finished — a half-blank certificate is a worse preview than someone
     else's. */
  sample: {
    name: 'Ananya Verma',
    city: 'Madhubani',
    state: 'Bihar',
    tagline: "From the land of Mithila painting, Madhubani's next storyteller.",
    gate: 214,
    dist: 'MDB'
  },

  /* The two cards, at the size each is laid out at. `story` also caps
     how tall it may show on screen — a 1920px preview is a lot of page
     — as a share of the viewport. */
  formats: {
    card: { id: 'card', w: 1280, h: 560, file: 'KK-Create-Creator-Pass' },
    story: { id: 'story', w: 1080, h: 1920, file: 'KK-Create-Creator-Pass-Story', maxVh: 0.8 }
  },

  /* The line under the details. /api/tagline writes one per city (see
     api/tagline.js); this is what the card says until it answers, and
     what it says if it never does. */
  defaultTagline: city => city + "'s next storyteller.",

  /* How long after the last keystroke in the city field to ask for its
     line. Long enough that "Mad" → "Madhubani" is one request, not four. */
  taglineDelayMs: 700,

  /* The photo is redrawn at this size before it goes in the frame. The
     frame is 140px on a 1280px card and the PNG is taken at 2x, so 800px
     is already more than it can show — and a 4000px phone photo pasted
     into the card as a data URI would make the export crawl. */
  photoMaxPx: 800,

  /* The PNG is this many times the card's 1280x560. 2x is what a phone
     screen shows and enough for a print. */
  pixelRatio: 2,

  fileName: (stem, name) => stem + '-' + name.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') + '.png'
};

const $ = id => document.getElementById(id);
const F = { name: $('fName'), city: $('fCity'), tag: $('fTag'), photo: $('fPhoto') };

let format = 'card';
const current = () => CG.formats[format];
const currentNode = () => $(current().id);

/* ---------- The card ---------- */

function setField(field, value) {
  document.querySelectorAll('[data-f="' + field + '"]').forEach(el => { el.textContent = value; });
}

/* A three-letter code for the city, the way the sample turns Madhubani
   into MDB: the first letter, then the consonants. Decorative — it goes on
   the gate sign, the milestone and the certificate code. */
function districtCode(city) {
  const letters = city.toUpperCase().replace(/[^A-Z]/g, '');
  if (!letters) return CG.sample.dist;
  const code = letters[0] + letters.slice(1).replace(/[AEIOU]/g, '');
  return (code + letters.slice(1) + 'XXX').slice(0, 3);
}

/* A four-digit pass number from the name and city, so the same person
   gets the same number every time they come back. Not unique across
   people, and not meant to be — it is a boarding-pass detail, not an ID. */
function passNumber(name, city) {
  let h = 5381;
  const s = (name + '|' + city).toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return 1000 + (h % 9000);
}

/* What the tagline field is showing came from one of three places, in
   order of precedence: the person typed it, /api/tagline wrote it for
   this city, or it is the default. `written` is the city the API's line
   was written for, so a change of city retires it — and the state it
   named goes with it. */
const tag = { typed: false, written: '', line: '', state: '' };

const UNLOCK_HINT = 'Fill in your name and city to unlock the download.';
let wasComplete = null;

function render() {
  const name = F.name.value.trim();
  const city = F.city.value.trim();
  const complete = Boolean(name && city);

  const n = name || CG.sample.name;
  const c = city || CG.sample.city;

  let line;
  if (tag.typed && F.tag.value.trim()) line = F.tag.value.trim();
  else if (city && tag.written === city && tag.line) line = tag.line;
  else if (city) line = CG.defaultTagline(c);
  else line = CG.sample.tagline;
  if (!tag.typed) F.tag.value = city ? line : '';
  F.tag.placeholder = city ? CG.defaultTagline(c) : CG.sample.tagline;

  const num = complete ? passNumber(n, c) : CG.sample.gate;

  const state = city ? (tag.written === city ? tag.state : '') : CG.sample.state;

  setField('name', n);
  setField('city', c);
  setField('place', state ? c + ', ' + state : c);
  setField('tagline', line);
  setField('dist', city ? districtCode(c) : CG.sample.dist);
  setField('gate', String(num));
  setField('num4', String(num).padStart(4, '0'));

  ['btnPng', 'btnShare', 'btnPrint'].forEach(id => { $(id).disabled = !complete; });

  /* The unlock hint comes and goes with the form; anything else in the
     status line (saved, failed) is left for the next click to replace. */
  if (complete !== wasComplete && !busy) status(complete ? '' : UNLOCK_HINT);
  wasComplete = complete;
}

F.name.addEventListener('input', render);
F.city.addEventListener('input', () => { render(); askForTagline(); });
F.tag.addEventListener('input', () => {
  /* Clearing the field hands it back to the generated line. */
  tag.typed = F.tag.value.trim() !== '';
  render();
});

/* ---------- The city's line ---------- */

let taglineTimer = 0;
let taglineAbort = null;
const taglineCache = {};

function askForTagline() {
  clearTimeout(taglineTimer);
  if (taglineAbort) { taglineAbort.abort(); taglineAbort = null; }
  const city = F.city.value.trim();
  hint('');
  if (city.length < 2) return;
  if (taglineCache[city]) { adoptTagline(city, taglineCache[city]); return; }
  taglineTimer = setTimeout(() => fetchTagline(city), CG.taglineDelayMs);
}

async function fetchTagline(city) {
  const ctrl = new AbortController();
  taglineAbort = ctrl;
  if (!tag.typed) hint('Writing a line for ' + city + '…', true);
  try {
    const r = await fetch('/api/tagline?city=' + encodeURIComponent(city.toLowerCase()), { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (data && typeof data.tagline === 'string' && data.tagline.length <= 90) {
      const state = typeof data.state === 'string' && data.state.length <= 30 ? data.state : '';
      taglineCache[city] = { line: data.tagline, state };
      adoptTagline(city, taglineCache[city]);
    }
  } catch (e) {
    /* Aborted (they kept typing), offline, or the API is not set up on
       this deployment. The default line is already on the card. */
  } finally {
    if (taglineAbort === ctrl) taglineAbort = null;
    hint('');
  }
}

function adoptTagline(city, written) {
  tag.written = city;
  tag.line = written.line;
  tag.state = written.state;
  render();
}

function hint(text, writing) {
  const el = $('tagHint');
  el.textContent = text;
  el.classList.toggle('is-writing', Boolean(writing));
}

/* ---------- The photo ---------- */

F.photo.addEventListener('change', () => {
  const file = F.photo.files && F.photo.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    /* Redraw small. Browsers apply the photo's EXIF rotation when
       decoding, so a portrait phone photo comes out the right way up. */
    const scale = Math.min(1, CG.photoMaxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const src = c.toDataURL('image/jpeg', 0.9);
    document.querySelectorAll('.js-photo-img').forEach(el => { el.src = src; el.hidden = false; });
    document.querySelectorAll('.js-photo-box').forEach(el => el.classList.add('has-photo'));
    $('photoName').textContent = 'Photo added · change';
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    status('That photo could not be read. Try a JPG or PNG.', true);
  };
  img.src = url;
});

/* ---------- Pass or story, and fitting it to the screen ---------- */

function fit() {
  const f = current();
  const stage = $('stage');
  let s = Math.min(1, stage.clientWidth / f.w);
  if (f.maxVh) s = Math.min(s, (window.innerHeight * f.maxVh) / f.h);
  const scale = $('scale');
  scale.style.width = f.w + 'px';
  scale.style.height = f.h + 'px';
  scale.style.transform = 'translateX(-50%) scale(' + s + ')';
  stage.style.height = Math.round(f.h * s) + 'px';
}
window.addEventListener('resize', fit);

/* The print sheet is a CSS @page rule, so the story's shape is written
   into a stylesheet of its own when it is the one showing. */
const pageRule = document.createElement('style');
document.head.appendChild(pageRule);

function showFormat(name) {
  format = name;
  Object.keys(CG.formats).forEach(k => { $(CG.formats[k].id).hidden = k !== name; });
  document.querySelectorAll('.cg-format').forEach(b => {
    const on = b.dataset.format === name;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-checked', String(on));
  });
  const f = current();
  pageRule.textContent = '@page { size: ' + f.w + 'px ' + f.h + 'px; margin: 0; }';
  fit();
}
document.querySelectorAll('.cg-format').forEach(b => {
  b.addEventListener('click', () => showFormat(b.dataset.format));
});
showFormat('card');

/* ---------- Customise ---------- */

$('btnStart').addEventListener('click', () => {
  $('form').hidden = false;
  $('start').hidden = true;
  $('actions').hidden = false;
  render();
  $('form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => F.name.focus({ preventScroll: true }), 400);
});

/* ---------- Download ---------- */

let busy = false;
let fontCss = null;

function status(text, error) {
  const el = $('status');
  el.textContent = text;
  el.classList.toggle('is-error', Boolean(error));
}

function setBusy(on, label) {
  busy = on;
  ['btnPng', 'btnShare', 'btnPrint'].forEach(id => {
    $(id).disabled = on;
    $(id).classList.toggle('is-busy', on);
  });
  if (label !== undefined) status(label);
}

/* The card that is showing, as a PNG data URL, at full size regardless
   of the stage's scale. The fonts are embedded once and reused; Safari
   needs a first pass to decode them before the pass that is kept, so
   the first download here takes two goes. */
async function capture() {
  if (typeof htmlToImage === 'undefined') throw new Error('html-to-image did not load');
  const f = current();
  const node = currentNode();
  const opts = {
    width: f.w,
    height: f.h,
    pixelRatio: CG.pixelRatio,
    skipAutoScale: true,
    cacheBust: false,
    /* The library loads every <img> in the clone and gives up on the
       first that fails — and the photo frame's <img> has no src until a
       photo is chosen. Leave it out while it is empty. */
    filter: n => !(n.classList && n.classList.contains('js-photo-img') && n.hidden)
  };
  node.classList.add('capture');
  try {
    if (!fontCss) fontCss = await htmlToImage.getFontEmbedCSS(node);
    opts.fontEmbedCSS = fontCss;
    await htmlToImage.toPng(node, opts);
    return await htmlToImage.toPng(node, opts);
  } finally {
    node.classList.remove('capture');
  }
}

function pngToBlob(dataUrl) {
  const bytes = atob(dataUrl.split(',')[1]);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: 'image/png' });
}

$('btnPng').addEventListener('click', async () => {
  if (busy) return;
  setBusy(true, 'Making your pass…');
  try {
    const url = await capture();
    const a = document.createElement('a');
    a.href = url;
    a.download = CG.fileName(current().file, F.name.value.trim());
    document.body.appendChild(a);
    a.click();
    a.remove();
    setBusy(false, 'Saved. Share it on your profiles!');
  } catch (e) {
    setBusy(false);
    status('That did not work. Try again, or use Print / Save PDF.', true);
  }
  render();
});

/* On a phone, sharing is how a picture gets to WhatsApp or Instagram;
   the button appears only where the browser can share a file. */
(function () {
  if (!navigator.share || !navigator.canShare) return;
  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
    if (!navigator.canShare({ files: [probe] })) return;
  } catch (e) { return; }
  const btn = $('btnShare');
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true, 'Making your pass…');
    try {
      const url = await capture();
      const file = new File([pngToBlob(url)], CG.fileName(current().file, F.name.value.trim()), { type: 'image/png' });
      setBusy(false, '');
      await navigator.share({ files: [file], title: 'My KK Create Creator Pass' });
      status('Shared!');
    } catch (e) {
      setBusy(false);
      if (e && e.name !== 'AbortError') status('That did not work. Try Download PNG instead.', true);
      else status('');
    }
    render();
  });
})();

$('btnPrint').addEventListener('click', () => {
  if (!busy) window.print();
});

render();
