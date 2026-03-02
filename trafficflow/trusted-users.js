/* TrafficIQ — trusted-users.js (Legends Leaderboard) */
'use strict';

/* ══ THREE.JS HIGHWAY BACKGROUND — identical to enter-traffic ══ */
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

        float s1 = streak(uv,  0.498, 0.0,  0.18, 0.08);
        float s2 = streak(uv,  0.502, 0.3,  0.14, 0.06);
        vec2 flip = vec2(1.0 - uv.x, uv.y);
        float s3 = streak(flip, 0.495, 0.1,  0.22, 0.07);
        float s4 = streak(flip, 0.505, 0.6,  0.17, 0.05);
        float s5 = streak(uv,  0.252, 0.2,  0.13, 0.06);
        float s6 = streak(uv,  0.748, 0.5,  0.16, 0.07);
        float s7 = streak(flip, 0.748, 0.4,  0.19, 0.06);

        col += vec3(0.9, 0.15, 0.1)  * (s1+s2) * uDark;
        col += vec3(0.85,0.90,1.0)   * (s3+s4) * uDark;
        col += vec3(1.0, 0.80, 0.2)  * (s5+s6+s7) * uDark;
        col += vec3(0.15,0.35,0.9)   * (s1+s2+s3+s4+s5+s6+s7) * (1.0-uDark) * .25;

        float ix1 = smoothstep(.04, .0, length(uv - vec2(.33,.50)));
        float ix2 = smoothstep(.04, .0, length(uv - vec2(.66,.50)));
        float ix3 = smoothstep(.035,.0, length(uv - vec2(.33,.25)));
        float ix4 = smoothstep(.035,.0, length(uv - vec2(.66,.75)));
        float ixAll = max(max(ix1,ix2),max(ix3,ix4));
        col += vec3(0.0,0.75,1.0) * ixAll * 0.18 * uDark;
        col += vec3(0.1,0.4, 0.9) * ixAll * 0.10 * (1.0-uDark);

        float v = length(uv - .5) * 1.2;
        col *= 1.0 - v*v * mix(.2,.5,uDark);

        gl_FragColor = vec4(col, mix(.22,.72,uDark));
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

  addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight));
  window._bgMat = mat;
})();

/* ══ STATE ══ */
const S = {
  theme: localStorage.getItem('tiq-theme') || 'dark',
  coins: 142,
  reports: 38,
  reportsForNext: 2,
  rank: 14,
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

/* ══ LEADERBOARD DATA ══ */
const USERS = [
  { name:'Deepa K.',  init:'DK', role:'g', score:98, coins:1240, badge:'Legend',    move:+2, badges:['🏆 Legend','🔥 Streak','✓ Verified'] },
  { name:'Ravi K.',   init:'RK', role:'g', score:97, coins:1105, badge:'Legend',    move: 0, badges:['🏆 Legend','✓ Verified'] },
  { name:'Raj V.',    init:'RV', role:'g', score:95, coins: 980, badge:'Elite',     move:+1, badges:['💎 Elite','🔥 Streak'] },
  { name:'Lata P.',   init:'LP', role:'g', score:93, coins: 855, badge:'Elite',     move:-1, badges:['💎 Elite','✓ Verified'] },
  { name:'Ankit S.',  init:'AS', role:'g', score:91, coins: 780, badge:'Pro',       move:+3, badges:['⭐ Pro','🔥 Streak'] },
  { name:'Irfan M.',  init:'IM', role:'g', score:89, coins: 702, badge:'Pro',       move: 0, badges:['⭐ Pro'] },
  { name:'Mohan D.',  init:'MD', role:'g', score:88, coins: 650, badge:'Pro',       move:-1, badges:['⭐ Pro','✓ Verified'] },
  { name:'Priya M.',  init:'PM', role:'b', score:82, coins: 510, badge:'Active',    move:+1, badges:['👤 Active'] },
  { name:'Neha R.',   init:'NR', role:'b', score:76, coins: 390, badge:'Active',    move: 0, badges:['👤 Active'] },
  { name:'Sahi R.',   init:'SR', role:'b', score:72, coins: 310, badge:'Active',    move:+2, badges:['👤 Active'] },
];

/* ══ REWARDS DATA ══ */
const REWARDS = [
  {
    ico:'📱', name:'₹20 Recharge',
    req:'200 Coins', detail:'58 more coins needed',
    progress: 71, fill:'linear-gradient(90deg,#00cfff,#7b61ff)',
    status:'close', statusTxt:'Almost there!',
    coinCost: 200,
  },
  {
    ico:'🎫', name:'₹50 Voucher',
    req:'500 Coins', detail:'358 more coins needed',
    progress: 28, fill:'linear-gradient(90deg,#f59e0b,#ef4444)',
    status:'locked', statusTxt:'🔒 Locked',
    coinCost: 500,
  },
  {
    ico:'🛡️', name:'Verified Badge',
    req:'2 More Reports',  detail:'2 verified reports needed',
    progress: 95, fill:'linear-gradient(90deg,#22c55e,#00cfff)',
    status:'close', statusTxt:'2 reports away!',
    coinCost: 0,
  },
  {
    ico:'🏆', name:'Legend Status',
    req:'Score 95+', detail:'Need 17 more trust points',
    progress: 82, fill:'linear-gradient(90deg,#f59e0b,#a78bfa)',
    status:'locked', statusTxt:'🔒 Locked',
    coinCost: 0,
  },
];

/* ══ EARN ACTIONS ══ */
const EARN = [
  { ico:'✅', name:'Verified Report', desc:'Submit accurate traffic info',            coins:'+10' },
  { ico:'💬', name:'Comment Upvoted', desc:'Your comment got 5+ upvotes',             coins:'+5'  },
  { ico:'🔥', name:'Daily Streak',    desc:'Report every day for 7 days',             coins:'+25' },
  { ico:'📍', name:'First Reporter',  desc:'First to report a new incident',          coins:'+15' },
  { ico:'👑', name:'Top Reporter',    desc:'#1 reporter in your city this week',      coins:'+50' },
  { ico:'🤝', name:'Referral Bonus',  desc:'Friend joins via your link',              coins:'+20' },
];

/* ══ BADGES ══ */
const BADGES = [
  { ico:'🔰', name:'Newcomer',    sub:'0–10 reports',     earned:true,  prog:100, color:'#94a3b8' },
  { ico:'⭐', name:'Pro',         sub:'50+ reports',      earned:true,  prog:100, color:'#00cfff' },
  { ico:'💎', name:'Elite',       sub:'100+ reports',     earned:false, prog:76,  color:'#a78bfa' },
  { ico:'🏆', name:'Legend',      sub:'Score 95+',        earned:false, prog:42,  color:'#f59e0b' },
  { ico:'🔥', name:'On Fire',     sub:'7-day streak',     earned:true,  prog:100, color:'#ff8c42' },
  { ico:'🛡️', name:'Verified',    sub:'Trusted reporter', earned:false, prog:95,  color:'#22c55e' },
];

/* ══ BUILD PODIUM ══ */
function buildPodium() {
  const podium = document.getElementById('podium');
  const top3 = USERS.slice(0, 3);
  const order = [1, 0, 2]; // 2nd, 1st, 3rd

  order.forEach(i => {
    const u = top3[i];
    const rank = i + 1;
    const slot = document.createElement('div');
    slot.className = `podium-slot ${['first','second','third'][i]}`;

    const rankClass = `rank-${rank}`;
    const crown = rank === 1 ? '<span class="pod-crown">👑</span>' : '';
    const heights = ['52px','36px','24px'];

    slot.innerHTML = `
      <div class="pod-av-wrap">
        ${crown}
        <div class="pod-av ${u.role}" title="${u.name}">${u.init}</div>
        <div class="pod-rank-badge ${rankClass}">${rank}</div>
      </div>
      <div class="pod-name">${u.name.split(' ')[0]}</div>
      <div class="pod-score">${u.score}/100</div>
      <div class="pod-coins">🪙 ${u.coins.toLocaleString()}</div>
      <div class="pod-platform">#${rank}</div>`;
    podium.appendChild(slot);
  });
}

/* ══ BUILD RANK LIST (4–10) ══ */
function buildRankList() {
  const list = document.getElementById('rankList');
  USERS.slice(3).forEach((u, i) => {
    const rank = i + 4;
    const moveIcon = u.move > 0
      ? `<span class="rr-move up">▲${u.move}</span>`
      : u.move < 0
        ? `<span class="rr-move down">▼${Math.abs(u.move)}</span>`
        : `<span class="rr-move same">—</span>`;

    const badgeChips = u.badges.slice(0, 2).map(b => {
      const colorMap = { '🏆':' bc-gold','💎':' bc-purple','⭐':' bc-cyan','🔥':' bc-gold','✓':' bc-green','👤':' bc-cyan' };
      const cls = Object.entries(colorMap).find(([k]) => b.includes(k))?.[1] || ' bc-cyan';
      return `<span class="badge-chip${cls}">${b}</span>`;
    }).join('');

    const row = document.createElement('div');
    row.className = 'rank-row';
    row.innerHTML = `
      <span class="rr-num">${rank}</span>
      <div class="rr-av ${u.role}">${u.init}</div>
      <div class="rr-info">
        <div class="rr-name">${u.name}</div>
        <div class="rr-badges">${badgeChips}</div>
      </div>
      <div class="rr-right">
        <span class="rr-score">${u.score}</span>
        <span class="rr-coins">🪙 ${u.coins}</span>
        ${moveIcon}
      </div>`;
    row.addEventListener('click', () => spawnCoinFloat(row, ''));
    list.appendChild(row);
  });
}

/* ══ MY RANK ══ */
function buildMyRank() {
  const card = document.getElementById('myRankCard');
  card.innerHTML = `
    <span class="rr-num" style="color:var(--c);font-size:.85rem">${S.rank}</span>
    <div class="rr-av b">YO</div>
    <div class="rr-info">
      <div class="rr-name">You</div>
      <div class="rr-badges"><span class="badge-chip bc-cyan">👤 Active</span></div>
    </div>
    <div class="rr-right">
      <span class="rr-score" style="font-size:.85rem">75</span>
      <span class="rr-coins">🪙 ${S.coins}</span>
      <span class="rr-move up">▲3</span>
    </div>`;
}

/* ══ BUILD REWARDS ══ */
function buildRewards() {
  const grid = document.getElementById('rewardsGrid');
  REWARDS.forEach(r => {
    const card = document.createElement('div');
    card.className = `reward-card ${r.status === 'unlocked' ? 'unlocked' : r.status === 'close' ? '' : 'locked'}`;

    const fillColor = r.fill || 'linear-gradient(90deg,var(--c),#7b61ff)';
    const statusClass = r.status === 'unlocked' ? 'unlocked' : r.status === 'close' ? 'close' : 'locked';
    const statusDot = r.status === 'close' ? '⚡' : r.status === 'unlocked' ? '✓' : '🔒';

    card.innerHTML = `
      <div class="rw-ico">${r.ico}</div>
      <div class="rw-name">${r.name}</div>
      <div class="rw-req">
        <strong>${r.req}</strong><br>
        <span class="rr-need">${r.detail}</span>
      </div>
      <div class="rw-progress-wrap">
        <div class="rw-bar"><div class="rw-fill" style="width:0%;background:${fillColor}" data-target="${r.progress}"></div></div>
        <div class="rw-pct">${r.progress}%</div>
      </div>
      <span class="rw-status ${statusClass}">${statusDot} ${r.statusTxt}</span>`;

    card.addEventListener('click', () => {
      if (r.status !== 'locked') spawnCoinFloat(card, r.status === 'close' ? '⚡ Almost!' : '✅ Unlocked!');
    });
    grid.appendChild(card);
  });
}

/* ══ BUILD EARN LIST ══ */
function buildEarnList() {
  const list = document.getElementById('earnList');
  EARN.forEach(e => {
    const row = document.createElement('div');
    row.className = 'earn-row';
    row.innerHTML = `
      <div class="earn-ico">${e.ico}</div>
      <div class="earn-info">
        <div class="earn-name">${e.name}</div>
        <div class="earn-desc">${e.desc}</div>
      </div>
      <div class="earn-coins">🪙 ${e.coins}</div>`;
    row.addEventListener('click', () => spawnCoinFloat(row, e.coins));
    list.appendChild(row);
  });
}

/* ══ BUILD BADGE GRID ══ */
function buildBadges() {
  const grid = document.getElementById('badgeGrid');
  BADGES.forEach(b => {
    const card = document.createElement('div');
    card.className = `badge-card ${b.earned ? 'earned' : 'locked-b'}`;
    card.innerHTML = `
      <div class="badge-ico">${b.ico}</div>
      <div class="badge-name">${b.name}</div>
      <div class="badge-sub">${b.sub}</div>
      <div class="badge-prog">
        <div class="badge-prog-fill" style="width:0%;background:${b.color}" data-target="${b.prog}"></div>
      </div>`;
    if (b.earned) card.addEventListener('click', () => spawnCoinFloat(card, '🎖 Earned!'));
    grid.appendChild(card);
  });
}

/* ══ COIN FLOAT ANIMATION ══ */
function spawnCoinFloat(el, text) {
  const rect = el.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'coin-float';
  div.textContent = text || '🪙 +5';
  div.style.left = (rect.left + rect.width / 2) + 'px';
  div.style.top  = (rect.top - 10) + 'px';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1000);
}

/* ══ ANIMATE WALLET BAR ══ */
function animateWalletBar() {
  const pct = Math.round(S.coins / 200 * 100);
  setTimeout(() => {
    document.getElementById('walletFill').style.width = pct + '%';
  }, 600);
}

/* ══ ANIMATE ALL PROGRESS BARS ══ */
function animateBars() {
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    setTimeout(() => { el.style.width = target + '%'; }, 700 + Math.random() * 300);
  });
}

/* ══ LIVE RANK TICKER ══ */
function startRankTicker() {
  setInterval(() => {
    const rows = document.querySelectorAll('.rank-row');
    if (!rows.length) return;
    const idx = Math.floor(Math.random() * rows.length);
    const row = rows[idx];
    gsap.fromTo(row,
      { backgroundColor: 'rgba(0,207,255,0.08)' },
      { backgroundColor: 'transparent', duration: 1.2, ease: 'power2.out' }
    );
    const scoreEl = row.querySelector('.rr-score');
    if (scoreEl) {
      const cur = parseInt(scoreEl.textContent);
      const delta = Math.random() < 0.6 ? 1 : -1;
      const next = Math.min(99, Math.max(50, cur + delta));
      scoreEl.textContent = next;
      gsap.fromTo(scoreEl,
        { color: delta > 0 ? 'var(--cg)' : 'var(--cr)' },
        { color: 'var(--c)', duration: .8, ease: 'power2.out' }
      );
    }
  }, 4000 + Math.random() * 2000);
}

/* ══ LIVE COIN COUNTER ══ */
function startCoinPulse() {
  setInterval(() => {
    const delta = Math.floor(Math.random() * 3) + 1;
    S.coins = Math.min(200, S.coins + delta);
    const el = document.getElementById('walletCoins');
    if (el) {
      el.textContent = S.coins;
      gsap.fromTo(el,
        { scale: 1.15, color: '#fbbf24' },
        { scale: 1, color: 'var(--cgold)', duration: .4, ease: 'back.out(2)' }
      );
      /* update bar */
      const pct = Math.round(S.coins / 200 * 100);
      document.getElementById('walletFill').style.width = pct + '%';
      document.getElementById('walletPct').textContent = pct + '%';
    }
  }, 7000);
}

/* ══ GSAP ENTRANCE ══ */
window.addEventListener('DOMContentLoaded', () => {
  /* Build everything */
  buildPodium();
  buildRankList();
  buildMyRank();
  buildRewards();
  buildEarnList();
  buildBadges();

  /* Animate in */
  gsap.to('#topbar', { y: 0, opacity: 1, duration: .6, ease: 'power3.out', delay: .1 });
  gsap.to('#panel',  { x: 0, opacity: 1, duration: .75, ease: 'power3.out', delay: .2 });
  gsap.from('.rewards-panel', { opacity: 0, duration: .5, ease: 'power2.out', delay: .3 });

  /* Podium slots */
  gsap.from('.podium-slot', {
    y: 30, opacity: 0, stagger: .12, duration: .55,
    ease: 'back.out(1.4)', delay: .4
  });

  /* Rank rows */
  gsap.from('.rank-row', {
    x: -20, opacity: 0, stagger: .07, duration: .4,
    ease: 'power2.out', delay: .55
  });

  /* Wallet */
  gsap.from('.wallet-card', {
    y: 16, opacity: 0, duration: .5, ease: 'power2.out', delay: .45
  });

  /* Reward cards */
  gsap.from('.reward-card', {
    y: 14, opacity: 0, stagger: .08, duration: .4,
    ease: 'power2.out', delay: .6
  });

  /* Badge cards */
  gsap.from('.badge-card', {
    scale: .88, opacity: 0, stagger: .06, duration: .35,
    ease: 'back.out(1.5)', delay: .75
  });

  /* Progress bars */
  setTimeout(animateBars, 500);
  animateWalletBar();

  /* Live effects */
  startRankTicker();
  startCoinPulse();
});