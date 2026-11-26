"use strict";
/* 會走的發光麋鹿 — wandering luminous stag overlay.
   Fixed layer, pointer-events:none; reuses the page's own 4-frame walk sprite sheet
   (stag-walk.webp) and the standing "watching" portrait (stag-watch.webp). */
(() => {
 const W = 576, H = 512, HOOF = 476 / H;           // frame size and hoof line (fraction of height)
 const CONTACTS = [[263,462],[404,465],[286,458],[338,463]]; // measured hoof-contact point per frame
 const KEY = 'midnight-tarot-stag';
 const root = document.documentElement;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const narrow = matchMedia('(max-width:615px)');
 const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
 const lerp = (a, b, t) => a + (b - a) * t;
 const smooth = x => (x = clamp(x, 0, 1)) * x * (3 - 2 * x);
 const rnd = (a, b) => a + Math.random() * (b - a);

 let enabled = true;
 try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (e) {}

 // ---------- DOM ----------
 const layer = document.createElement('div');
 layer.className = 'stag-wander'; layer.setAttribute('aria-hidden', 'true');
 const sparks = document.createElement('canvas'); sparks.className = 'sw-sparks';
 const fig = document.createElement('div'); fig.className = 'sw-fig';
 const aura = document.createElement('i'); aura.className = 'sw-aura';
 const ground = document.createElement('i'); ground.className = 'sw-ground';
 const walk = document.createElement('div'); walk.className = 'sw-walk';
 const frames = [0, 1, 2, 3].map(i => {
  const f = document.createElement('i'); f.className = 'sw-frame';
  f.style.backgroundPosition = `${(i % 2) * 100}% ${Math.floor(i / 2) * 100}%`;
  walk.append(f); return f;
 });
 const pose = document.createElement('div'); pose.className = 'sw-pose';
 const poseImg = document.createElement('img'); poseImg.src = './stag-watch.webp?v=7'; poseImg.alt = ''; poseImg.decoding = 'async';
 pose.append(poseImg);
 const body = document.createElement('div'); body.className = 'sw-body'; body.append(walk, pose);
 fig.append(ground, aura, body);
 layer.append(sparks, fig);
 document.body.append(layer);

 const btn = document.createElement('button');
 btn.type = 'button'; btn.className = 'stag-toggle';
 btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14c-1-2.5-1-5-3.5-6.5M6 7.5 4 5M6 9.5 3 9M15 14c1-2.5 1-5 3.5-6.5M18 7.5 20 5M18 9.5l3-.5M9.5 10 8 4m6.5 6L16 4M9 14l3 6 3-6c-1-.8-5-.8-6 0Z"/></svg>';
 document.body.append(btn);

 // ---------- state ----------
 let vw = 0, vh = 0, dpr = 1, Wf = 300, Hf = 267;
 const ctx = sparks.getContext('2d');
 const st = {
  x: 0, y: 0, tx: 0, ty: 0, facing: -1, mode: 'pause', pauseLeft: 1.2, stand: 1,
  phase: 0, prevFrame: -1, alpha: 0, born: 0, lift: 0, liftT: -1, stopMid: 0, sinceStop: 0, turned: true
 };
 const parts = [];
 let raf = 0, last = 0, clock = 0;

 const depthScale = y => lerp(.74, 1.08, clamp(y / vh, 0, 1));
 function measure() {
  vw = innerWidth; vh = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
  sparks.width = Math.round(vw * dpr); sparks.height = Math.round(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  Wf = narrow.matches ? clamp(vw * .6, 190, 270) : clamp(vw * .24, 230, 380);
  Hf = Wf * H / W;
  fig.style.width = Wf + 'px'; fig.style.height = Hf + 'px';
  st.x = clamp(st.x, 0, vw); st.y = clamp(st.y, minY(st.y), vh);
  st.tx = clamp(st.tx, 0, vw); st.ty = clamp(st.ty, 0, vh);
 }
 const minY = y => Hf * .93 * depthScale(y) + 6;
 function pickTarget() {
  const mx = Wf * .28;
  let tx, ty, tries = 0;
  do {
   tx = rnd(mx, vw - mx);
   ty = rnd(minY(vh * .5), vh - 10);
   tries++;
  } while (tries < 12 && Math.hypot(tx - st.x, (ty - st.y) * 1.4) < Math.min(vw, vh) * .3);
  st.tx = tx; st.ty = clamp(ty, minY(ty), vh - 6);
 }
 function emit(x, y, n, spread, rise) {
  for (let i = 0; i < n && parts.length < 190; i++) {
   parts.push({
    x: x + rnd(-spread, spread), y: y + rnd(-spread * .5, spread * .5),
    vx: rnd(-6, 6), vy: -rnd(rise * .3, rise), r: rnd(.8, 2.6), life: 0, max: rnd(1.1, 2.3), tw: rnd(0, 6.28)
   });
  }
 }

 function begin(initial) {
  measure();
  if (initial) {
   // appear where the page's standing ghost-stag usually watches from
   st.x = vw * (narrow.matches ? .66 : .72);
   st.y = vh * (narrow.matches ? .5 : .62);
   st.mode = 'pause'; st.pauseLeft = 1.4; st.stand = 1; st.alpha = 0; st.facing = -1;
  }
 }

 // ---------- per-frame ----------
 function update(dt) {
  clock += dt;
  const s = depthScale(st.y);
  st.alpha = clamp(st.alpha + dt / 1.6, 0, 1);

  if (st.mode === 'pause') {
   st.stand = clamp(st.stand + dt / .7, 0, 1);
   st.pauseLeft -= dt;
   // head lift / glance partway through a pause
   if (st.liftT < 0 && st.pauseLeft < 1.9 && st.pauseLeft > .6 && Math.random() < dt * .8) st.liftT = 0;
   if (st.pauseLeft <= 0) {
    pickTarget();
    const want = st.tx >= st.x ? 1 : -1;
    if (want !== st.facing) { st.facing = want; }
    st.mode = 'walk'; st.sinceStop = 0; st.stopMid = rnd(3.5, 8);
   }
  } else {
   const dx = st.tx - st.x, dy = (st.ty - st.y), dist = Math.hypot(dx, dy);
   const wantStop = st.sinceStop > st.stopMid && dist > Wf * .8 && Math.random() < .3 && (st.stopMid = 1e9, true);
   if (dist < 3 || wantStop) {
    st.mode = 'pause'; st.pauseLeft = wantStop ? rnd(1.6, 2.6) : rnd(2.2, 5);
   } else {
    // leave the standing pose first, then accelerate / brake near the target
    st.stand = clamp(st.stand - dt / .45, 0, 1);
    const go = Math.pow(1 - st.stand, 2);
    const brake = clamp(dist / (Wf * .55 * s), .22, 1);
    const speed = .26 * Wf * s * go * brake;            // px / s along the ground
    const step = Math.min(dist, speed * dt);
    st.x += dx / dist * step; st.y += dy / dist * step * .82;
    st.sinceStop += dt;
    st.phase += step / (.36 * Wf * s);                    // gait locked to ground speed
    if (Math.abs(dx) > 8) st.facing = dx > 0 ? 1 : -1;
   }
  }
  if (st.liftT >= 0) { st.liftT += dt; if (st.liftT > 2.4) st.liftT = -1; }

  // frame selection
  const g = ((st.phase % 1) + 1) % 1 * 4, fi = Math.floor(g), mix = smooth((g % 1 - .79) / .21);
  const walkingVisible = 1 - smooth(st.stand);
  if (fi !== st.prevFrame) {
   if (st.prevFrame >= 0 && st.mode === 'walk' && st.stand < .4) {
    const [cx, cy] = CONTACTS[fi];
    emit(st.x + (cx - W / 2) / W * Wf * s * st.facing, st.y + (cy / H - HOOF) * Hf * s, 4, 6 * s, 26);
   }
   st.prevFrame = fi;
  }
  for (let i = 0; i < 4; i++) frames[i].style.opacity = i === fi ? 1 : (i === (fi + 1) % 4 ? mix : 0);
  walk.style.opacity = walkingVisible.toFixed(3);
  pose.style.opacity = smooth(st.stand).toFixed(3);

  // head lift while standing
  const lp = st.liftT < 0 ? 0 : Math.sin(clamp(st.liftT / 2.4, 0, 1) * Math.PI);
  const breathe = Math.sin(clock * 1.6) * .004;
  pose.style.transform = `translateY(${(-lp * 2.2 - breathe * 100).toFixed(2)}%) rotate(${(lp * -1.6).toFixed(2)}deg) scale(${(1 + lp * .02).toFixed(3)})`;
  if (st.liftT >= 0 && Math.random() < dt * 14) emit(st.x, st.y - Hf * .85 * s, 1, Wf * .12 * s, 18);

  // ambient sparkle drifting off the body
  const vis = Math.max(walkingVisible, smooth(st.stand));
  if (st.alpha > .3 && Math.random() < dt * (st.mode === 'walk' ? 26 : 9)) {
   const cx = st.x - st.facing * Wf * s * (st.mode === 'walk' ? .22 : 0);
   emit(cx, st.y - Hf * s * rnd(.12, .7), 1, Wf * s * .2, 20);
  }

  // place figure (hoof point anchored at st.x / st.y), mirrored when facing left
  walk.style.transform = `scaleX(${st.facing})`;
  const wob = st.mode === 'walk' ? Math.abs(Math.sin(st.phase * Math.PI * 4)) * -1.2 * s : 0;
  fig.style.opacity = (st.alpha * .86).toFixed(3);
  fig.style.transform = `translate3d(${(st.x - Wf / 2).toFixed(1)}px,${(st.y - Hf * HOOF + wob).toFixed(1)}px,0) scale(${s.toFixed(3)})`;
  fig.style.zIndex = '';

  // sparkles
  ctx.clearRect(0, 0, vw, vh);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = parts.length - 1; i >= 0; i--) {
   const p = parts[i]; p.life += dt;
   if (p.life >= p.max) { parts.splice(i, 1); continue; }
   p.x += p.vx * dt; p.y += p.vy * dt; p.vx += Math.sin(clock * 2 + p.tw) * 3 * dt;
   const k = p.life / p.max, a = Math.sin(k * Math.PI) * (.55 + .45 * Math.sin(clock * 9 + p.tw)) * .9;
   const r = p.r * (1.6 - k * .7);
   const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
   gr.addColorStop(0, `rgba(225,248,255,${(a).toFixed(3)})`);
   gr.addColorStop(.35, `rgba(140,205,255,${(a * .45).toFixed(3)})`);
   gr.addColorStop(1, 'rgba(90,160,240,0)');
   ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, r * 4, 0, 6.2832); ctx.fill();
  }
 }

 function tick(ms) {
  const dt = last ? Math.min(.05, (ms - last) / 1000) : 0; last = ms;
  update(dt);
  raf = requestAnimationFrame(tick);
 }
 function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }

 // reduced motion: a calm, standing stag in the corner, no wandering or particles
 function staticPose() {
  stop(); measure();
  parts.length = 0; ctx.clearRect(0, 0, vw, vh);
  st.stand = 1; st.alpha = 1; st.facing = -1; st.mode = 'pause';
  const s = depthScale(vh * .96); st.x = vw * (narrow.matches ? .78 : .9); st.y = vh * .96;
  walk.style.opacity = 0; pose.style.opacity = 1; pose.style.transform = '';
  fig.style.opacity = '.85';
  fig.style.transform = `translate3d(${(st.x - Wf / 2).toFixed(1)}px,${(st.y - Hf * HOOF).toFixed(1)}px,0) scale(${s.toFixed(3)})`;
 }
 function run() {
  if (!enabled) { stop(); return; }
  if (reduced.matches) { staticPose(); return; }
  if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); }
 }
 function apply() {
  root.classList.toggle('sw-on', enabled);
  btn.setAttribute('aria-pressed', String(enabled));
  btn.setAttribute('aria-label', enabled ? '隱藏發光麋鹿' : '顯示發光麋鹿');
  btn.title = enabled ? '隱藏麋鹿' : '顯示麋鹿';
  layer.hidden = !enabled;
  run();
 }
 btn.addEventListener('click', () => {
  enabled = !enabled;
  try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) {}
  if (enabled) { begin(false); }
  apply();
 });
 reduced.addEventListener('change', () => { begin(true); apply(); });
 document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else run(); });
 let rt = 0;
 addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); if (reduced.matches && enabled) staticPose(); }, 120); }, { passive: true });

 // preload sprite sheet, then start (page stays as-is if it fails)
 const sheet = new Image();
 sheet.onload = () => { begin(true); apply(); };
 sheet.onerror = () => { btn.hidden = true; layer.remove(); };
 sheet.src = './stag-walk.webp?v=7';
 window.__stagWander = { st, parts };   // handy for tests
})();
