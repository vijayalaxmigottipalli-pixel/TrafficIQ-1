/* TrafficIQ — enter-traffic.js
   City-aware live traffic room — Firestore + Realtime DB
   Collection: enter_traffic_messages (filtered by city field)
   ─────────────────────────────────── */
'use strict';

/* ══ THREE.JS HIGHWAY BACKGROUND ══ */
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
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uDark;
      varying vec2 vUv;

      float grid(vec2 uv, float spacing, float thickness) {
        vec2 g = abs(fract(uv / spacing - .5) - .5) / fwidth(uv / spacing);
        return 1.0 - min(min(g.x, g.y), 1.0) * thickness;
      }
      float road(float coord, float pos, float w) {
        return smoothstep(w, w * .4, abs(coord - pos));
      }
      float streak(vec2 uv, float roadY, float offset, float speed, float len) {
        float x = fract(uv.x * .6 + uTime * speed + offset);
        float onRoad = road(uv.y, roadY, 0.006);
        float trail = smoothstep(len, 0.0, x) * smoothstep(0.0, 0.01, x);
        return trail * onRoad;
      }

      void main() {
        vec2 uv = vUv;
        vec3 darkBg  = vec3(0.016, 0.031, 0.082);
        vec3 lightBg = vec3(0.906, 0.937, 0.980);
        vec3 bg = mix(lightBg, darkBg, uDark);

        float g = grid(uv * vec2(6.0, 4.0), 1.0, 1.8);
        vec3 gridClr = mix(vec3(0.85, 0.88, 0.92), vec3(0.06, 0.12, 0.22), uDark);
        vec3 col = mix(bg, gridClr, g * mix(0.25, 0.12, uDark));

        float r1 = road(uv.y, 0.25, 0.018);
        float r2 = road(uv.y, 0.50, 0.022);
        float r3 = road(uv.y, 0.75, 0.018);
        float rv1 = road(uv.x, 0.33, 0.016);
        float rv2 = road(uv.x, 0.66, 0.016);

        vec3 roadClr = mix(vec3(0.78, 0.82, 0.88), vec3(0.08, 0.14, 0.28), uDark);
        float roads = max(max(r1, r2), max(r3, max(rv1, rv2)));
        col = mix(col, roadClr, roads);

        float hy1 = road(uv.y, 0.50, 0.002);
        col = mix(col, vec3(1.0, 0.85, 0.15), hy1 * .55 * uDark);

        float s1 = streak(uv, 0.498, 0.0,  0.18, 0.08);
        float s2 = streak(uv, 0.502, 0.3,  0.14, 0.06);
        vec2 flip = vec2(1.0 - uv.x, uv.y);
        float s3 = streak(flip, 0.495, 0.1, 0.22, 0.07);
        float s4 = streak(flip, 0.505, 0.6, 0.17, 0.05);
        float s5 = streak(uv, 0.252, 0.2,  0.13, 0.06);
        float s6 = streak(uv, 0.748, 0.5,  0.16, 0.07);
        float s7 = streak(flip, 0.748, 0.4, 0.19, 0.06);

        col += vec3(0.9, 0.15, 0.1)  * (s1 + s2) * uDark;
        col += vec3(0.85, 0.90, 1.0) * (s3 + s4) * uDark;
        col += vec3(1.0, 0.80, 0.2)  * (s5 + s6 + s7) * uDark;
        col += vec3(0.15, 0.35, 0.9) * (s1+s2+s3+s4+s5+s6+s7) * (1.0-uDark) * .25;

        float ix1 = smoothstep(.04, .0, length(uv - vec2(.33, .50)));
        float ix2 = smoothstep(.04, .0, length(uv - vec2(.66, .50)));
        float ix3 = smoothstep(.035,.0, length(uv - vec2(.33, .25)));
        float ix4 = smoothstep(.035,.0, length(uv - vec2(.66, .75)));
        float ixAll = max(max(ix1,ix2),max(ix3,ix4));
        col += vec3(0.0, 0.75, 1.0) * ixAll * 0.18 * uDark;
        col += vec3(0.1, 0.4, 0.9)  * ixAll * 0.10 * (1.0-uDark);

        float v = length(uv - .5) * 1.2;
        col *= 1.0 - v * v * mix(.2, .5, uDark);

        gl_FragColor = vec4(col, mix(.22, .72, uDark));
      }
    `,
  });

  const geo = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geo, mat));

  let t = 0;
  (function tick() {
    requestAnimationFrame(tick);
    t += 0.008;
    mat.uniforms.uTime.value = t;
    renderer.render(scene, camera);
  })();

  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); });
  window._bgMat = mat;
})();


/* ══ VALID CITIES
   These EXACT strings are used as the Firestore `city` field value.
   They must match what dashboard.js saves to localStorage 'tiq-city'.
══ */
const VALID_CITIES = [
  'Bhimavaram Railway Station',
  'Government Hospital',
  'RTC Bus Stand',
  'Sagi Ramakrishnam Raju Engineering College',
  'Vishnu College',
];

/* ── resolveCity: handles URL encoding, extra spaces, case differences ──
   URLSearchParams.get() already decodes %20 → space, but we still
   trim() and do a lowercase fallback to be safe.
── */
function resolveCity(raw) {
  if (!raw) return null;
  const cleaned = String(raw).trim();
  // 1. Exact match
  if (VALID_CITIES.includes(cleaned)) return cleaned;
  // 2. Case-insensitive match (handles "sagi ramakrishnam..." etc.)
  const lower = cleaned.toLowerCase();
  const found = VALID_CITIES.find(c => c.toLowerCase() === lower);
  if (found) return found;
  // 3. Partial match for very long names that got truncated in storage
  const partial = VALID_CITIES.find(c =>
    c.toLowerCase().startsWith(lower.substring(0, 12)) ||
    lower.startsWith(c.toLowerCase().substring(0, 12))
  );
  return partial || null;
}

/* ══ STATE ══
   City resolution priority:
   1. URL param  ?city=Sagi%20Ramakrishnam%20Raju%20Engineering%20College
   2. localStorage key 'tiq-city'  (set by dashboard.js setCityEverywhere)
   3. Hard fallback: 'Bhimavaram Railway Station'

   DEBUG: open console and check:
     console.log('city from URL:', new URLSearchParams(location.search).get('city'))
     console.log('city from LS:',  localStorage.getItem('tiq-city'))
══ */
const S = {
  theme: localStorage.getItem('tiq-theme') || 'dark',
  city: (function () {
    // 1. Try URL param first — most reliable when coming from dashboard nav links
    const urlParam = new URLSearchParams(location.search).get('city');
    const fromUrl  = resolveCity(urlParam);
    if (fromUrl) {
      // Keep localStorage in sync so other pages also get the city
      localStorage.setItem('tiq-city', fromUrl);
      return fromUrl;
    }
    // 2. Try localStorage
    const stored  = localStorage.getItem('tiq-city');
    const fromLS  = resolveCity(stored);
    if (fromLS) return fromLS;
    // 3. Hard fallback
    console.warn('[TrafficIQ] Could not resolve city from URL or localStorage. Using default.');
    return 'Bhimavaram Railway Station';
  })(),
  name:  localStorage.getItem('tiq-name') || 'You',
  _unsubMessages: null,
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

/* ══ SET CITY IN HEADER ══ */
document.getElementById('tbCity').textContent = S.city;


/* ══ CHAT FEED ══ */
const feed      = document.getElementById('feed');
const scrollBtn = document.getElementById('scrollBtn');
let userScrolled = false;

feed.addEventListener('scroll', () => {
  const atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 40;
  userScrolled = !atBottom;
  scrollBtn.classList.toggle('show', userScrolled);
});

function scrollToBottom() {
  feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
  userScrolled = false;
  scrollBtn.classList.remove('show');
}

function timeStr(timestamp) {
  const n = timestamp ? timestamp.toDate() : new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

const renderedIds = new Set();

function addMsg({ id, name, role, score, init, msg, timestamp, own = false }) {
  if (id && renderedIds.has(id)) return;
  if (id) renderedIds.add(id);

  const el = document.createElement('div');
  el.className = `msg${own ? ' own' : ''}`;
  const roleLabel = { g: '✓ Verified', b: 'Active User', r: '⚠ Flagged' };
  const initials  = init || (name || 'UN').substring(0, 2).toUpperCase();
  el.innerHTML = `
    <div class="av ${role || 'b'}" data-tip="${name} · ${score}/100 · ${roleLabel[role] || 'Active User'}">${initials}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-name">${name}</span>
        <span class="msg-score">${score}</span>
        <span class="msg-time">${timeStr(timestamp)}</span>
      </div>
      <div class="bubble">${msg}</div>
    </div>`;
  feed.appendChild(el);
  if (!userScrolled) scrollToBottom();
  else scrollBtn.classList.add('show');
}

/* ══ OPTIMISTIC MESSAGE — shows instantly before Firestore confirms ══ */
function addMsgOptimistic(name, msg) {
  const tempId = 'temp-' + Date.now();
  renderedIds.add(tempId);
  addMsg({
    id:        tempId,
    name:      name,
    role:      'b',
    score:     75,
    init:      name.substring(0, 2).toUpperCase(),
    msg:       msg,
    timestamp: null,
    own:       true,
  });
}

/* ══ TRIGGER — fills input box ══ */
function trigFill(btn) {
  const inp = document.getElementById('chatInp');
  inp.value = btn.dataset.msg;
  inp.focus();
  gsap.fromTo(btn, { scale: .9 }, { scale: 1, duration: .3, ease: 'back.out(2)' });
}

/* ══ SEND — saves city field with every message ══ */
function sendMsg() {
  const inp = document.getElementById('chatInp');
  const txt = inp.value.trim();
  if (!txt) return;

  inp.value = '';
  gsap.fromTo('.send-btn', { scale: .88 }, { scale: 1, duration: .28, ease: 'back.out(2)' });

  // Show instantly on screen
  addMsgOptimistic(S.name, txt);

  // Save to Firestore WITH city field so it filters correctly
  if (window._db) {
    window._db.collection('enter_traffic_messages').add({
      name:      S.name,
      role:      'b',
      score:     75,
      msg:       txt,
      city:      S.city,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(err => console.error('Send failed:', err));

    // ── Update places collection totalReports counter ──
    // This is why the places collection exists — it tracks report counts per location
    window._db.collection('places').doc(S.city)
      .update({
        totalReports:  firebase.firestore.FieldValue.increment(1),
        lastReportAt:  firebase.firestore.FieldValue.serverTimestamp(),
        currentStatus: 'Active',
      })
      .catch(() => {
        // Document might not exist yet — create it
        window._db.collection('places').doc(S.city).set({
          name:          S.city,
          totalReports:  1,
          lastReportAt:  firebase.firestore.FieldValue.serverTimestamp(),
          currentStatus: 'Active',
          isActive:      true,
        }, { merge: true });
      });
  }
}
document.getElementById('chatInp').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMsg();
});

/* ══ MOBILE PANEL ══ */
const panel   = document.getElementById('panel');
const overlay = document.getElementById('mobOverlay');
function togglePanel() {
  panel.classList.toggle('open');
  overlay.classList.toggle('show');
}
document.getElementById('panTog').addEventListener('click', togglePanel);

/* ══ GSAP ENTRANCE ══ */
window.addEventListener('DOMContentLoaded', () => {
  gsap.to('#topbar', { y: 0, opacity: 1, duration: .6,  ease: 'power3.out', delay: .1  });
  gsap.to('#panel',  { x: 0, opacity: 1, duration: .75, ease: 'power3.out', delay: .25 });
  const streamEl = document.querySelector('.stream');
  if (streamEl) gsap.from(streamEl, { opacity: 0, duration: .5, ease: 'power2.out', delay: .35 });
  // .issue-card elements are created dynamically by Firebase
  // they are animated inside renderIssuePanel() when Firebase creates them
});

/* ══ ISSUE KEYWORD DETECTOR ══ */
function detectIssueType(msg) {
  const t = (msg || '').toLowerCase();
  if (/accident|crash|collide|collision|smash|heavy traffic|30\+\s*min|30\s*\+\s*min delay/.test(t)) return 'accident';
  if (/road work|construction|repair|digging|pothole|roadwork|avoid flyover|flyover|completely jammed|jammed/.test(t)) return 'construction';
  if (/breakdown|broke down|stalled|tow|puncture|flat tyre|flat tire|truck breakdown|single lane/.test(t)) return 'breakdown';
  return null;
}

/* ══ ISSUE DEFS ══ */
const ISSUE_DEFS = {
  accident:     { ico: '🚗', label: 'Accident',          color: 'var(--cr)', sev: 'SEVERE',   sevCls: 'cr' },
  construction: { ico: '🚧', label: 'Road Construction', color: 'var(--ca)', sev: 'MODERATE', sevCls: 'ca' },
  breakdown:    { ico: '🚛', label: 'Breakdown',         color: 'var(--cr)', sev: 'HIGH',     sevCls: 'cr' },
};

/* ══ LEFT PANEL RENDERER ══ */
function renderIssuePanel(issueCounts) {
  const container = document.querySelector('.panel-inner');
  container.querySelectorAll('.issue-card, .no-issues-msg').forEach(el => el.remove());

  const totalIssues = Object.values(issueCounts).reduce((a, b) => a + b, 0);

  // Empty state — shown when city has no issue-type messages yet
  if (totalIssues === 0) {
    const empty = document.createElement('div');
    empty.className = 'no-issues-msg';
    empty.style.cssText = [
      'text-align:center',
      'padding:24px 12px',
      'font-size:.75rem',
      'color:var(--sub)',
      'line-height:1.7',
      'border:1px dashed var(--bdr)',
      'border-radius:var(--r)',
      'background:var(--card)',
    ].join(';');
    empty.innerHTML = `
      <div style="font-size:1.8rem;margin-bottom:8px">✅</div>
      <strong style="color:var(--cg);font-size:.78rem">No major issues</strong><br>
      Roads are clear at<br><em style="color:var(--c)">${S.city}</em><br>
      <span style="font-size:.68rem;opacity:.7;margin-top:6px;display:block">
        Issues appear here when<br>reporters mention accidents,<br>breakdowns or roadblocks.
      </span>`;
    container.appendChild(empty);
    return;
  }

  Object.keys(ISSUE_DEFS).forEach(function (key) {
    const count = issueCounts[key] || 0;
    if (count === 0) return;

    const def = ISSUE_DEFS[key];
    const pct = Math.min(15 + count * 10, 98);

    const card = document.createElement('div');
    card.className    = 'issue-card';
    card.dataset.type = key;
    card.innerHTML = `
      <div class="ic-top">
        <span class="ic-ico">${def.ico}</span>
        <div class="ic-info">
          <span class="ic-type">${def.label}</span>
          <span class="ic-loc">${count} unique reporter${count !== 1 ? 's' : ''}</span>
        </div>
        <span class="ic-pulse" style="background:${def.color};box-shadow:0 0 8px ${def.color}"></span>
      </div>
      <div class="ic-tags">
        <span class="tag ${def.sevCls === 'cr' ? 'red' : 'amber'}">${count} User${count !== 1 ? 's' : ''}</span>
        <span class="tag green">Live</span>
      </div>
      <div class="sev-row">
        <div class="sev-bar">
          <div class="sev-fill" style="width:${pct}%;background:${def.color}"></div>
        </div>
        <span class="sev-txt ${def.sevCls}">${def.sev}</span>
      </div>`;
    container.appendChild(card);
    gsap.fromTo(card, { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: .4, ease: 'power2.out' });
  });
}

/* ══ ATTACH CITY LISTENERS ══ */
function attachCityListeners(db, rdb, cityName) {

  // ★ DEBUG: Log which city this room is loading (check browser console)
  console.log('[TrafficIQ] Loading traffic room for city:', JSON.stringify(cityName));
  document.getElementById('tbCity').textContent = cityName;

  // Detach old listener if switching cities
  if (S._unsubMessages) {
    S._unsubMessages();
    S._unsubMessages = null;
  }

  // Reset feed for this city
  feed.innerHTML = '';
  renderedIds.clear();

  /* ── PRESENCE via Realtime Database ── */
  const presencePath = rdb.ref('presence/' + S.name.replace(/[.#$\[\]]/g, '_'));
  presencePath.set({ name: S.name, city: cityName, online: true });
  presencePath.onDisconnect().remove();

  // Count only users in this city
  rdb.ref('presence').on('value', function (snap) {
    let count = 0;
    snap.forEach(child => {
      if (child.val().city === cityName) count++;
    });
    document.getElementById('tbOnline').textContent = count;
  });

  /* ── MESSAGES — filtered by city ──
     ⚠️  Firestore requires a composite index for where + orderBy.
     If messages don't load, check the browser console for a Firebase
     link → click it → "Create Index" in Firebase Console.
     Fields: city (Ascending) + timestamp (Ascending)
  ── */
  const query = db.collection('enter_traffic_messages')
    .where('city', '==', cityName)
    .orderBy('timestamp', 'asc');

  S._unsubMessages = query.onSnapshot(function (snapshot) {

    const issueUsers = {
      accident:     new Set(),
      construction: new Set(),
      breakdown:    new Set(),
    };
    const uniqueSenders = new Set();

    snapshot.forEach(function (doc) {
      const d    = doc.data();
      // ★ DOUBLE GUARD: skip docs from other cities
      if (d.city && d.city !== cityName) return;
      const name = (d.name || 'unknown').trim();
      uniqueSenders.add(name);
      const type = detectIssueType(d.msg || '');
      if (type && issueUsers[type] !== undefined) {
        issueUsers[type].add(name);
      }
    });

    document.getElementById('tbRep').textContent = uniqueSenders.size;

    renderIssuePanel({
      accident:     issueUsers.accident.size,
      construction: issueUsers.construction.size,
      breakdown:    issueUsers.breakdown.size,
    });

    // Render newly added messages only
    snapshot.docChanges().forEach(function (change) {
      if (change.type === 'added') {
        const d  = change.doc.data();
        const id = change.doc.id;

        // ★ DOUBLE GUARD: skip any doc that doesn't match this city
        // This catches old docs without city field AND any index failures
        if (d.city && d.city !== cityName) return;

        // Remove matching optimistic message if present
        const tempMsgs = feed.querySelectorAll('[data-msg-id^="temp-"]');
        if (d.name === S.name) {
          tempMsgs.forEach(el => {
            const bubble = el.querySelector('.bubble');
            if (bubble && bubble.textContent === d.msg) el.remove();
          });
        }

        addMsg({
          id:        id,
          name:      d.name      || 'Unknown',
          role:      d.role      || 'b',
          score:     d.score     || 0,
          init:      (d.name || 'UN').substring(0, 2).toUpperCase(),
          msg:       d.msg       || '',
          timestamp: d.timestamp || null,
          own:       d.name === S.name,
        });
      }
    });

  }, function (err) {
    console.error('enter_traffic_messages error:', err);
    // Show index creation hint
    if (err.code === 'failed-precondition') {
      const div = document.createElement('div');
      div.style.cssText = 'padding:12px 18px;font-size:.75rem;color:var(--ca);text-align:center;';
      div.textContent = '⚠️ Firestore index needed — check browser console for setup link.';
      feed.appendChild(div);
    }
  });
}

/* ══ WAIT FOR FIREBASE THEN INIT ══ */
function waitForDB(cb, tries) {
  tries = tries || 0;
  if (window._db && window._rdb) { cb(window._db, window._rdb); return; }
  if (tries > 50) { console.warn('Firebase not available'); return; }
  setTimeout(function () { waitForDB(cb, tries + 1); }, 100);
}

waitForDB(function (db, rdb) {
  attachCityListeners(db, rdb, S.city);
});