import { createScene } from './scene.js';
import { buildModules } from './juice.js';
import { STEPS } from './steps.js';

// ---------- juice 注册表 ----------
export const juice = {
  modules: [],
  register(mod) { this.modules.push(mod); },
  fire(hook, payload) {
    for (const m of this.modules) if (m.enabled && m[hook]) m[hook](payload);
  },
};

// ---------- 全局时间控制(顿帧 hitstop 的执行机构) ----------
export const time = {
  freezeLeft: 0,            // 顿帧剩余秒(真实时间)
  shake: { mag: 0, decay: 0, x: 0, y: 0 },
  overload: 1,              // 第 10 步过载倍率
  freeze(sec) { this.freezeLeft = Math.max(this.freezeLeft, sec); },
};

// ---------- 初始化 ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scene = createScene(juice);
buildModules(juice, scene, time);

// ---------- 步进状态机 ----------
let step = 0;
let abShowingBase = false;          // A/B 对比:true = 临时回到第 0 步
let savedEnabled = null;

function applyStep(n) {
  step = Math.max(0, Math.min(STEPS.length - 1, n));
  juice.modules.forEach((m, i) => { m.enabled = i < step; });
  abShowingBase = false;
  renderUI();
}

function renderUI() {
  const s = STEPS[step];
  document.getElementById('step-tag').textContent = `STEP ${step}`;
  document.getElementById('step-name').textContent = s.name;
  document.getElementById('step-desc').textContent = s.desc;
  document.getElementById('step-params').textContent = s.params;
  document.getElementById('step-source').textContent = s.source;
  document.getElementById('prev').disabled = step === 0;
  document.getElementById('next').disabled = step === STEPS.length - 1;
  document.getElementById('overload-row').hidden = step !== STEPS.length - 1;

  // 步进点
  const dots = document.getElementById('dots');
  dots.innerHTML = '';
  STEPS.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'dot' + (i === step ? ' active' : i < step ? ' passed' : '');
    d.onclick = () => applyStep(i);
    dots.appendChild(d);
  });

  renderToggles();
}

function renderToggles() {
  const box = document.getElementById('toggles');
  box.innerHTML = '';
  juice.modules.forEach((m) => {
    const label = document.createElement('label');
    label.className = m.enabled ? 'on' : '';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = m.enabled;
    cb.onchange = () => { m.enabled = cb.checked; label.className = m.enabled ? 'on' : ''; };
    label.appendChild(cb);
    label.appendChild(document.createTextNode(m.name));
    box.appendChild(label);
  });
}

document.getElementById('prev').onclick = () => applyStep(step - 1);
document.getElementById('next').onclick = () => applyStep(step + 1);

// A/B 对比
document.getElementById('ab-btn').onclick = () => {
  if (!abShowingBase) {
    savedEnabled = juice.modules.map(m => m.enabled);
    juice.modules.forEach(m => m.enabled = false);
    abShowingBase = true;
    document.getElementById('ab-state').textContent = '第 0 步(裸)';
  } else {
    juice.modules.forEach((m, i) => m.enabled = savedEnabled[i]);
    abShowingBase = false;
    document.getElementById('ab-state').textContent = '当前配置';
  }
  renderToggles();
};

// 过载滑杆
document.getElementById('overload').oninput = (e) => {
  time.overload = parseFloat(e.target.value);
  document.getElementById('overload-val').textContent = time.overload.toFixed(1) + 'x';
};

// 自动连击
let auto = false, autoT = 0;
document.getElementById('auto-btn').onclick = (e) => {
  auto = !auto;
  e.target.textContent = `🤖 自动连击:${auto ? '开' : '关'}`;
};

document.getElementById('gif-btn').onclick = () => alert('GIF 录制 v2 安排上 — 先用系统录屏吧');

// ---------- 输入 ----------
canvas.addEventListener('pointerdown', () => scene.attack());
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); scene.attack(); }
  if (e.code === 'ArrowRight') applyStep(step + 1);
  if (e.code === 'ArrowLeft') applyStep(step - 1);
});

// ---------- 主循环 ----------
let last = performance.now();
function frame(now) {
  const frameStart = last;
  let dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  // 顿帧:冻结期间游戏时间为 0(真实时间仍在走)
  if (time.freezeLeft > 0) {
    time.freezeLeft -= dt;
    dt = 0;
  }

  if (auto) {
    autoT -= dt;
    if (autoT <= 0) { scene.attack(); autoT = 0.38; }
  }

  scene.update(dt);
  juice.fire('onUpdate', { dt });

  // 屏震(真实时间衰减,不受顿帧影响 — 顿帧时震动仍在走才有"砸"感)
  // 整屏震:画布内容 + 整个页面一起位移
  const sh = time.shake;
  const realDt = Math.min((now - frameStart) / 1000 + 0.016, 0.05);
  if (sh.mag > 0.15) {
    sh.x = (Math.random() * 2 - 1) * sh.mag;
    sh.y = (Math.random() * 2 - 1) * sh.mag;
    sh.mag *= Math.exp(-realDt / (sh.decay * 0.45));
    document.body.style.transform = `translate(${sh.x}px, ${sh.y}px)`;
  } else if (sh.mag !== 0) {
    sh.x = sh.y = 0; sh.mag = 0;
    document.body.style.transform = '';
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(sh.x, sh.y);
  scene.draw(ctx);
  juice.fire('onDraw', { ctx });
  ctx.restore();

  requestAnimationFrame(frame);
}

applyStep(0);
requestAnimationFrame(frame);

// 调试/截图在环验证用
window.__lab = { scene, juice, time, applyStep };
