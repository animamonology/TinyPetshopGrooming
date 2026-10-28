/* TinyPet landing: scroll story (GSAP + ScrollTrigger + Lenis) and the WhatsApp booking form. */
gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

if (reduce) document.documentElement.classList.add('rm');
// iOS toolbar show/hide fires resize; refreshing pins on it is what makes them jump.
ScrollTrigger.config({ ignoreMobileResize: true });

/* ---------- smooth scroll: wheel only, touch keeps native iOS momentum ---------- */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const target = $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(target, { duration: 1.6 }) : target.scrollIntoView();
}));

/* ---------- headline lines become masked reveals ---------- */
$$('.display, .hero-title').forEach((h) => {
  h.classList.add('split');
  $$('.line', h).forEach((l) => { l.innerHTML = `<span class="w">${l.innerHTML}</span>`; });
});

/* ---------- intro ---------- */
function startIntro() {
  window.__tpIntro = true;
  window.dispatchEvent(new Event('tinypet:intro'));
  if (reduce) { $('.loader').remove(); return; }
  gsap.timeline({ onComplete: () => $('.loader')?.remove() })
    .to('.loader', { yPercent: -100, duration: 1, ease: 'expo.inOut' })
    .from('.hero-title .w', { yPercent: 115, duration: 1.3, stagger: 0.1, ease: 'expo.out' }, '-=.45')
    .from('.hero .eyebrow, .hero-scribble, .hero-sub, .hero-cta', { y: 24, autoAlpha: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out' }, '-=1')
    .from('.hero-stack .polaroid', { y: 160, rotation: (i) => [-22, 16, 26][i], autoAlpha: 0, stagger: 0.12, duration: 1.4, ease: 'expo.out' }, '-=1.2')
    .from('.nav', { y: -30, autoAlpha: 0, duration: 0.8 }, '-=1.1');
}
// ponytail: fonts or 2.5s, whichever first, so a slow font CDN never holds the page hostage
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])
  .then(() => setTimeout(startIntro, 350));

if (!reduce) {
  /* ---------- reveals ---------- */
  $$('.display').forEach((h) => {
    if (h.closest('.hero')) return;
    gsap.from($$('.w', h), { yPercent: 115, duration: 1.2, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } });
  });
  $$('.lede, .scribble, .chapter-no').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.from(el, { y: 30, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  /* polaroids drop in like they were just taped, then drift at their own depth */
  $$('.mess .polaroid, .why-photo, .promo-photo').forEach((p, i) => {
    gsap.from(p, { y: 140, rotation: i % 2 ? 18 : -18, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 90%' } });
  });
  $$('[data-depth]').forEach((p) => {
    gsap.to(p, { yPercent: -18 * Number(p.dataset.depth), ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // desktop: hero photos lean toward the cursor
  if (matchMedia('(pointer: fine)').matches) {
    const movers = $$('.hero-stack .polaroid').map((p) => ({ d: Number(p.dataset.depth), x: gsap.quickTo(p, 'x', { duration: 1, ease: 'power3' }), r: gsap.quickTo(p, 'rotationY', { duration: 1, ease: 'power3' }) }));
    addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      movers.forEach((m) => { m.x(nx * 40 * m.d); m.r(nx * 10); });
    });
  }

  gsap.from('.pains li', { x: -40, autoAlpha: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.pains', start: 'top 80%' } });

  /* ---------- chapter 2: the ride across town ---------- */
  const road = $('#road');
  const len = road.getTotalLength();
  const pins = [[0.16, '.pin-1', '.a1'], [0.55, '.pin-2', '.a2'], [0.97, '.pin-3', '.a3']];
  gsap.set(road, { strokeDasharray: len, strokeDashoffset: len });
  gsap.timeline({
    scrollTrigger: {
      trigger: '.route-pin', start: 'top top', end: '+=170%', pin: true, scrub: 1,
      onUpdate: ({ progress }) => pins.forEach(([at, pin, area]) => {
        $(pin).classList.toggle('lit', progress >= at);
        $(area).classList.toggle('lit', progress >= at);
      }),
    },
  })
    .to(road, { strokeDashoffset: 0, ease: 'none', duration: 1 }, 0)
    .to('#rider', { motionPath: { path: road, align: road, alignOrigin: [0.5, 0.5] }, ease: 'none', duration: 1 }, 0);

  /* ---------- chapter 3: horizontal walk through the visit ---------- */
  const track = $('.track');
  const dist = () => track.scrollWidth - innerWidth;
  gsap.timeline({
    scrollTrigger: { trigger: '.process-pin', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
  })
    .to(track, { x: () => -dist(), ease: 'none' }, 0)
    .to('.progress span', { scaleX: 1, ease: 'none' }, 0);

  /* ---------- why: words grow in as you pass them ---------- */
  $$('.why-big').forEach((w) => {
    gsap.from(w, { yPercent: 40, scale: 0.85, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: w, start: 'top 95%', end: 'top 55%', scrub: true } });
  });

  /* ---------- menu ---------- */
  const num = $('.price-num');
  const count = { v: 0 };
  num.textContent = '0';
  gsap.to(count, {
    v: 60, duration: 1.8, ease: 'power3.out', onUpdate: () => { num.textContent = Math.round(count.v); },
    scrollTrigger: { trigger: '.price-hero', start: 'top 75%' },
  });
  $$('.menu-list').forEach((list) => gsap.from(list.children, { y: 40, autoAlpha: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: list, start: 'top 82%' } }));
  gsap.from('.chips li', { scale: 0.6, autoAlpha: 0, stagger: 0.07, duration: 0.7, ease: 'back.out(2)', scrollTrigger: { trigger: '.chips', start: 'top 88%' } });

  /* ---------- promo + booking ---------- */
  gsap.from('.promo-amount', { scale: 0.7, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.promo-amount', start: 'top 85%' } });
  gsap.from('.book-form', { y: 120, rotation: 6, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.book-form', start: 'top 90%' } });
  gsap.from('.outro-title > *', { yPercent: 60, autoAlpha: 0, stagger: 0.12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.outro-title', start: 'top 85%' } });
}

/* ---------- section colour: body background follows the chapter on screen.
   Created after the pins so their start/end include pin spacing. ---------- */
const themeMeta = $('meta[name="theme-color"]');
$$('[data-bg]').forEach((s) => ScrollTrigger.create({
  trigger: s, start: 'top 55%', end: 'bottom 55%',
  onToggle: (self) => {
    if (!self.isActive) return;
    gsap.to(document.body, { '--bg': s.dataset.bg, '--fg': s.dataset.ink, duration: reduce ? 0 : 0.9, ease: 'power2.out', overwrite: 'auto' });
    themeMeta.content = s.dataset.bg;
  },
}));

/* ---------- floating WhatsApp button: after the hero, hidden from the form onward (form + outro have their own WhatsApp buttons) ---------- */
const fab = $('.fab');
let pastHero = false;
let atForm = false;
const syncFab = () => fab.classList.toggle('on', pastHero && !atForm);
ScrollTrigger.create({ trigger: '.hero', start: 'bottom 30%', onToggle: (s) => { pastHero = s.isActive || s.progress === 1; syncFab(); }, end: 'max' });
ScrollTrigger.create({ trigger: '#booking', start: 'top 80%', end: 'max', onToggle: (s) => { atForm = s.isActive; syncFab(); } });

/* ---------- booking form → WhatsApp ---------- */
const WA_NUMBER = '6282123639959';
const form = $('#bookForm');
const msg = $('.form-msg', form);
const isoDate = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
form.tanggal.min = isoDate(new Date());

function checkForm(f) {
  const today = isoDate(new Date());
  const day = f.tanggal ? new Date(`${f.tanggal}T00:00`).getDay() : -1;
  const qty = Number(f.jumlah);
  if (f.nama.trim().length < 2) return ['nama', 'Nama kamu siapa?'];
  if (!f.area) return ['area', 'Pilih area dulu ya.'];
  if (!f.jenis) return ['jenis', 'Anabulnya anjing atau kucing?'];
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) return ['jumlah', 'Jumlah anabul 1 sampai 20 ya.'];
  if (!f.tanggal || f.tanggal < today) return ['tanggal', 'Pilih tanggal mulai hari ini.'];
  if (day === 5) return ['tanggal', 'Jumat kami libur. Pilih hari lain ya.'];
  if (!f.paket) return ['paket', 'Pilih paket, atau "Belum tahu".'];
  return null;
}

form.tanggal.addEventListener('change', () => {
  const friday = form.tanggal.value && new Date(`${form.tanggal.value}T00:00`).getDay() === 5;
  msg.className = 'form-msg';
  msg.textContent = friday ? 'Jumat kami libur. Pilih hari lain ya.' : '';
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
  const problem = checkForm(f);
  if (problem) {
    const [field, text] = problem;
    form[field].setAttribute('aria-invalid', 'true');
    form[field].focus();
    msg.className = 'form-msg';
    msg.textContent = text;
    return;
  }
  const tgl = new Date(`${f.tanggal}T00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const text = [
    'Halo Mimin TinyPet! Mau booking grooming ke rumah 🐾',
    '',
    `Nama: ${f.nama.trim()}`,
    `Area: ${f.area}`,
    `Anabul: ${f.jumlah} ekor (${f.jenis.toLowerCase()})`,
    `Paket: ${f.paket}`,
    `Tanggal: ${tgl}`,
    f.catatan.trim() ? `Catatan: ${f.catatan.trim()}` : null,
  ].filter((l) => l !== null).join('\n');
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  msg.className = 'form-msg ok';
  msg.textContent = 'Membuka WhatsApp…';
  // no 'noopener' feature string: with it window.open returns null and the fallback would fire too
  if (!window.open(url, '_blank')) location.href = url;
});
