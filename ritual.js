"use strict";
/* v2 抽牌儀式：點「翻開牌」後先演出約 3 秒，再交給原本的 showReading。
   純 CSS 動畫 + 少量 DOM，無外部函式庫。減少動態效果時直接略過。 */
(() => {
 const NS = 'http://www.w3.org/2000/svg';
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const el = (tag, cls, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; return e; };
 const sv = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
 // small hand-drawn "runes" (line glyphs, no font needed)
 const RUNES = ['M0 -6V6M0 -6l4 4M0 -1l4 4', 'M0 -6V6M0 -6l-4 4M0 -6l4 4', 'M-3 -6l3 6-3 6M3 -6l-3 6 3 6', 'M-3 -6V6M3 -6V6M-3 -2l6 4', 'M0 -6l4 4-4 4-4-4zM0 2V7', 'M-4 -6l4 4 4-4M0 -2V6M-4 6l4-3 4 3', 'M-3 6V-6l6 4-6 4', 'M0 -6V6M-4 -2l4 3 4-3'];

 let active = null;

 function build(items, back, W, H) {
  const n = items.length, root = el('div', 'rt'); root.setAttribute('aria-hidden', 'true');
  const cw = n === 1 ? W * .5 : (W - 56 - 2 * 10) / 3, ch = cw * 78 / 54;
  const rowTop = n === 1 ? H * .31 : H * .3, labTop = rowTop + ch + 16;
  root.append(el('div', 'rt-dark'), el('div', 'rt-mist a'), el('div', 'rt-mist b'), el('div', 'rt-candle'), el('div', 'rt-candle b'));
  for (let i = 0; i < 16; i++) {
   const m = el('i', 'rt-mote');
   m.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;--s:${(2 + Math.random() * 3.2).toFixed(1)}px;--t:${(3.2 + Math.random() * 3).toFixed(1)}s;--d:${(-Math.random() * 5).toFixed(1)}s;--x:${(Math.random() * 60 - 30).toFixed(0)}px`;
   root.append(m);
  }
  const stage = el('div', 'rt-stage', `--W:${W}px;--H:${H}px;--R:${(Math.max(W, H) * .98).toFixed(0)}px;--rowTop:${rowTop}px;--cw:${cw}px;--ch:${ch}px;--gap:10px;--labTop:${labTop}px`);

  // rune ring (rotates slowly, glyphs glow in turn)
  const R = 100, ring = sv('svg', { viewBox: '-110 -110 220 220' });
  ring.append(sv('circle', { r: R, fill: 'none', stroke: '#ecc982', 'stroke-width': .5, opacity: .35 }), sv('circle', { r: R - 14, fill: 'none', stroke: '#ecc982', 'stroke-width': .35, 'stroke-dasharray': '1 3', opacity: .4 }));
  for (let i = 0; i < 16; i++) {
   const a = i / 16 * 360, g = sv('g', { class: 'g', transform: `rotate(${a}) translate(0 ${-(R - 7)})`, style: `animation-delay:${(i * .31 % 2.4).toFixed(2)}s` });
   g.append(sv('path', { d: RUNES[(i * 3) % RUNES.length], fill: 'none', stroke: '#f3dba8', 'stroke-width': 1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: 'scale(.75)' }));
   ring.append(g);
  }
  const sig = el('div', 'rt-sigils'); sig.append(ring); stage.append(sig);

  // gothic pointed-arch frame that draws itself
  const m = 6, spring = H * .36, apex = m, r = W * .92;
  const arch = (o, d0) => {
   const x0 = o, x1 = W - o, y1 = H - o, ys = spring + o * .5;
   return `M${x0} ${y1}V${ys}A${r} ${r} 0 0 1 ${W / 2} ${apex + o}A${r} ${r} 0 0 1 ${x1} ${ys}V${y1}Z`;
  };
  const f = sv('svg', { class: 'rt-frame', viewBox: `0 0 ${W} ${H}` });
  const add = (d, cls, dd) => { const p = sv('path', { d, class: cls, pathLength: 1 }); if (dd) p.style.setProperty('--dd', dd); f.append(p); };
  add(arch(m), 'halo'); add(arch(m), 'draw', '.3s'); add(arch(m + 9), 'draw thin', '.55s');
  // rose window
  const rx = W / 2, ry = H * .165, rr = Math.min(W * .12, 42);
  const rose = sv('g', { class: 'rt-rose fade', style: `--rx:${rx}px;--ry:${ry}px;--dd:.9s` });
  rose.append(sv('circle', { cx: rx, cy: ry, r: rr, 'stroke-width': 1.1 }), sv('circle', { cx: rx, cy: ry, r: rr * .62, 'stroke-width': .7, 'stroke-dasharray': '2 3' }));
  for (let i = 0; i < 8; i++) {
   const a = i / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), b = a + Math.PI / 8;
   rose.append(sv('path', { d: `M${rx + c * rr * .2} ${ry + s * rr * .2}L${rx + c * rr} ${ry + s * rr}`, 'stroke-width': .6 }),
    sv('path', { d: `M${rx + c * rr * .62} ${ry + s * rr * .62}Q${rx + Math.cos(b) * rr * .95} ${ry + Math.sin(b) * rr * .95} ${rx + Math.cos(a + Math.PI / 4) * rr * .62} ${ry + Math.sin(a + Math.PI / 4) * rr * .62}`, 'stroke-width': .7 }));
  }
  f.append(rose);
  // base filigree: small diamonds + curls
  const by = H - m - 18, flo = sv('g', { class: 'fade', style: '--dd:1.3s' });
  for (const [cx, dir] of [[W * .2, 1], [W * .8, -1]]) {
   flo.append(sv('path', { d: `M${cx} ${by}q${12 * dir} -10 ${24 * dir} 0t${24 * dir} 0`, 'stroke-width': .9 }), sv('path', { d: `M${cx - 4} ${by - 8}l4 -5 4 5 -4 5z`, 'stroke-width': .9 }));
  }
  flo.append(sv('path', { d: `M${W / 2 - 5} ${by - 2}l5 -7 5 7 -5 7z`, 'stroke-width': 1 }));
  f.append(flo); stage.append(f);

  // cards
  const row = el('div', 'rt-row'); stage.append(row);
  items.forEach((it, i) => {
   const c = el('div', 'rt-card', `--i:${i}`);
   const glow = el('i', 'rt-glow'), shake = el('div', 'rt-shake'), inner = el('div', 'rt-inner');
   const bk = el('div', 'rt-face rt-back'); bk.innerHTML = back;
   const ft = el('div', 'rt-face rt-front');
   ft.innerHTML = `<b>${String(it.n).padStart(2, '0')}</b><svg viewBox="0 0 80 64" focusable="false"><circle cx="40" cy="32" r="29" fill="none" stroke="currentColor" stroke-dasharray="2 4" opacity=".7"/><path d="${it.path}" stroke="currentColor" fill="none" stroke-width="2.1" stroke-linejoin="round"/></svg>`;
   inner.append(bk, ft); shake.append(inner); c.append(glow, shake); row.append(c);
  });
  items.forEach((it, i) => {
   const l = el('div', 'rt-label', `--i:${i};left:${n === 1 ? 0 : (W - 56 - 20) / 3 * i + 28 + i * 10}px;right:auto;width:${n === 1 ? W : cw}px`);
   l.innerHTML = '<b></b><i></i>'; l.firstChild.textContent = it.name; l.lastChild.textContent = it.en; stage.append(l);
  });
  root.append(stage, el('div', 'rt-flash'), (() => { const s = el('div', 'rt-skip'); s.textContent = '輕觸可略過'; return s; })());
  return root;
 }

 function play(items, back, onReveal) {
  if (active) return;
  if (reduced.matches) { onReveal(); return; }
  const n = items.length;
  const W = Math.round(n === 1 ? Math.min(innerWidth * .82, 340) : Math.min(innerWidth * .94, 470));
  const H = Math.round(n === 1 ? W * 1.5 : W * 1.02);
  const root = build(items, back, W, H);
  document.body.append(root);
  let revealed = false, done = false; const timers = [];
  const reveal = () => { if (!revealed) { revealed = true; onReveal(); } };
  const finish = () => { if (done) return; done = true; timers.forEach(clearTimeout); root.remove(); active = null; };
  const out = () => { root.classList.add('rt-out'); timers.push(setTimeout(finish, 520)); };
  const total = 2600 + (n - 1) * 200;
  timers.push(setTimeout(reveal, 1850));
  timers.push(setTimeout(out, total));
  root.addEventListener('click', () => { // tap to skip
   if (done || root.classList.contains('rt-out')) return;
   timers.forEach(clearTimeout); timers.length = 0; reveal(); out();
  });
  active = { root, finish };
 }
 window.__ritual = play;
})();
