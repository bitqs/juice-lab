import { createScene } from './scene.js';
import { buildModules } from './juice.js';
import { STEPS } from './steps.js';
import { t, lang, setLang } from './i18n.js';

let L = lang;   // 当前语言('en' 默认)

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
  overload: 1,              // 过载倍率
  scale: 1,                 // 速度坡道(juice⑯):<1 慢动作
  scaleLeft: 0,             //   慢动作剩余真实秒
  skip: 0,                  // 抽帧(juice⑯):下一帧额外跳过的世界时间
  zoom: { v: 1, cx: 320, cy: 220 },   // 急推变焦(juice⑯)
  kick: { x: 0, y: 0 },     // 镜头后坐(juice⑯):方向性位移,非随机
  tilt: 0,                  // 荷兰角(juice⑯):重击瞬间画面微倾
  freeze(sec) { this.freezeLeft = Math.max(this.freezeLeft, sec); },
  slowmo(factor, sec) { this.scale = factor; this.scaleLeft = sec; },
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
  const tag = document.getElementById('step-tag');
  tag.textContent = `${t('step')} ${step} · ${s.act[L]}`;
  tag.dataset.act = s.act.zh;                 // 配色键固定用中文值
  document.getElementById('step-name').textContent = s.name[L];
  document.getElementById('step-desc').textContent = s.desc[L];
  document.getElementById('step-params').textContent = s.params[L];
  document.getElementById('step-source').textContent = s.source[L];
  document.getElementById('prev').disabled = step === 0;
  document.getElementById('next').disabled = step === STEPS.length - 1;
  document.getElementById('overload-row').hidden = step !== STEPS.length - 1;

  // 步进点
  const dots = document.getElementById('dots');
  dots.innerHTML = '';
  STEPS.forEach((st, i) => {
    const d = document.createElement('div');
    d.className = 'dot' + (i === step ? ' active' : i < step ? ' passed' : '');
    d.dataset.act = st.act.zh;
    d.title = st.name[L];
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
    label.appendChild(document.createTextNode(m.name[L]));
    box.appendChild(label);
  });
}

// 静态 UI 文案(随语言切换重渲)
function renderStatic() {
  document.getElementById('title').textContent = t('title');
  document.getElementById('subtitle').textContent = t('subtitle');
  document.getElementById('stage-hint').textContent = t('hint');
  document.getElementById('ab-label').textContent = t('ab');
  document.getElementById('ab-state').textContent = abShowingBase ? t('abBase') : t('abCurrent');
  document.getElementById('prev').textContent = t('prev');
  document.getElementById('next').textContent = t('next');
  document.getElementById('free-title').textContent = t('freeMode');
  document.getElementById('free-hint').textContent = t('freeModeHint');
  document.getElementById('overload-label').textContent = t('overloadLabel') + ' ';
  document.getElementById('overload-warn').textContent = t('overloadWarn');
  document.getElementById('auto-btn').textContent = t('auto') + (auto ? t('on') : t('off'));
  document.getElementById('gif-btn').textContent = t('gif');
  document.getElementById('ult-btn-dom').textContent = t('ultBtn');
  document.getElementById('lang-btn').textContent = L === 'en' ? '中文' : 'EN';
}

document.getElementById('prev').onclick = () => applyStep(step - 1);
document.getElementById('next').onclick = () => applyStep(step + 1);

// A/B 对比
document.getElementById('ab-btn').onclick = () => {
  if (!abShowingBase) {
    savedEnabled = juice.modules.map(m => m.enabled);
    juice.modules.forEach(m => m.enabled = false);
    abShowingBase = true;
  } else {
    juice.modules.forEach((m, i) => m.enabled = savedEnabled[i]);
    abShowingBase = false;
  }
  document.getElementById('ab-state').textContent = abShowingBase ? t('abBase') : t('abCurrent');
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
  e.target.textContent = t('auto') + (auto ? t('on') : t('off'));
};

document.getElementById('gif-btn').onclick = () => alert(t('gifAlert'));

// ---------- 输入 ----------
// 输入:点按=攻击;长按(>180ms)=向按住一侧移动;键盘 A/D 移动、空格攻击
const ultMod = juice.modules.find(m => m.id === 'ultimate');
const ultBtn = document.getElementById('ult-btn-dom');
ultBtn.onclick = () => ultMod.trigger();

let holdTimer = null, holding = false;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width * 640;
  holdTimer = setTimeout(() => {
    holding = true;
    if (px < scene.player.x) scene.input.left = true;
    else scene.input.right = true;
  }, 180);
});
function releaseHold() {
  clearTimeout(holdTimer);
  if (holding) { holding = false; scene.input.left = scene.input.right = false; }
  else if (holdTimer !== null) scene.attack();   // 快速点按 = 攻击
  holdTimer = null;
}
canvas.addEventListener('pointerup', releaseHold);
canvas.addEventListener('pointercancel', releaseHold);
canvas.addEventListener('pointerleave', releaseHold);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); scene.attack(); }
  if (e.code === 'KeyU') ultMod.trigger();
  if (e.code === 'KeyA') scene.input.left = true;
  if (e.code === 'KeyD') scene.input.right = true;
  if (e.code === 'ArrowRight') applyStep(step + 1);
  if (e.code === 'ArrowLeft') applyStep(step - 1);
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyA') scene.input.left = false;
  if (e.code === 'KeyD') scene.input.right = false;
});

// 语言切换 / 一键全开
document.getElementById('lang-btn').onclick = () => {
  L = L === 'en' ? 'zh' : 'en';
  setLang(L);
  renderStatic(); renderUI();
};
document.getElementById('max-btn').onclick = () => applyStep(STEPS.length - 1);

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

  // 速度坡道(电影):慢动作计时用真实时间,到点瞬间恢复 1x
  if (time.scaleLeft > 0) {
    time.scaleLeft -= (now - frameStart) / 1000;
    if (time.scaleLeft <= 0) time.scale = 1;
  }
  dt *= time.scale;
  // 抽帧:命中帧直接吞掉一小段时间 — 剪辑师的"去一帧"
  if (time.skip > 0) { dt += time.skip; time.skip = 0; }

  if (auto) {
    const gap = scene.dummy.x - scene.player.x;
    if (Math.abs(gap) > scene.REACH - 12) {              // 出了攻击距离 → 追
      scene.input.right = gap > 0; scene.input.left = gap < 0;
    } else {
      scene.input.right = scene.input.left = false;
      autoT -= dt;
      if (autoT <= 0) { scene.attack(); autoT = 0.55; } // 适配前后摇全程 ~490ms
    }
  }

  scene.update(dt);
  juice.fire('onUpdate', { dt });

  // 大招按钮:就绪才现身(手机靠它,桌面也可按 U)
  ultBtn.hidden = !(ultMod.enabled && ultMod._charge >= 100 && !ultMod._state);

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

  // 镜头后坐 + 荷兰角:真实时间衰减
  time.kick.x *= Math.exp(-realDt * 14);
  time.kick.y *= Math.exp(-realDt * 14);
  time.tilt *= Math.exp(-realDt * 9);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(sh.x + time.kick.x, sh.y + time.kick.y);
  // 荷兰角:绕画面中心微倾
  if (Math.abs(time.tilt) > 0.0005) {
    ctx.translate(320, 220);
    ctx.rotate(time.tilt);
    ctx.translate(-320, -220);
  }
  // 急推变焦:向焦点(假人)推近
  const z = time.zoom;
  if (z.v !== 1) {
    ctx.translate(z.cx, z.cy);
    ctx.scale(z.v, z.v);
    ctx.translate(-z.cx, -z.cy);
  }
  scene.draw(ctx);
  juice.fire('onDraw', { ctx });
  ctx.restore();

  requestAnimationFrame(frame);
}

renderStatic();
applyStep(0);
requestAnimationFrame(frame);

// 调试/截图在环验证用
window.__lab = { scene, juice, time, applyStep };
