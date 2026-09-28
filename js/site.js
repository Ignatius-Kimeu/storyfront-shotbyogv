/* Shotbyogv — shared behaviour for every page. Vanilla, no libraries. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- preload splash: logo shows instantly, fades once the page is ready ---- */
  const splash = document.querySelector('.splash');
  if (splash) {
    const hide = () => { splash.classList.add('done'); document.dispatchEvent(new Event('splashdone')); };
    const min = reduce ? 0 : 700, t0 = performance.now();
    const go = () => setTimeout(hide, Math.max(0, min - (performance.now() - t0)));
    if (document.readyState === 'complete') go(); else addEventListener('load', go);
    setTimeout(hide, 4000); // never hold anyone hostage on slow data
  }

  /* ---- smart sticky header: hides going down, returns on any scroll up ---- */
  const header = document.querySelector('.site-header');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('scrolled', y > 40);
    if (y > lastY && y > 160) header.classList.add('hide');
    else if (y < lastY) header.classList.remove('hide');
    lastY = y; ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---- mobile menu ---- */
  const panel = document.querySelector('.mobile-panel');
  document.querySelectorAll('[data-menu]').forEach(b => b.addEventListener('click', () => {
    const open = b.dataset.menu === 'open';
    panel.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    document.querySelector('.menu-btn').setAttribute('aria-expanded', open);
    if (open) panel.querySelector('[data-menu="close"]').focus();
  }));

  /* ---- scroll reveal ---- */
  const rv = document.querySelectorAll('.rv');
  if (reduce || !('IntersectionObserver' in window)) rv.forEach(el => el.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(el => io.observe(el));
  }

  /* ---- scroll-linked tilt on photo cards (kept under ±1°, rAF-throttled) ---- */
  const tilts = [...document.querySelectorAll('.tilt')];
  if (tilts.length && !reduce) {
    let raf = 0;
    const upd = () => {
      const h = innerHeight;
      tilts.forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > h) return;
        const k = ((r.top + r.height / 2) / h - .5) * 2; el.style.setProperty('--rx', (k * .9).toFixed(3) + 'deg'); });
      raf = 0;
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true }); upd();
  }

  /* ---- fullscreen lightbox: any [data-lb] button, grouped by data-lb-group ---- */
  const lb = document.querySelector('.lb');
  if (lb) {
    const img = lb.querySelector('img'), capB = lb.querySelector('.lb-cap b'), capS = lb.querySelector('.lb-cap span'), count = lb.querySelector('.count');
    let set = [], i = 0, lastFocus = null;
    const show = n => {
      i = (n + set.length) % set.length; const it = set[i];
      img.classList.remove('in');
      const pre = new Image(); pre.onload = () => { img.src = it.dataset.full; img.alt = it.querySelector('img').alt; requestAnimationFrame(() => img.classList.add('in')); };
      pre.src = it.dataset.full;
      capB.textContent = it.dataset.title; capS.textContent = it.dataset.note || '';
      count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(set.length).padStart(2, '0');
    };
    const open = el => { lastFocus = el; set = [...document.querySelectorAll(`[data-lb][data-lb-group="${el.dataset.lbGroup}"]`)]; show(set.indexOf(el)); lb.classList.add('open'); document.body.style.overflow = 'hidden'; lb.querySelector('.x').focus(); };
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; img.classList.remove('in'); lastFocus && lastFocus.focus(); };
    document.querySelectorAll('[data-lb]').forEach(el => el.addEventListener('click', () => open(el)));
    lb.querySelector('.x').addEventListener('click', close);
    lb.querySelector('.prev').addEventListener('click', () => show(i - 1));
    lb.querySelector('.next').addEventListener('click', () => show(i + 1));
    lb.querySelector('.lb-stage').addEventListener('click', e => { if (e.target === e.currentTarget) close(); });
    addEventListener('keydown', e => { if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
    let sx = null; // swipe on phones
    lb.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    lb.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); sx = null; });
  }

  /* ---- viewfinder video players: tap to play (never autoplay), one at a time ---- */
  const players = [...document.querySelectorAll('.vf')];
  const tc = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), sec = Math.floor(s % 60), fr = Math.floor((s % 1) * 25);
    return `00:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(fr).padStart(2, '0')}`; };
  const stop = p => { const v = p.querySelector('video'); p.classList.remove('playing'); v.pause(); p.querySelector('.state').textContent = 'STBY'; };
  const start = p => {
    players.forEach(o => o !== p && stop(o));
    const v = p.querySelector('video');
    if (!v.getAttribute('src')) { v.src = p.dataset.src; }
    p.classList.add('playing'); p.querySelector('.state').textContent = 'REC';
    v.play().catch(err => {
      // a pause() from another player aborts this play() — that's expected, don't retry
      if (err.name !== 'NotAllowedError' || !p.classList.contains('playing')) return;
      v.muted = true; p.querySelector('.snd').setAttribute('aria-pressed', 'false'); v.play().catch(() => stop(p));
    });
  };
  players.forEach(p => {
    const v = p.querySelector('video'), snd = p.querySelector('.snd'), fs = p.querySelector('.fs'), prog = p.querySelector('.prog'), time = p.querySelector('.time');
    const toggle = () => p.classList.contains('playing') ? stop(p) : start(p);
    p.addEventListener('click', e => { if (e.target.closest('.ctl')) return; toggle(); });
    p.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === p) { e.preventDefault(); toggle(); } });
    snd.addEventListener('click', () => { v.muted = !v.muted; snd.setAttribute('aria-pressed', String(!v.muted)); snd.setAttribute('aria-label', v.muted ? 'Turn sound on' : 'Turn sound off'); });
    fs.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (p.requestFullscreen) p.requestFullscreen().catch(() => v.webkitEnterFullscreen && v.webkitEnterFullscreen());
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    });
    v.addEventListener('timeupdate', () => { prog.style.width = (v.currentTime / v.duration * 100 || 0) + '%'; time.textContent = tc(v.currentTime); });
    v.addEventListener('ended', () => { stop(p); v.currentTime = 0; prog.style.width = 0; time.textContent = tc(0); });
    v.addEventListener('pause', () => { if (!v.ended && p.classList.contains('playing') && !document.fullscreenElement) stop(p); });
  });

  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
})();
