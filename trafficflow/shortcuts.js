/* TrafficIQ — shortcuts.js */
'use strict';

/* ══ THREE.JS BACKGROUND ══ */
(function initBG() {
  const canvas = document.getElementById('bg');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTime: { value: 0 }, uDark: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}`,
    fragmentShader: `
      uniform float uTime; uniform float uDark; varying vec2 vUv;
      float grid(vec2 uv,float s,float t){vec2 g=abs(fract(uv/s-.5)-.5)/fwidth(uv/s);return 1.0-min(min(g.x,g.y),1.0)*t;}
      float road(float c,float p,float w){return smoothstep(w,w*.4,abs(c-p));}
      float streak(vec2 uv,float ry,float off,float sp,float len){float x=fract(uv.x*.6+uTime*sp+off);float on=road(uv.y,ry,0.006);return smoothstep(len,0.0,x)*smoothstep(0.0,0.01,x)*on;}
      void main(){
        vec2 uv=vUv;
        vec3 col=mix(vec3(0.906,0.937,0.980),vec3(0.016,0.031,0.082),uDark);
        float g=grid(uv*vec2(6.0,4.0),1.0,1.8);
        col=mix(col,mix(vec3(0.85,0.88,0.92),vec3(0.06,0.12,0.22),uDark),g*mix(0.25,0.12,uDark));
        float roads=max(max(road(uv.y,.25,.018),road(uv.y,.50,.022)),max(road(uv.y,.75,.018),max(road(uv.x,.33,.016),road(uv.x,.66,.016))));
        col=mix(col,mix(vec3(0.78,0.82,0.88),vec3(0.08,0.14,0.28),uDark),roads);
        col=mix(col,vec3(1.0,0.85,0.15),road(uv.y,.50,.002)*.55*uDark);
        vec2 flip=vec2(1.0-uv.x,uv.y);
        col+=vec3(0.9,0.15,0.1)*(streak(uv,.498,0.0,.18,.08)+streak(uv,.502,.3,.14,.06))*uDark;
        col+=vec3(0.85,0.90,1.0)*(streak(flip,.495,.1,.22,.07)+streak(flip,.505,.6,.17,.05))*uDark;
        col*=1.0-length(uv-.5)*length(uv-.5)*1.44*mix(.2,.5,uDark);
        gl_FragColor=vec4(col,mix(.22,.72,uDark));
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat));
  let t=0;(function tick(){requestAnimationFrame(tick);t+=0.008;mat.uniforms.uTime.value=t;renderer.render(scene,camera);})();
  addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight));
  window._bgMat = mat;
})();

/* ══ VALID CITIES ══ */
const VALID_CITIES = [
  'Bhimavaram Railway Station','Government Hospital',
  'RTC Bus Stand','Sagi Ramakrishnam Raju Engineering College','Vishnu College',
];
function resolveCity(raw) {
  if (!raw) return null;
  const cleaned = String(raw).trim();
  if (VALID_CITIES.includes(cleaned)) return cleaned;
  const lower = cleaned.toLowerCase();
  const found = VALID_CITIES.find(c => c.toLowerCase() === lower);
  if (found) return found;
  return VALID_CITIES.find(c =>
    c.toLowerCase().startsWith(lower.substring(0,12)) ||
    lower.startsWith(c.toLowerCase().substring(0,12))
  ) || null;
}

/* ══ STATE ══ */
const S = {
  theme: localStorage.getItem('tiq-theme') || 'dark',
  city: (function () {
    const fromUrl = resolveCity(new URLSearchParams(location.search).get('city'));
    if (fromUrl) { localStorage.setItem('tiq-city', fromUrl); return fromUrl; }
    return resolveCity(localStorage.getItem('tiq-city')) || 'Bhimavaram Railway Station';
  })(),
  name:  localStorage.getItem('tiq-name') || 'You',
  activeCard:   null,
  _unsubCounts: null,
  _unsubFeed:   null,
  counts: {},
};

/* ══ THEME ══ */
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('themeBtn').textContent = t === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('tiq-theme', S.theme = t);
  if (window._bgMat) window._bgMat.uniforms.uDark.value = t === 'dark' ? 1 : 0;
}
setTheme(S.theme);
document.getElementById('themeBtn').addEventListener('click', () =>
  setTheme(S.theme === 'dark' ? 'light' : 'dark')
);
document.getElementById('tbCity').textContent = S.city;

/* ══ SHORTCUTS
   RULE: trigger = the EXACT short text shown in input box AND used as keyword.
   matchShortcut() does an exact string match on trigger text.
   This guarantees zero mismatch — trigger button → correct shortcut always.
══ */
const CITY_SHORTCUTS = {
  'Bhimavaram Railway Station': [
    { id:'brs-1', ico:'🚉', name:'Station Back Gate Route', loc:'Back Gate → NH216 Junction',
      desc:'Avoids the crowded main station entrance. Back gate exit connects directly to NH216 in 3 min.',
      tags:[{cls:'bolt',label:'⚡ Most Used'},{cls:'green',label:'–7 min'}],
      trigger:'Back Gate Route' },
    { id:'brs-2', ico:'🔀', name:'Inner Ring Bypass', loc:'Station Road → Eluru Road via Ring',
      desc:'Ring road bypass cuts through residential shortcut. Removes 2 signal waits on Station Road main.',
      tags:[{cls:'fire',label:'🔥 Trending'},{cls:'green',label:'–5 min'}],
      trigger:'Inner Ring Bypass' },
    { id:'brs-3', ico:'🛣', name:'Canal Road Express', loc:'Canal Side Road → Bhimavaram Town',
      desc:'Canal-side road has near-zero congestion. Parallel to main road, connects to town centre in 6 min.',
      tags:[{cls:'star',label:'★ Community Fav'},{cls:'amber',label:'–6 min'}],
      trigger:'Canal Road Express' },
  ],
  'Government Hospital': [
    { id:'gh-1', ico:'🏥', name:'Hospital North Entry', loc:'North Gate → Emergency Block',
      desc:'North gate has dedicated ambulance priority lane. Patient drop-off adds 0 delay.',
      tags:[{cls:'bolt',label:'⚡ Most Used'},{cls:'green',label:'–8 min'}],
      trigger:'North Entry' },
    { id:'gh-2', ico:'🔀', name:'Service Lane Shortcut', loc:'Service Lane → Pharmacy Block',
      desc:'Service lane behind hospital skips the main roundabout entirely.',
      tags:[{cls:'fire',label:'🔥 Trending'},{cls:'green',label:'–6 min'}],
      trigger:'Service Lane' },
    { id:'gh-3', ico:'🛣', name:'Bypass to Eluru Road', loc:'Hospital Junction → Eluru Road',
      desc:'Cuts through the back street to reach Eluru Road.',
      tags:[{cls:'star',label:'★ Community Fav'},{cls:'amber',label:'–5 min'}],
      trigger:'Eluru Road Bypass' },
  ],
  'RTC Bus Stand': [
    { id:'rtc-1', ico:'🚌', name:'Platform 3 Exit Lane', loc:'Platform 3 → NH216 Direct',
      desc:'Platform 3 side exit connects directly to NH216 without crossing the main bus stand roundabout.',
      tags:[{cls:'bolt',label:'⚡ Most Used'},{cls:'green',label:'–9 min'}],
      trigger:'Platform 3 Exit' },
    { id:'rtc-2', ico:'🔀', name:'Market Road Shortcut', loc:'Bus Stand → Market Road → Town',
      desc:'Market road parallel route avoids the bus stand signal.',
      tags:[{cls:'fire',label:'🔥 Trending'},{cls:'green',label:'–4 min'}],
      trigger:'Market Road' },
    { id:'rtc-3', ico:'🛣', name:'Old Town Bypass', loc:'RTC Back Road → Old Town Junction',
      desc:'Old bypass road behind RTC rarely has traffic.',
      tags:[{cls:'star',label:'★ Community Fav'},{cls:'amber',label:'–5 min'}],
      trigger:'Old Town Bypass' },
  ],
  'Sagi Ramakrishnam Raju Engineering College': [
    { id:'srkr-1', ico:'🎓', name:'College Back Road', loc:'Back Gate → Tadepalligudem Road',
      desc:'Back gate route completely avoids the main college entrance jam during 9 AM and 4 PM rush.',
      tags:[{cls:'bolt',label:'⚡ Most Used'},{cls:'green',label:'–10 min'}],
      trigger:'College Back Road' },
    { id:'srkr-2', ico:'🔀', name:'Canal Junction Bypass', loc:'Canal Road → College Junction',
      desc:'Canal road cuts across to college junction, skipping the main Bhimavaram town traffic signal.',
      tags:[{cls:'fire',label:'🔥 Trending'},{cls:'green',label:'–7 min'}],
      trigger:'Canal Junction' },
    { id:'srkr-3', ico:'🛣', name:'Highway Service Road', loc:'NH216 Service Road → College',
      desc:'NH216 service road parallel runs all the way to college. Zero signals and smooth tarmac.',
      tags:[{cls:'star',label:'★ Community Fav'},{cls:'amber',label:'–8 min'}],
      trigger:'Highway Service Road' },
  ],
  'Vishnu College': [
    { id:'vc-1', ico:'📚', name:'Vishnu Back Gate Lane', loc:'Back Lane → Bhimavaram–Narasapur Road',
      desc:'Back lane entrance avoids the main Vishnu junction that backs up badly during class timings.',
      tags:[{cls:'bolt',label:'⚡ Most Used'},{cls:'green',label:'–8 min'}],
      trigger:'Back Gate Lane' },
    { id:'vc-2', ico:'🔀', name:'Water Tank Road', loc:'Water Tank Junction → Vishnu College',
      desc:'Water tank road is a quiet residential street connecting to the college side gate.',
      tags:[{cls:'fire',label:'🔥 Trending'},{cls:'green',label:'–6 min'}],
      trigger:'Water Tank Road' },
    { id:'vc-3', ico:'🛣', name:'Paddy Field Bypass', loc:'Outer Ring Road → Vishnu College',
      desc:'Outer ring road runs parallel — connects to college north entrance, avoiding town centre.',
      tags:[{cls:'star',label:'★ Community Fav'},{cls:'amber',label:'–9 min'}],
      trigger:'Paddy Field Bypass' },
  ],
};

function getShortcuts() {
  return CITY_SHORTCUTS[S.city] || CITY_SHORTCUTS['Bhimavaram Railway Station'];
}

/* ══ MATCH — exact trigger string match, zero ambiguity ══ */
function matchShortcut(msgText) {
  const trimmed = msgText.trim();
  const shortcuts = getShortcuts();
  // First try exact match against trigger
  const exact = shortcuts.find(sc =>
    sc.trigger.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact;
  // Fallback: contains match
  const contains = shortcuts.find(sc =>
    trimmed.toLowerCase().includes(sc.trigger.toLowerCase()) ||
    sc.trigger.toLowerCase().includes(trimmed.toLowerCase())
  );
  if (contains) return contains;
  // Last resort: first shortcut
  return shortcuts[0];
}

/* ══ CONFIDENCE — exactly +10% per message ══ */
function calcConf(count) {
  if (!count || count <= 0) return 0;
  // Each message = exactly 10%. Cap at 90% (9 messages = 90%, stays there).
  return Math.min(90, count * 10);
}
function calcStatus(count) {
  if (!count || count === 0) return 'No reports yet';
  if (count === 1) return '1 report · 10% confidence';
  if (count <= 3)  return `${count} reports · ${count*10}% confidence`;
  if (count <= 6)  return `${count} reports · Growing confidence`;
  if (count <= 9)  return `${count} reports · Good confidence`;
  return `${count}+ reports · High confidence · Community verified`;
}

/* ══ RENDER TRIGGERS — short labels, exact trigger text as message ══ */
function renderTriggers() {
  const trigRow = document.querySelector('.triggers');
  if (!trigRow) return;
  trigRow.innerHTML = '';
  getShortcuts().forEach(sc => {
    const btn = document.createElement('button');
    btn.className = 'trig';
    btn.dataset.msg = sc.trigger; // exact trigger text goes into input box
    btn.textContent = sc.ico + ' ' + sc.trigger; // short label on button
    btn.addEventListener('click', () => trigFill(btn));
    trigRow.appendChild(btn);
  });
}

/* ══ RENDER LEFT PANEL ══ */
function renderCards() {
  const inner     = document.querySelector('.panel-inner');
  const confBlock = document.getElementById('confBlock');
  inner.querySelectorAll('.sc-card').forEach(el => el.remove());

  const active = getShortcuts()
    .filter(sc => (S.counts[sc.id] || 0) > 0)
    .sort((a, b) => (S.counts[b.id] || 0) - (S.counts[a.id] || 0));

  if (active.length === 0) return;

  active.forEach((sc, idx) => {
    const count   = S.counts[sc.id] || 0;
    const conf    = calcConf(count);
    const isTop   = idx === 0;
    const dotClr  = conf >= 50 ? 'var(--cg)' : 'var(--ca)';
    const barClr  = conf >= 50 ? 'var(--cg)' : 'var(--ca)';
    const confTxt = conf >= 50 ? 'cg' : 'ca';
    const tagsHtml = sc.tags.map(t => `<span class="tag ${t.cls}">${t.label}</span>`).join('');

    const card = document.createElement('div');
    card.className = `sc-card${isTop ? ' rank-1' : ''}`;
    card.dataset.id = sc.id;
    card.innerHTML = `
      <div class="sc-active-ring"></div>
      <div class="sc-top">
        <span class="sc-ico">${sc.ico}</span>
        <div class="sc-info">
          <span class="sc-name">${sc.name}</span>
          <span class="sc-loc">${sc.loc}</span>
        </div>
        <span class="sc-dot" style="background:${dotClr};box-shadow:0 0 8px ${dotClr}"></span>
      </div>
      <p class="sc-desc">${sc.desc}</p>
      <div class="sc-tags">${tagsHtml}<span class="tag bolt">×${count} report${count>1?'s':''}</span></div>
      <div class="sev-row">
        <div class="sev-bar"><div class="sev-fill" style="width:${conf}%;background:${barClr}"></div></div>
        <span class="sev-txt ${confTxt}">${conf}%</span>
      </div>`;

    inner.insertBefore(card, confBlock);
    gsap.fromTo(card,{x:-18,opacity:0},{x:0,opacity:1,duration:.45,ease:'power2.out',delay:idx*0.08});

    card.addEventListener('click', () => {
      document.querySelectorAll('.sc-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      S.activeCard = sc.id;
      document.getElementById('feedSub').textContent = `${sc.name} · ${S.city}`;
      updateConfidenceRing(S.counts[sc.id] || 0);
      gsap.fromTo(card,{scale:.96},{scale:1,duration:.4,ease:'back.out(2)'});
    });

    if (S.activeCard === sc.id) card.classList.add('active');
  });

  // Auto-highlight top card on first appearance
  if (!S.activeCard && active.length > 0) {
    const topCard = inner.querySelector('.sc-card');
    if (topCard) {
      topCard.classList.add('active');
      S.activeCard = active[0].id;
      document.getElementById('feedSub').textContent = `${active[0].name} · ${S.city}`;
      updateConfidenceRing(S.counts[active[0].id] || 0);
    }
  }
}

/* ══ CONFIDENCE RING ══ */
function updateConfidenceRing(count) {
  const conf     = calcConf(count);
  const ring     = document.getElementById('ringFill');
  const numEl    = document.getElementById('confNum');
  const statusEl = document.getElementById('confStatus');

  ring.style.strokeDashoffset = 314 - (conf / 100) * 314;
  ring.style.filter = `drop-shadow(0 0 7px ${
    conf >= 50 ? 'rgba(34,197,94,.6)' :
    conf > 0   ? 'rgba(245,158,11,.6)' : 'rgba(255,255,255,.1)'})`;

  const prev  = parseInt(numEl.textContent) || 0;
  const start = performance.now();
  (function countUp(now) {
    const p = Math.min((now - start) / 700, 1);
    numEl.textContent = Math.round(prev + (1 - Math.pow(1-p,3)) * (conf - prev));
    if (p < 1) requestAnimationFrame(countUp);
  })(start);

  statusEl.textContent = calcStatus(count);
  document.getElementById('confBlock').classList.add('active-conf');
  document.getElementById('tbConf').textContent = conf > 0 ? conf + '%' : '—';
}

/* ══ FEED ══ */
const feed      = document.getElementById('feed');
const scrollBtn = document.getElementById('scrollBtn');
let userScrolled = false;
const renderedIds = new Set();

feed.addEventListener('scroll', () => {
  userScrolled = feed.scrollHeight - feed.scrollTop - feed.clientHeight > 40;
  scrollBtn.classList.toggle('show', userScrolled);
});
function scrollToBottom() {
  feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
  userScrolled = false;
  scrollBtn.classList.remove('show');
}
function timeStr(ts) {
  const d = (ts && ts.toDate) ? ts.toDate() : new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function addMsg({ id, name, role, badge, badgeLbl, init, msg, votes=0, own=false, ts=null, shortcutId=null }) {
  document.getElementById('emptyState')?.remove();
  if (id && renderedIds.has(id)) return;
  if (id) renderedIds.add(id);

  const sc = shortcutId ? getShortcuts().find(s => s.id === shortcutId) : null;
  const routeLabel = sc ? `<span class="msg-route-tag">${sc.ico} ${sc.trigger}</span>` : '';

  const el = document.createElement('div');
  el.className = `msg${own?' own':''}`;
  if (id) el.dataset.docId = id;
  el.innerHTML = `
    <div class="av ${role}" data-tip="${name} · ${badgeLbl}">${init}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-name">${name}</span>
        <span class="trust-badge ${badge}">${badgeLbl}</span>
        ${routeLabel}
        <span class="msg-time">${timeStr(ts)}</span>
      </div>
      <div class="bubble">${msg}</div>
      <div class="msg-actions">
        <button class="upvote-btn" data-base="${votes}">▲ <span class="vc">${votes}</span></button>
      </div>
    </div>`;
  el.querySelector('.upvote-btn')?.addEventListener('click', function() {
    const voted = this.classList.toggle('voted');
    this.querySelector('.vc').textContent = parseInt(this.dataset.base) + (voted?1:0);
    gsap.fromTo(this,{scale:.88},{scale:1,duration:.3,ease:'back.out(2)'});
  });
  feed.appendChild(el);
  if (!userScrolled) scrollToBottom();
  else scrollBtn.classList.add('show');
}

/* ══ FEED LISTENER ══ */
function startFeedListener() {
  if (!window.db || !window.fb) return;
  const { collection, query, orderBy, onSnapshot } = window.fb;
  const q = query(collection(window.db, 'shortcut_chats'), orderBy('createdAt'));
  S._unsubFeed = onSnapshot(q, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type !== 'added') return;
      const d = change.doc.data();
      if (d.city !== S.city) return;
      addMsg({
        id: change.doc.id,
        name:       d.name     || 'User',
        role:       d.role     || 'b',
        badge:      d.badge    || 'local',
        badgeLbl:   d.badgeLbl || '⌂ Local Guide',
        init:       d.init     || (d.name||'U').substring(0,2).toUpperCase(),
        msg:        d.msg      || '',
        votes:      d.votes    || 0,
        own:        d.name === S.name,
        ts:         d.createdAt || null,
        shortcutId: d.shortcutId || null,
      });
    });
  });
}

/* ══ COUNTS LISTENER ══ */
function startCountsListener() {
  if (!window.db || !window.fb) return;
  const { collection, query, orderBy, onSnapshot } = window.fb;
  const q = query(collection(window.db, 'shortcut_chats'), orderBy('createdAt'));
  S._unsubCounts = onSnapshot(q, snapshot => {
    S.counts = {};
    snapshot.docs.forEach(docSnap => {
      const d = docSnap.data();
      if (d.city !== S.city || !d.shortcutId) return;
      S.counts[d.shortcutId] = (S.counts[d.shortcutId] || 0) + 1;
    });
    renderCards();
    if (S.activeCard) updateConfidenceRing(S.counts[S.activeCard] || 0);
  });
}

/* ══ TRIGGER FILL ══ */
function trigFill(btn) {
  document.getElementById('chatInp').value = btn.dataset.msg;
  document.getElementById('chatInp').focus();
  gsap.fromTo(btn,{scale:.9},{scale:1,duration:.3,ease:'back.out(2)'});
}

/* ══ SEND ══ */
async function sendMsg() {
  const inp = document.getElementById('chatInp');
  const txt = inp.value.trim();
  if (!txt) return;

  const matched = matchShortcut(txt);
  inp.value = '';
  gsap.fromTo('.send-btn',{scale:.88},{scale:1,duration:.28,ease:'back.out(2)'});

  const feedSub = document.getElementById('feedSub');
  feedSub.textContent = `✓ ${matched.ico} ${matched.trigger}`;
  setTimeout(() => {
    feedSub.textContent = S.activeCard
      ? (getShortcuts().find(s=>s.id===S.activeCard)?.name||'Community Feed') + ' · ' + S.city
      : 'Community Feed · ' + S.city;
  }, 2000);

  if (window.db && window.fb) {
    const { collection, doc, setDoc, serverTimestamp } = window.fb;
    const ref = doc(collection(window.db, 'shortcut_chats'));
    await setDoc(ref, {
      city:       S.city,
      shortcutId: matched.id,
      name:       S.name,
      role:       'b',
      badge:      'local',
      badgeLbl:   '⌂ Local Guide',
      init:       S.name.substring(0,2).toUpperCase(),
      msg:        txt,
      votes:      0,
      createdAt:  serverTimestamp(),
    });
  }
}

document.getElementById('chatInp').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMsg();
});

/* ══ MOBILE ══ */
function togglePanel() {
  document.getElementById('panel').classList.toggle('open');
  document.getElementById('mobOverlay').classList.toggle('show');
}
document.getElementById('panTog').addEventListener('click', togglePanel);

/* ══ INIT ══ */
gsap.to('#topbar', {y:0,opacity:1,duration:.6, ease:'power3.out',delay:.1 });
gsap.to('#panel',  {x:0,opacity:1,duration:.75,ease:'power3.out',delay:.25});
const streamEl = document.querySelector('.stream');
if (streamEl) gsap.from(streamEl, {opacity:0,duration:.5,ease:'power2.out',delay:.35});
gsap.from('.conf-block', {y:14,opacity:0,duration:.55,ease:'power2.out',delay:.72});

startCountsListener();
startFeedListener();
renderTriggers();