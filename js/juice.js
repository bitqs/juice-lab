// 10 个打击感技术模块。统一接口:{id, name, enabled, onHit?, onKill?, onUpdate?, onDraw?}
// 参数全部溯源(见 steps.js 出处)。注册顺序 = 步骤顺序。

import { sfx } from './audio.js';

export function buildModules(juice, scene, time) {

  // ① 闪白 tintFill — VS:命中 120ms 纯白,死亡 60ms(别盖住死亡动画)
  juice.register({
    id: 'flash', name: '① 闪白 tintFill', enabled: false,
    onHit({ target, kill }) { target.flashT = kill ? 0.06 : 0.12; },
  });

  // ② 顿帧 hitstop — VS:普攻 0 / 暴击 55ms / 处决 80ms(樱井:越重越久)
  juice.register({
    id: 'hitstop', name: '② 顿帧 hitstop', enabled: false,
    onHit({ crit, kill }) {
      if (kill) time.freeze(0.080);
      else if (crit) time.freeze(0.055);
      // 普攻 0:高频命中全停会把游戏变 PPT
    },
  });

  // ③ 击退 + 死亡弹飞 — VS:速度取反 × deathKB,尸体沿攻击向量飞
  juice.register({
    id: 'knockback', name: '③ 击退+死亡弹飞', enabled: false,
    onHit({ target, dir, kill }) {
      target.vx = dir * (kill ? 260 : 90);
      if (kill) { target.vy = -260; target.dy = 1; }   // 腾空
    },
  });

  // ④ 伤害数字 — VS:逐位精灵 + 弹跳缓动 + ±0.15 随机偏移防叠
  const numbers = [];
  juice.register({
    id: 'dmgnum', name: '④ 伤害数字', enabled: false,
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
    id: 'hitvfx', name: '⑤ 命中贴片+冲击波', enabled: false,
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
    id: 'particles', name: '⑥ 死亡粒子', enabled: false,
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
    id: 'shake', name: '⑦ 屏震(稀缺!)', enabled: false,
    onHit({ crit, kill }) {
      if (kill) { time.shake.mag = 11 * time.overload; time.shake.decay = 0.35; }
      else if (crit) { time.shake.mag = 6 * time.overload; time.shake.decay = 0.22; }
      // 普攻 0:每秒几十次命中全震 = 晕船
    },
  });

  // ⑧ 音效分层 — Vlambeer:重击给低频;命中/暴击/击杀三档
  juice.register({
    id: 'sfx', name: '⑧ 音效分层', enabled: false,
    onHit({ crit, kill }) { sfx(kill ? 'kill' : crit ? 'crit' : 'hit'); },
  });

  // ⑨ タメツメ — 打击帧笔记:慢蓄(タメ)→ 瞬斩(ツメ),不对称配速
  juice.register({
    id: 'tametsume', name: '⑨ タメツメ前摇', enabled: false,
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
    id: 'commitment', name: '⑩ 前后摇+硬直', enabled: false,
    onUpdate() { scene.flags.commitment = true; },
    onHit({ target }) { target.staggerT = 1; },          // 受击方硬直后仰
    onDisabled() { scene.flags.commitment = false; },
  });

  // ⑪ 挥砍残影(スミアフレーム)— 拉伸模糊的中间帧,稀疏关键帧间传达运动
  juice.register({
    id: 'smear', name: '⑪ 挥砍残影', enabled: false,
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
    id: 'wave', name: '⑫ 剑气', enabled: false,
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
    id: 'impactframe', name: '⑬ 打击帧(反转)', enabled: false,
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
    id: 'iaigiri', name: '⑭ 居合两断', enabled: false,
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

  // ⑮ 全开+过载 — 倒U曲线演示档(本体只是说明,滑杆在 main 控 time.overload)
  juice.register({
    id: 'overload', name: '⑮ 过载演示', enabled: false,
    onUpdate() {},
  });

  // 关闭还原:注册表没有 onDisabled 生命周期,用轮询补
  setInterval(() => {
    const tame = juice.modules.find(m => m.id === 'tametsume');
    if (tame && !tame.enabled && tame._applied) tame.onDisabled();
    const com = juice.modules.find(m => m.id === 'commitment');
    if (com && !com.enabled && scene.flags.commitment) com.onDisabled();
  }, 100);
}
