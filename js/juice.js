// 10 个打击感技术模块。统一接口:{id, name, enabled, onHit?, onKill?, onUpdate?, onDraw?}
// 参数全部溯源(见 steps.js 出处)。注册顺序 = 步骤顺序。

import { sfx } from './audio.js';
import { sprites } from './assets.js';
import { t } from './i18n.js';

export function buildModules(juice, scene, time) {

  // ① 闪白 tintFill — VS:命中 120ms 纯白,死亡 60ms(别盖住死亡动画)
  juice.register({
    id: 'flash', name: { en: '① Hit flash', zh: '① 闪白 tintFill' }, enabled: false,
    onHit({ target, kill }) { target.flashT = kill ? 0.06 : 0.12; },
  });

  // ② 顿帧 hitstop — 双层日式方案:
  //   普攻 = 对象级顿帧(只停受击者 45ms + 微振动,世界照走 — ベルトスクロール铁律)
  //   暴击 55ms / 处决 80ms = 世界级冻结(樱井:越重越久)
  juice.register({
    id: 'hitstop', name: { en: '② Hitstop', zh: '② 顿帧 hitstop' }, enabled: false,
    onHit({ target, crit, kill }) {
      if (kill) time.freeze(0.080);
      else if (crit) time.freeze(0.055);
      else target.selfFreeze = 0.045;
    },
  });

  // ③ 击退 + 死亡弹飞 — VS:速度取反 × deathKB,尸体沿攻击向量飞
  juice.register({
    id: 'knockback', name: { en: '③ Knockback+squash', zh: '③ 击退+挤压' }, enabled: false,
    onHit({ target, dir, kill }) {
      target.vx = dir * (kill ? 260 : 90);
      target.squashT = 1;                              // 挤压拉伸(迪士尼12原则)
      if (kill) { target.vy = -260; target.dy = 1; }   // 腾空
    },
  });

  // ④ 伤害数字 — VS:逐位精灵 + 弹跳缓动 + ±0.15 随机偏移防叠
  const numbers = [];
  juice.register({
    id: 'dmgnum', name: { en: '④ Damage numbers', zh: '④ 伤害数字' }, enabled: false,
    onHit({ target, dmg, crit }) {
      numbers.push({
        x: target.x + (Math.random() * 24 - 12),
        y: target.y - target.h / 2 - 8 - Math.random() * 10,
        vy: -120, t: 0, life: 0.7, text: String(dmg), crit,
      });
    },
    onUpdate({ dt }) {
      for (const n of numbers) { n.t += dt; n.y += n.vy * dt; n.vy += 380 * dt; }
      for (let i = numbers.length - 1; i >= 0; i--) if (numbers[i].t > numbers[i].life) numbers.splice(i, 1);
    },
    onDraw({ ctx }) {
      for (const n of numbers) {
        const a = 1 - Math.max(0, (n.t - n.life * 0.6) / (n.life * 0.4));
        const size = (n.crit ? 30 : 20) * Math.min(1, 6 * n.t + 0.55) * time.overload;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = `bold ${size}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = n.crit ? '#ffd34d' : '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(n.text, n.x, n.y);
        ctx.fillText(n.text, n.x, n.y);
        ctx.restore();
      }
    },
  });

  // ⑤ 命中贴片 + 冲击波 — VS HITVFX 表:接触点星形 + 扩散环
  const vfx = [];
  juice.register({
    id: 'hitvfx', name: { en: '⑤ Hit VFX', zh: '⑤ 命中贴片+冲击波' }, enabled: false,
    onHit({ target, crit }) {
      const x = target.x - target.w / 2, y = target.y - 10 + Math.random() * 20;
      vfx.push({ kind: 'star', x, y, t: 0, life: 0.09, big: crit });
      vfx.push({ kind: 'ring', x, y, t: 0, life: 0.18, big: crit });
    },
    onUpdate({ dt }) {
      for (const v of vfx) v.t += dt;
      for (let i = vfx.length - 1; i >= 0; i--) if (vfx[i].t > vfx[i].life) vfx.splice(i, 1);
    },
    onDraw({ ctx }) {
      for (const v of vfx) {
        const p = v.t / v.life;
        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.globalAlpha = 1 - p;
        if (v.kind === 'star') {
          const r = (v.big ? 22 : 14) * (0.5 + p) * time.overload;
          ctx.fillStyle = '#fff';
          ctx.rotate(Math.PI / 4 * p);
          for (let i = 0; i < 4; i++) {                  // 4 角星
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -r); ctx.lineTo(3, -3); ctx.lineTo(-3, -3);
            ctx.closePath(); ctx.fill();
          }
        } else {
          ctx.strokeStyle = v.big ? '#ffd34d' : '#cfd6e4';
          ctx.lineWidth = 2 * (1 - p) + 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, (v.big ? 34 : 22) * p * time.overload + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    },
  });

  // ⑥ 死亡粒子爆裂 — 12 粒放射 + 重力,颜色继承本体
  const parts = [];
  juice.register({
    id: 'particles', name: { en: '⑥ Death particles', zh: '⑥ 死亡粒子' }, enabled: false,
    onKill({ target, dir }) {
      const n = Math.round(12 * time.overload);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 120 + Math.random() * 180;
        parts.push({
          x: target.x, y: target.y,
          vx: Math.cos(a) * sp + dir * 60, vy: Math.sin(a) * sp - 120,
          t: 0, life: 0.6, size: 3 + Math.random() * 4,
          color: Math.random() < 0.7 ? '#c97b4a' : '#a05c34',
        });
      }
    },
    onUpdate({ dt }) {
      for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t > parts[i].life) parts.splice(i, 1);
    },
    onDraw({ ctx }) {
      for (const p of parts) {
        ctx.globalAlpha = 1 - p.t / p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    },
  });

  // ⑦ 屏震 — VS 铁律:普攻零屏震,屏震是稀缺资源,只给击杀/暴击
  juice.register({
    id: 'shake', name: { en: '⑦ Screen shake (scarce!)', zh: '⑦ 屏震(稀缺!)' }, enabled: false,
    onHit({ crit, kill }) {
      if (kill) { time.shake.mag = 11 * time.overload; time.shake.decay = 0.35; }
      else if (crit) { time.shake.mag = 6 * time.overload; time.shake.decay = 0.22; }
      // 普攻 0:每秒几十次命中全震 = 晕船
    },
  });

  // ⑧ 音效分层 — Vlambeer:重击给低频;命中/暴击/击杀三档
  juice.register({
    id: 'sfx', name: { en: '⑧ Layered SFX', zh: '⑧ 音效分层' }, enabled: false,
    onHit({ crit, kill }) { sfx(kill ? 'kill' : crit ? 'crit' : 'hit'); },
  });

  // ⑨ タメツメ — 打击帧笔记:慢蓄(タメ)→ 瞬斩(ツメ),不对称配速
  juice.register({
    id: 'tametsume', name: { en: '⑨ Tame-tsume', zh: '⑨ タメツメ前摇' }, enabled: false,
    _saved: null,
    onUpdate() {
      // enabled 时改写攻击配速;关闭时还原
      if (!this._applied) {
        this._saved = { dur: scene.player.attackDur, pace: scene.player.pace };
        scene.player.attackDur = 0.23;                       // 0.18 蓄 + 0.05 斩
        scene.player.pace = t => t < 0.78 ? t * 0.45 : 0.35 + (t - 0.78) * 2.95; // 慢→快
        this._applied = true;
      }
    },
    onDisabled() {
      if (this._applied && this._saved) {
        scene.player.attackDur = this._saved.dur;
        scene.player.pace = this._saved.pace;
        this._applied = false;
      }
    },
  });

  // ⑩ 前后摇 + 硬直 — 格斗游戏基本功:攻击有重量是因为它有承诺(commitment)
  juice.register({
    id: 'commitment', name: { en: '⑩ Startup/recovery', zh: '⑩ 前后摇+硬直' }, enabled: false,
    onUpdate() { scene.flags.commitment = true; },
    onHit({ target }) { target.staggerT = 1; },          // 受击方硬直后仰
    onDisabled() { scene.flags.commitment = false; },
  });

  // ⑪ 挥砍残影(スミアフレーム)— 拉伸模糊的中间帧,稀疏关键帧间传达运动
  juice.register({
    id: 'smear', name: { en: '⑪ Smear frames', zh: '⑪ 挥砍残影' }, enabled: false,
    _trail: [],
    onUpdate({ dt }) {
      const s = scene.player.swordInfo;
      if (s && s.active) this._trail.push({ ...s, t: 0 });
      for (const tr of this._trail) tr.t += dt;
      this._trail = this._trail.filter(tr => tr.t < 0.12);
    },
    onDraw({ ctx }) {
      for (const tr of this._trail) {
        const a = (1 - tr.t / 0.12) * 0.35;
        ctx.save();
        ctx.translate(tr.px, tr.py);
        ctx.rotate(tr.angle);
        const g = ctx.createLinearGradient(0, -52, 0, 0);
        g.addColorStop(0, `rgba(140,200,255,${a})`);
        g.addColorStop(1, `rgba(140,200,255,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(-7, -52, 14, 52);                    // 比剑宽 = 拉伸感
        ctx.restore();
      }
    },
  });

  // ⑫ 剑气 — 挥砍命中后飞出新月形斩击波,远程二段命中(伤害 40%)
  juice.register({
    id: 'wave', name: { en: '⑫ Sword wave', zh: '⑫ 剑气' }, enabled: false,
    _waves: [],
    onHit({ melee, dir }) {
      if (!melee) return;                                 // 剑气的命中不再生剑气
      this._waves.push({ x: scene.player.x + 40, y: scene.player.y - 8, vx: dir * 560, t: 0, hit: false });
    },
    onUpdate({ dt }) {
      const d = scene.dummy;
      for (const w of this._waves) {
        w.x += w.vx * dt; w.t += dt;
        if (!w.hit && d.alive && Math.abs(w.x - d.x) < d.w / 2 + 6) {
          w.hit = true;
          scene.applyHit(0.4, { melee: false });
        }
      }
      this._waves = this._waves.filter(w => w.x < scene.W + 60 && w.t < 1.5);
    },
    onDraw({ ctx }) {
      for (const w of this._waves) {
        ctx.save();
        ctx.translate(w.x, w.y);
        const a = w.hit ? 0.25 : 0.9;
        // 新月:两段圆弧裁出的月牙,青白渐变 + 残尾
        for (let i = 0; i < 3; i++) {
          const off = -i * 14, fade = a * (1 - i * 0.35);
          ctx.strokeStyle = `rgba(150,220,255,${fade})`;
          ctx.lineWidth = 10 - i * 3;
          ctx.beginPath();
          ctx.arc(off - 18, 0, 30, -0.95, 0.95);
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-18, 0, 30, -0.95, 0.95);
        ctx.stroke();
        ctx.restore();
      }
    },
  });

  // ⑬ 打击帧(インパクトフレーム)— 重击瞬间整屏白黒反转 2-3 帧,眼睛的"接触确认"
  juice.register({
    id: 'impactframe', name: { en: '⑬ Impact frame', zh: '⑬ 打击帧(反转)' }, enabled: false,
    _frames: 0,
    onHit({ crit, kill }) { if (crit || kill) this._frames = 3; },
    onDraw({ ctx }) {
      if (this._frames > 0) {
        this._frames--;
        ctx.save();
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, scene.W, scene.H);
        ctx.restore();
      }
    },
  });

  // ⑭ 居合两断 — 击杀终结演出:时停 → 切线划过 → 尸体延迟分离(チャンバラ)
  juice.register({
    id: 'iaigiri', name: { en: '⑭ Iai cut', zh: '⑭ 居合两断' }, enabled: false,
    _slash: null,
    onKill({ target }) {
      target.split = true;
      time.freeze(0.22);                                  // 拔刀后的静止——世界屏息
      this._slash = { x: target.x, y: target.y, t: 0 };
    },
    onUpdate({ dt }) {
      // 用真实帧推进(顿帧期间 dt=0,改用固定步)
      if (this._slash) { this._slash.t += Math.max(dt, 0.016); if (this._slash.t > 0.5) this._slash = null; }
    },
    onDraw({ ctx }) {
      const s = this._slash;
      if (!s) return;
      const a = 1 - s.t / 0.5;
      // 贯穿全屏的斜切线
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = s.t < 0.1 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x - 320, s.y + 110);
      ctx.lineTo(s.x + 320, s.y - 110);
      ctx.stroke();
      ctx.restore();
    },
  });

  // ⑮ 风格评价(DMC)— 实时给你的进攻打分:D→SSS,持续进攻涨,停手就掉
  const RANKS = [
    { ch: 'D', color: '#8888a0' }, { ch: 'C', color: '#9fb4d0' },
    { ch: 'B', color: '#5dc8ff' }, { ch: 'A', color: '#5dff8f' },
    { ch: 'S', color: '#ffd34d' }, { ch: 'SS', color: '#ff9d3c' },
    { ch: 'SSS', color: '#ff5d5d' },
  ];
  juice.register({
    id: 'style', name: { en: '⑮ Style rank (DMC)', zh: '⑮ 风格评价(DMC)' }, enabled: false,
    _gauge: 0, _combo: 0, _comboT: 0, _rank: -1, _pulse: 0,
    onHit({ crit, kill, melee }) {
      // 多样性给分更高:暴击/剑气二段/击杀 > 重复普攻
      this._gauge += kill ? 90 : crit ? 40 : melee ? 22 : 30;
      this._gauge = Math.min(this._gauge, 700);
      this._combo++; this._comboT = 1.6;
    },
    onUpdate({ dt }) {
      // 衰减随段位加速 — 段位越高越难保持(DMC 规则)
      const r = Math.floor(this._gauge / 100);
      this._gauge = Math.max(0, this._gauge - (35 + r * 18) * dt);
      this._comboT -= dt;
      if (this._comboT <= 0) this._combo = 0;
      const nr = this._gauge < 25 ? -1 : Math.min(6, Math.floor(this._gauge / 100));
      if (nr > this._rank) this._pulse = 1;               // 升段脉冲
      this._rank = nr;
      this._pulse = Math.max(0, this._pulse - dt * 3);
    },
    onDraw({ ctx }) {
      if (this._rank < 0) return;
      const R = RANKS[this._rank];
      const scale = 1 + this._pulse * 0.6;
      ctx.save();
      ctx.translate(scene.W - 78, 72);
      ctx.rotate(-0.08);
      ctx.scale(scale, scale);
      ctx.font = 'italic bold 44px monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 5;
      ctx.strokeText(R.ch, 0, 0);
      ctx.fillStyle = R.color;
      ctx.fillText(R.ch, 0, 0);
      // 段位槽
      ctx.fillStyle = 'rgba(13,12,22,0.7)';
      ctx.fillRect(-34, 10, 68, 5);
      ctx.fillStyle = R.color;
      ctx.fillRect(-34, 10, 68 * ((this._gauge % 100) / 100), 5);
      if (this._combo > 1) {
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#e8e8f0';
        ctx.fillText(`${this._combo} HITS`, 0, 32);
      }
      ctx.restore();
    },
  });

  // ⑯ 镜头语言(电影)— 抽帧 / 急推 / 速度坡道:剪辑台上的打击感
  juice.register({
    id: 'cinema', name: { en: '⑯ Camera (film)', zh: '⑯ 镜头语言(电影)' }, enabled: false,
    _zoomT: 0,
    onHit({ target, crit, kill, dir }) {
      time.skip = 0.03;                                   // 每次命中吞 30ms — "去一帧"更狠
      time.zoom.cx = target.x; time.zoom.cy = target.y - 20;
      // 镜头后坐:沿攻击方向顶一下镜头(方向性,区别于随机屏震)
      time.kick.x = dir * (kill ? 7 : crit ? 5 : 2.5);
      time.kick.y = -(kill ? 3 : 1.5);
      if (kill) {
        time.slowmo(0.25, 0.30);                          // 杀:慢 0.25x 300ms 后瞬回 — 速度坡道
        this._zoomT = 0.45; this._zoomMax = 1.16;
        this._outT = 0;                                   // 推完再拉远揭示
        time.tilt = dir * 0.022;                          // 荷兰角:重击瞬间画面歪一下
      } else if (crit) {
        this._zoomT = 0.18; this._zoomMax = 1.07;         // 暴击:急推一下
        time.tilt = dir * 0.012;
      }
    },
    onUpdate() {
      // 用真实帧节拍衰减(慢动作期间镜头照样动 — 电影规则)
      if (this._zoomT > 0) {
        this._zoomT = Math.max(0, this._zoomT - 0.016);
        const p = this._zoomT / (this._zoomMax === 1.16 ? 0.45 : 0.18);
        time.zoom.v = 1 + (this._zoomMax - 1) * Math.sin(Math.min(1, p) * Math.PI * 0.5);
        if (this._zoomT === 0 && this._zoomMax === 1.16) this._outT = 0.3;  // 击杀推完 → 拉远
      } else if (this._outT > 0) {
        // crash-zoom-out:猛拉回广角看全局(Sleeping Dogs 式揭示)
        this._outT = Math.max(0, this._outT - 0.016);
        const p = this._outT / 0.3;
        time.zoom.v = 1 - 0.05 * Math.sin(p * Math.PI);
      } else if (time.zoom.v !== 1) {
        time.zoom.v = 1;
      }
    },
    onDisabled() { time.zoom.v = 1; time.scale = 1; time.tilt = 0; time.kick.x = time.kick.y = 0; },
  });

  // ⑰ 大招 — 综合演出:蓄力槽 → 时停拔刀 → 三连斩线 → 终镇。所有层一次性合奏
  juice.register({
    id: 'ultimate', name: { en: '⑰ Ultimate', zh: '⑰ 大招(综合)' }, enabled: false,
    _charge: 0, _state: null, _t: 0, _bars: 0, _slashes: [], _aura: 0,
    onHit({ crit, kill }) {
      if (this._state) return;
      this._charge = Math.min(100, this._charge + (kill ? 20 : crit ? 14 : 8));
    },
    trigger() {
      if (this._charge < 100 || this._state) return;
      this._state = 'dark'; this._t = 0;
      this._flashes = []; this._bolts = [];
      sfx('ultCharge');
    },
    _next(state) { this._state = state; this._t = 0; },
    onUpdate() {
      // 整段演出走真实节拍;世界全程暂停,直到 death 才放行
      if (!this._state) {
        this._bars = Math.max(0, this._bars - 0.016 * 3);
        return;
      }
      this._t += 0.016;
      this._bars = Math.min(1, this._bars + 0.016 * 4);   // 黑边压入
      if (this._state !== 'death') time.freeze(0.1);      // 持续按住暂停键
      const d = scene.dummy;

      if (this._state === 'dark' && this._t > 0.45) {     // ① 暗屏
        this._next('name'); sfx('shout');                  // ② 吼出招式名
      } else if (this._state === 'name' && this._t > 0.95) {
        this._next('charge');
      } else if (this._state === 'charge') {              // ③ 蓄力 + 电闪雷鸣
        this._aura = Math.min(1, this._t / 0.8);
        if (Math.random() < 0.14) {                        // 随机劈雷
          this._bolts.push({ x: 60 + Math.random() * 520, t: 0 });
          if (Math.random() < 0.5) sfx('thunder');
        }
        if (this._t > 0.9) { this._next('cutin'); sfx('shout'); }
      } else if (this._state === 'cutin' && this._t > 0.6) {   // ④ 敌人放大居中
        this._next('slash');                               // ⑤ 无限斩
      } else if (this._state === 'slash') {
        if (Math.random() < 0.55) {
          this._slashes.push({ ang: Math.random() * Math.PI, off: (Math.random() - 0.5) * 120, life: 0 });
          if (this._slashes.length % 3 === 0) sfx('slash');
        }
        for (const s of this._slashes) s.life += 0.016;
        if (this._t > 1.1) { this._next('pose'); this._slashes = []; }
      } else if (this._state === 'pose' && this._t > 0.85) {   // ⑥ 收刀造型
        this._next('death');                               // ⑦ 然后,敌人才死
        sfx('ultBoom');
        time.shake.mag = 16; time.shake.decay = 0.45;
        if (d.alive) scene.applyHit(10, { melee: false }); // 必杀,触发居合两断全套
      } else if (this._state === 'death' && this._t > 0.9) {
        this._state = null; this._charge = 0; this._slashes = []; this._bolts = [];
      }
      this._bolts = (this._bolts || []).filter(b => (b.t += 0.016) < 0.18);
    },
    onDraw({ ctx }) {
      const W = scene.W, H = scene.H;
      // 蓄力槽 HUD(左下)
      if (!this._state) {
        const full = this._charge >= 100;
        ctx.save();
        ctx.translate(16, H - 26);
        ctx.fillStyle = 'rgba(13,12,22,0.8)';
        ctx.fillRect(0, 0, 130, 12);
        ctx.fillStyle = full ? '#ffd34d' : '#7a6a30';
        ctx.fillRect(2, 2, 126 * (this._charge / 100), 8);
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = full ? '#ffd34d' : '#8888a0';
        ctx.fillText(full ? t('ultReady') : `${t('ultCharge')} ${Math.round(this._charge)}%`, 0, -6);
        if (full) {
          const tw = 0.5 + 0.5 * Math.sin(performance.now() / 180);
          ctx.strokeStyle = `rgba(255,211,77,${0.4 + 0.5 * tw})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(-1, -1, 132, 14);
        }
        ctx.restore();
      }
      const st = this._state;
      const inCut = st && st !== 'death';

      // ① 暗幕(整段演出压暗,name/cutin 最深)
      if (inCut) {
        const deep = st === 'dark' ? Math.min(0.75, this._t * 2) : 0.75;
        ctx.fillStyle = `rgba(2,2,8,${deep})`;
        ctx.fillRect(0, 0, W, H);
      }

      // 电影黑边(letterbox)
      if (this._bars > 0) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, 46 * this._bars);
        ctx.fillRect(0, H - 46 * this._bars, W, 46 * this._bars);
      }

      // ② 招式名:毛笔体大字砸入
      if (st === 'name' || st === 'charge') {
        const t = st === 'name' ? this._t : 1;
        const scaleIn = st === 'name' ? Math.min(1, t * 6) : 1;
        const punch = 1 + Math.max(0, 0.5 - t * 3);       // 砸入过冲
        ctx.save();
        ctx.translate(W / 2, H / 2 - 40);
        ctx.rotate(-0.06);
        ctx.scale(scaleIn * punch, scaleIn * punch);
        ctx.font = 'bold 64px "Yuji Syuku", "Hiragino Mincho ProN", serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 10;
        ctx.strokeText('無限斬・滅', 0, 0);
        ctx.fillStyle = '#fff';
        ctx.fillText('無限斬・滅', 0, 0);
        ctx.fillStyle = '#ff5d5d';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('— 奥义 —', 0, -56);
        ctx.restore();
      }

      // ③ 蓄力:光环收束 + 主角金光 + 雷电
      if (st === 'charge') {
        const p = scene.player, a = this._aura;
        ctx.save();
        ctx.translate(p.x, p.y - 10);
        for (let i = 0; i < 4; i++) {
          const r = (1 - ((a * 1.6 + i * 0.25) % 1)) * 90 + 8;
          ctx.strokeStyle = `rgba(255,211,77,${0.6 - r / 180})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = `rgba(255,211,77,${a * 0.22})`;
        ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // 雷电:锯齿折线劈下 + 整屏闪
        for (const b of this._bolts) {
          const a2 = 1 - b.t / 0.18;
          ctx.save();
          ctx.strokeStyle = `rgba(200,230,255,${a2})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          let bx = b.x, by = 0;
          ctx.moveTo(bx, by);
          while (by < H - 80) { bx += (Math.random() - 0.5) * 46; by += 28 + Math.random() * 22; ctx.lineTo(bx, by); }
          ctx.stroke();
          ctx.restore();
          if (b.t < 0.04) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, W, H); }
        }
      }

      // ④ 敌人 cut-in:放大到屏幕中央 + 集中线
      if ((st === 'cutin' || st === 'slash') && sprites.ready) {
        const pop = st === 'cutin' ? Math.min(1, this._t * 3.5) : 1;
        // 集中線(speed lines):从四周射向中心
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * pop})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 36; i++) {
          const ang = (i / 36) * Math.PI * 2 + 0.05;
          const r0 = 200 + (i % 5) * 18, r1 = 420;
          ctx.beginPath();
          ctx.moveTo(W / 2 + Math.cos(ang) * r0, H / 2 + Math.sin(ang) * r0);
          ctx.lineTo(W / 2 + Math.cos(ang) * r1, H / 2 + Math.sin(ang) * r1);
          ctx.stroke();
        }
        // 放大的假人(惊恐微颤)
        const jit = st === 'slash' ? 3 : 1;
        ctx.translate(W / 2 + (Math.random() - 0.5) * jit, H / 2 + 10 + (Math.random() - 0.5) * jit);
        const s = 2.6 * (0.4 + 0.6 * pop);
        ctx.scale(s, s);
        ctx.drawImage(sprites.dummy, -36, -50, 72, 100);
        ctx.restore();
      }

      // ⑤ 无限斩:斩线风暴扫过放大的敌人
      if (st === 'slash') {
        for (const s of this._slashes) {
          if (s.life > 0.3) continue;
          const a = 1 - s.life / 0.3;
          ctx.save();
          ctx.translate(W / 2 + s.off * Math.cos(s.ang), H / 2 + s.off * Math.sin(s.ang));
          ctx.rotate(s.ang);
          ctx.strokeStyle = `rgba(255,255,255,${a})`;
          ctx.lineWidth = s.life < 0.05 ? 4 : 1.5;
          ctx.beginPath(); ctx.moveTo(-400, 0); ctx.lineTo(400, 0); ctx.stroke();
          ctx.strokeStyle = `rgba(150,220,255,${a * 0.45})`;
          ctx.lineWidth = 8;
          ctx.beginPath(); ctx.moveTo(-400, 0); ctx.lineTo(400, 0); ctx.stroke();
          ctx.restore();
        }
      }

      // ⑥ 收刀造型:主角剪影居中,风线横扫,一个字:稳
      if (st === 'pose' && sprites.ready) {
        const a = Math.min(1, this._t * 5);
        ctx.save();
        // 横向风线
        ctx.strokeStyle = `rgba(255,255,255,${0.25 * a})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
          const wy = 60 + i * 36 + (i % 3) * 9;
          ctx.beginPath(); ctx.moveTo(0, wy); ctx.lineTo(W, wy); ctx.stroke();
        }
        // 主角大立绘(背光金边)
        ctx.translate(W / 2, H / 2 + 30);
        ctx.scale(2.4, 2.4);
        ctx.shadowColor = 'rgba(255,211,77,0.9)';
        ctx.shadowBlur = 18 * a;
        ctx.drawImage(sprites.knight, -30, -64, 60, 90);
        ctx.shadowBlur = 0;
        ctx.restore();
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(232,232,240,${a})`;
        ctx.fillText(t('poseLine'), W / 2, H - 64);
      }

      // ⑦ 终镇白闪
      if (st === 'death' && this._t < 0.25) {
        ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - this._t / 0.25)})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
  });

  // ⑱ 全开+过载 — 倒U曲线演示档(本体只是说明,滑杆在 main 控 time.overload)
  juice.register({
    id: 'overload', name: { en: '⑱ Overload demo', zh: '⑱ 过载演示' }, enabled: false,
    onUpdate() {},
  });

  // 关闭还原:注册表没有 onDisabled 生命周期,用轮询补
  setInterval(() => {
    const tame = juice.modules.find(m => m.id === 'tametsume');
    if (tame && !tame.enabled && tame._applied) tame.onDisabled();
    const com = juice.modules.find(m => m.id === 'commitment');
    if (com && !com.enabled && scene.flags.commitment) com.onDisabled();
    const cin = juice.modules.find(m => m.id === 'cinema');
    if (cin && !cin.enabled && (time.zoom.v !== 1 || time.scale !== 1)) cin.onDisabled();
  }, 100);
}
