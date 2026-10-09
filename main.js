(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';

  /* ---------- relógio de são paulo ---------- */
  const clock = $('.clock');
  const tick = () => {
    clock.textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date());
  };
  tick(); setInterval(tick, 15000);

  /* ---------- data e número no livro ---------- */
  $('.livro__date').textContent = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date()).toLowerCase();

  /* ---------- vídeos tocam só quando visíveis ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { rootMargin: '200px 0px' });
  $$('main video').forEach(v => io.observe(v));

  /* ---------- cursor ---------- */
  const cur = $('.cursor');
  if (fine) {
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; });
    const loop = () => { cx += (x - cx) * .22; cy += (y - cy) * .22; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener('pointerover', e => {
      const w = e.target.closest('[data-lb], .board__card');
      cur.classList.toggle('is-view', !!w && !e.target.closest('.acervo__view.is-drag'));
    });
  }

  /* ---------- lightbox ---------- */
  const lb = $('.lb'), stage = $('.lb__stage'), lbl = $('.lb__label');
  const videos = { mar: 'video/mar.mp4', caesar: 'video/caesar.mp4', chivas: 'video/chivas.mp4', dendezeiro: 'video/dendezeiro.mp4', descansar: 'video/descansar.mp4', teaser: 'video/teaser.mp4', pace: 'video/pace.mp4' };
  let lenis;
  const openLb = (el, key) => {
    stage.innerHTML = '';
    if (key && videos[key]) {
      const v = document.createElement('video');
      v.src = videos[key]; v.controls = true; v.playsInline = true; v.autoplay = true;
      stage.append(v);
      v.play().catch(() => { v.muted = true; v.play(); });
    } else {
      const src = el.querySelector('img')?.getAttribute('src');
      if (!src) return;
      const i = new Image(); i.src = src; i.alt = el.querySelector('img').alt;
      stage.append(i);
    }
    const cap = el?.querySelector('.label');
    lbl.innerHTML = cap ? [...cap.children].map((c, n) => n ? c.textContent : `<b>${c.textContent}</b>`).join(' · ') : '';
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
    lenis?.stop();
    $$('main video').forEach(v => v.pause());
  };
  const closeLb = () => {
    lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
    setTimeout(() => { stage.innerHTML = ''; }, 400);
    lenis?.start();
  };
  let downAt = null;
  document.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-lb-open]');
    if (btn) { openLb($('#sala-04 .sala04__copy'), btn.dataset.lbOpen); lbl.innerHTML = '<b>descansar é pecado</b> · obelga & ana frango elétrico · dirigido por alysson freitas e pie leonardi'; return; }
    const w = e.target.closest('[data-lb]');
    if (!w || lb.contains(w)) return;
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return; // foi arrasto
    openLb(w, w.dataset.lb);
  });
  $('.lb__close').addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb || e.target === stage) closeLb(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('is-open')) closeLb(); });

  /* ---------- planta ---------- */
  const rooms = $$('.pl-room'), items = $$('.planta__list li'), pimg = $('.planta__img img');
  const setRoom = id => {
    rooms.forEach(r => r.classList.toggle('is-on', r.dataset.room === id));
    items.forEach(r => r.classList.toggle('is-on', r.dataset.room === id));
    const r = rooms.find(r => r.dataset.room === id);
    if (r && !pimg.src.endsWith(r.dataset.img)) {
      if (hasGsap) gsap.fromTo(pimg, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: .6, ease: 'power3.out' });
      pimg.src = r.dataset.img;
    }
  };
  const goRoom = id => { const t = document.getElementById(id); if (!t) return; lenis ? lenis.scrollTo(t, { duration: 1.6 }) : t.scrollIntoView({ behavior: 'smooth' }); };
  [...rooms, ...items].forEach(el => {
    el.addEventListener('mouseenter', () => setRoom(el.dataset.room));
    el.addEventListener('focus', () => setRoom(el.dataset.room));
    el.addEventListener('click', () => goRoom(el.dataset.room));
    el.addEventListener('keydown', e => { if (e.key === 'Enter') goRoom(el.dataset.room); });
  });
  setRoom('sala-01');

  /* ---------- lanterna (sala 01) ---------- */
  const sala01 = $('#sala-01'), lan = $('.lanterna');
  if (fine) {
    sala01.addEventListener('pointermove', e => {
      const r = sala01.getBoundingClientRect();
      lan.style.setProperty('--lx', `${e.clientX - r.left}px`);
      lan.style.setProperty('--ly', `${e.clientY - r.top}px`);
    });
  }

  /* ---------- acervo arrastável ---------- */
  const view = $('.acervo__view'), wall = $('.acervo__wall');
  {
    let px = 0, py = 0, vx = 0, vy = 0, drag = false, sx = 0, sy = 0, ox = 0, oy = 0, lx = 0, ly = 0;
    const bounds = () => ({ minX: Math.min(0, view.clientWidth - wall.offsetWidth), minY: Math.min(0, view.clientHeight - wall.offsetHeight) });
    const clamp = () => { const b = bounds(); px = Math.max(b.minX, Math.min(0, px)); py = Math.max(b.minY, Math.min(0, py)); };
    const apply = () => { wall.style.transform = `translate3d(${px}px,${py}px,0)`; };
    // começa centrado
    requestAnimationFrame(() => { const b = bounds(); px = b.minX / 2.4; py = b.minY / 3; apply(); });
    view.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return; // no toque, deixa o rolar da página e usa o swipe horizontal abaixo
      drag = true; view.classList.add('is-drag'); sx = e.clientX; sy = e.clientY; ox = px; oy = py; lx = e.clientX; ly = e.clientY; vx = vy = 0;
      view.setPointerCapture(e.pointerId);
    });
    view.addEventListener('pointermove', e => {
      if (!drag) return;
      px = ox + (e.clientX - sx); py = oy + (e.clientY - sy);
      vx = e.clientX - lx; vy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      clamp(); apply();
    });
    const end = () => {
      if (!drag) return; drag = false; view.classList.remove('is-drag');
      const glide = () => { vx *= .92; vy *= .92; px += vx; py += vy; clamp(); apply(); if (Math.abs(vx) + Math.abs(vy) > .4) requestAnimationFrame(glide); };
      glide();
    };
    view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);
    // toque: só eixo horizontal, a página continua rolando na vertical
    let tx = 0, ty = 0, tox = 0, lock = null;
    view.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; tox = px; lock = null; }, { passive: true });
    view.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
      if (lock === null && Math.hypot(dx, dy) > 6) lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (lock === 'x') { e.preventDefault(); px = tox + dx; clamp(); apply(); }
    }, { passive: false });
    addEventListener('resize', () => { clamp(); apply(); });
  }

  /* ---------- livro de visitas → direct ---------- */
  $('#livro').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const nome = f.get('nome').trim(), marca = f.get('marca').trim(), tipo = f.get('tipo'), ideia = f.get('ideia').trim();
    const msg = `oi alysson! aqui é ${nome}${marca ? ` (${marca})` : ''}. assinei o livro de visitas do seu site e quero criar ${tipo} com você.${ideia ? `\n\n${ideia}` : ''}`;
    try { await navigator.clipboard.writeText(msg); } catch (_) {}
    $('.livro__ok').hidden = false;
    window.open('https://ig.me/m/alyssonfreitaz', '_blank', 'noopener');
  });

  /* ================= GSAP ================= */
  const loader = $('.loader');
  if (!hasGsap || reduce) {
    loader.remove();
    $$('.sala05__stat b, .sala02__stats b').forEach(b => { b.textContent = Number(b.dataset.count).toLocaleString('pt-BR'); });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: .1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = $(a.getAttribute('href')); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { duration: 1.6 });
    }));
  }

  /* abertura */
  document.body.classList.add('is-loading');
  lenis?.stop();
  const count = $('.loader__count'), bar = $('.loader__bar i');
  const intro = gsap.timeline({ onComplete: () => { loader.remove(); document.body.classList.remove('is-loading'); lenis?.start(); ScrollTrigger.refresh(); } });
  const prog = { v: 0 };
  intro
    .to('.loader__name > *', { y: 0, duration: 1.1, stagger: .12, ease: 'expo.out' }, .1)
    .to(prog, { v: 100, duration: 1.8, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(prog.v)).padStart(3, '0'); bar.style.width = prog.v + '%'; } }, 0)
    .to('.loader__name > *', { y: '-105%', duration: .7, stagger: .06, ease: 'expo.in' }, '+=.15')
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'expo.inOut' }, '-=.2')
    .from('.entrada__word', { yPercent: 40, opacity: 0, duration: 1.2, stagger: .12, ease: 'expo.out' }, '-=.5')
    .from('.entrada__work .frame', { y: 60, opacity: 0, scale: .94, duration: 1.2, ease: 'expo.out' }, '<.1')
    .from('.entrada__small, .entrada__meta, .label--entrada, .entrada__scroll', { opacity: 0, duration: .8 }, '<.3');
  loader.style.clipPath = 'inset(0 0 0% 0)';

  /* entrada: a parede vira mar */
  const mm = gsap.matchMedia();
  const ent = gsap.timeline({ scrollTrigger: { trigger: '.entrada', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  ent
    .to('.entrada__word--a', { xPercent: -30, opacity: 0, ease: 'none' }, 0)
    .to('.entrada__word--b', { xPercent: 30, opacity: 0, ease: 'none' }, 0)
    .to('.entrada__small, .entrada__meta, .entrada__scroll, .label--entrada', { opacity: 0, ease: 'none', duration: .3 }, 0)
    .to('.entrada__sea', { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: .7 }, .15)
    .to('.entrada__work .frame', { scale: () => Math.min(1.9, (innerHeight * .92) / $('.entrada__work .frame').offsetHeight), ease: 'power2.inOut', duration: .8 }, .1);

  /* texto de parede: linhas sobem */
  $$('.reveal-lines').forEach(el => {
    const words = el.innerHTML.split(/(<em>.*?<\/em>)/).flatMap(part => part.startsWith('<em>') ? [part] : part.split(' ').filter(Boolean));
    el.innerHTML = words.map(w => `<span class="w" style="display:inline-block">${w}</span>`).join(' ');
    gsap.from(el.querySelectorAll('.w'), { yPercent: 60, opacity: 0, duration: 1, stagger: .035, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 80%' } });
  });
  gsap.from('.parede__cols > *', { y: 30, opacity: 0, stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.parede__cols', start: 'top 85%' } });

  /* planta: salas se desenham */
  gsap.from('.pl-room', { opacity: 0, y: 14, stagger: .08, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.planta__svg', start: 'top 75%' } });

  mm.add('(min-width: 761px)', () => {
    /* sala 01: parede horizontal */
    const track = $('.sala01__track');
    const dist = () => track.scrollWidth - innerWidth;
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '#sala-01', start: 'top top', end: () => '+=' + dist(), pin: '.sala01__pin', scrub: 1, invalidateOnRefresh: true }
    });
    /* lanterna abre aos poucos */
    gsap.fromTo(lan, { '--r': '320px' }, { '--r': '520px', ease: 'none', scrollTrigger: { trigger: '#sala-01', start: 'top top', end: () => '+=' + dist(), scrub: true } });

    /* sala 03: salão em paralaxe */
    $$('.salao .work').forEach(w => {
      gsap.to(w, { yPercent: () => -parseFloat(w.dataset.speed) * 260, ease: 'none', scrollTrigger: { trigger: '.salao', start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* sala 04: a tela abre */
    const cine = gsap.timeline({ scrollTrigger: { trigger: '#sala-04', start: 'top top', end: '+=160%', pin: '.sala04__pin', scrub: 1 } });
    cine
      .from('.sala04__poster', { rotate: -4, y: 60, duration: .3 }, 0)
      .to('.tela', { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 1 }, .25)
      .to('.sala04__copy, .sala04__poster', { opacity: .2, duration: .5 }, .3);
  });

  mm.add('(max-width: 760px)', () => {
    const cine = gsap.timeline({ scrollTrigger: { trigger: '#sala-04', start: 'top top', end: '+=120%', pin: '.sala04__pin', scrub: 1 } });
    cine.to('.tela', { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut' });
  });

  /* sala 02: números e storyboard */
  $$('[data-count]').forEach(b => {
    const n = { v: 0 };
    gsap.to(n, { v: +b.dataset.count, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: b, start: 'top 85%' }, onUpdate: () => { b.textContent = Math.round(n.v).toLocaleString('pt-BR'); } });
  });
  gsap.from('.board__card', { y: 80, opacity: 0, rotate: () => gsap.utils.random(-8, 8), stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.board', start: 'top 80%' } });

  /* película corre com o scroll */
  gsap.fromTo('.pelicula__track', { x: () => innerWidth * .1 }, { x: () => -($('.pelicula__track').scrollWidth - innerWidth * .9), ease: 'none', scrollTrigger: { trigger: '.pelicula', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });

  /* sala 05 */
  gsap.from('.sala05__tag', { yPercent: 30, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.sala05__tag', start: 'top 85%' } });
  gsap.from('.sala05__row .work', { y: 90, opacity: 0, stagger: .12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.sala05__row', start: 'top 80%' } });

  /* itinerância */
  gsap.from('.itin__list li', { xPercent: -8, opacity: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.itin__list', start: 'top 80%' } });

  /* ficha técnica: créditos sobem */
  $$('.ficha__col').forEach((c, i) => {
    c.innerHTML += c.innerHTML;
    gsap.fromTo(c, { yPercent: i % 2 ? -50 : 0 }, { yPercent: i % 2 ? 0 : -50, duration: 22 + i * 4, ease: 'none', repeat: -1 });
  });

})();
