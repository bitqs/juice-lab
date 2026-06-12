// 场景:玩家(剑士)+ 训练假人。所有"手感"都不在这里 — 这里只有规则。
// juice 模块通过钩子介入:registry.fire('onHit'/'onKill', payload)

import { sprites } from './assets.js';

export function createScene(juice) {
  const W = 640, H = 440, GROUND = 340;

  const flags = { commitment: false };   // juice⑩ 前后摇 开关位
  const input = { left: false, right: false };   // 移动输入(A/D 或长按)
  const REACH = 118;                     // 攻击距离:超出挥空

  // ---- 视角系统:side(教学侧视) / ots(过肩伪3D沉浸) ----
  let view = 'side';
  const VP = { x: 356, y: 168 };         // 灭点
  const PK = 300;                        // 透视系数:scale = PK/(PK+depth)
  // 把"与玩家的距离"投影成屏幕位置与缩放(沿中央车道)
  function proj(gap) {
    const s = PK / (PK + Math.max(0, gap));
    return {
      x: VP.x + (322 - VP.x) * s,
      y: VP.y + (418 - VP.y) * s,
      s,
    };
  }
  const playerScreen = { x: 196, y: 408 };       // OTS 主角固定屏幕位
  const projDummy = { x: 0, y: 0, s: 1 };        // 每帧更新,供 juice 模块取景

  const player = {
    x: 330, y: GROUND, w: 34, h: 56,
    facing: 1,
    attackT: -1,          // -1 = idle;0..1 = 攻击动画进度
    attackDur: 0.12,      // 匀速;タメツメ模块会改写 pace()
    pace: t => t,         // 攻击动画时间重映射(juice9 改写成慢蓄快斩)
    didHit: false,
    windupT: -1,          // 前摇进度(flags.commitment 时启用)
    recoverT: 0,          // 后摇剩余秒(期间不可再攻)
    swordInfo: null,      // 每帧更新 {px, py, angle, active} 供残影模块读
    combo: 0,             // 4级连击:当前段(0-3),窗口内连按推进
    comboWindow: 0,       // 连击窗口剩余秒
    swingStage: 0,        // 本次挥砍所属段(动画用)
  };

  // 4 级连击表:伤害倍率 / 动画时长倍率 / 前冲倍率;第4段必暴击(终结段)
  const COMBO = [
    { mult: 1.0, durM: 1.0, lungeM: 1.0 },
    { mult: 1.1, durM: 0.92, lungeM: 1.1 },
    { mult: 1.3, durM: 0.88, lungeM: 1.6 },   // 突刺
    { mult: 1.8, durM: 1.35, lungeM: 1.2 },   // 大上段终结
  ];

  const dummy = {
    x: 430, y: GROUND, w: 44, h: 64,
    hp: 100, maxHp: 100,
    alive: true, respawnT: 0,
    vx: 0, vy: 0, dy: 0,   // dy: 尸体腾空高度
    flashT: 0,             // 闪白剩余秒数(juice1 写入,这里只衰减与绘制)
    wobble: 0,             // 受击晃动
    staggerT: 0,           // 硬直(juice⑩ 写入):受击僵住+后仰
    split: false,          // 居合两断(juice⑭ 写入):尸体改为两段分离演出
    selfFreeze: 0,         // 对象级顿帧(日式清版流):只停自己,世界照走
  };

  function attack() {
    if (player.attackT >= 0 || player.windupT >= 0) return;   // 攻击中
    if (player.recoverT > 0) return;                          // 后摇硬直,不可取消
    player.swingStage = player.combo;                         // 锁定本次挥砍的段位
    if (flags.commitment) { player.windupT = 0; }             // 前摇起手
    else { player.attackT = 0; player.didHit = false; }
  }

  // 共用命中管线:近战与剑气(melee=false)都走这里
  function applyHit(mult = 1, { melee = true, forceCrit = false } = {}) {
    if (!dummy.alive) return false;
    // 近战有距离:够不着就挥空(spacing 是格斗的一半)
    if (melee && Math.abs(player.x - dummy.x) > REACH) return false;
    const base = 8 + Math.floor(Math.random() * 7);      // 8-14
    const crit = forceCrit || Math.random() < 0.12;
    const final = Math.max(1, Math.round(base * mult * (crit ? 2.5 : 1)));
    dummy.hp -= final;
    const kill = dummy.hp <= 0;
    const dir = player.facing;
    dummy.wobble = 1;
    if (kill) {
      dummy.alive = false;
      dummy.hp = 0;
      dummy.respawnT = 1.0;
      juice.fire('onKill', { target: dummy, dir });
    }
    juice.fire('onHit', { target: dummy, dmg: final, crit, kill, dir, melee });
    return true;
  }

  function tryHit() {
    const st = player.swingStage;
    const landed = applyHit(COMBO[st].mult, { melee: true, forceCrit: st === 3 });  // 第4段=必暴击终结
    if (landed) {
      // 命中推进连击;窗口 0.9s 内接下一段
      player.combo = (st + 1) % 4;
      player.comboWindow = 0.9;
    } else {
      player.combo = 0; player.comboWindow = 0;          // 挥空断连击
    }
  }

  function update(dt) {
    worldT += dt;

    // 前摇(juice⑩):0.10s 起手蓄势,然后进入挥砍
    if (player.windupT >= 0) {
      player.windupT += dt;
      if (player.windupT >= 0.10) {
        player.windupT = -1;
        player.attackT = 0;
        player.didHit = false;
      }
    }
    player.recoverT = Math.max(0, player.recoverT - dt);

    // 移动(攻击/前摇中不能移 — 承诺感)
    if (player.attackT < 0 && player.windupT < 0) {
      const mdir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      player.x += mdir * 240 * dt;
      player.x = Math.max(50, Math.min(560, player.x));
    }
    // 碰撞分离:不能穿过活着的假人(相对位置恒定,剑永远朝向目标)
    if (dummy.alive) player.x = Math.min(player.x, dummy.x - 64);

    // 连击窗口倒数,断了归零
    player.comboWindow = Math.max(0, player.comboWindow - dt);
    if (player.comboWindow === 0 && player.attackT < 0 && player.windupT < 0) player.combo = 0;

    // 攻击动画推进;命中点在进度 0.55
    if (player.attackT >= 0) {
      player.attackT += dt / (player.attackDur * COMBO[player.swingStage].durM);
      if (!player.didHit && player.pace(Math.min(player.attackT, 1)) >= 0.55) {
        player.didHit = true;
        tryHit();
      }
      if (player.attackT >= 1) {
        player.attackT = -1;
        if (flags.commitment) player.recoverT = 0.16;     // 后摇:挥完僵 160ms
      }
    }

    // 对象级顿帧:被冻住的只有假人,粒子/数字/世界照常走(ベルトスクロール铁律)
    dummy.selfFreeze = Math.max(0, dummy.selfFreeze - 0.016);
    if (dummy.selfFreeze > 0) return;

    // 假人物理(击退/弹飞由 juice 写入 vx/vy)
    dummy.x += dummy.vx * dt;
    dummy.vx *= Math.pow(0.002, dt);                     // 强阻尼
    if (!dummy.alive) {
      dummy.vy += 900 * dt;                              // 尸体重力
      dummy.dy = Math.max(0, dummy.dy - dummy.vy * dt);
      dummy.respawnT -= dt;
      if (dummy.respawnT <= 0) {
        dummy.alive = true; dummy.hp = dummy.maxHp;
        dummy.x = 430; dummy.vx = 0; dummy.vy = 0; dummy.dy = 0;
        dummy.split = false; dummy.staggerT = 0;
        dummy.spawnPop = 0.22;                            // 复活弹出(反馈空窗补一拍)
      }
    }
    dummy.x = Math.max(300, Math.min(W - 60, dummy.x));
    dummy.flashT = Math.max(0, dummy.flashT - dt);
    dummy.wobble = Math.max(0, dummy.wobble - dt * 4);
    dummy.staggerT = Math.max(0, dummy.staggerT - dt * 2.2);
    dummy.squashT = Math.max(0, (dummy.squashT || 0) - dt * 6);
  }

  let worldT = 0;                                        // 场景时钟(呼吸/火把用)

  function draw(ctx) {
    if (view === 'ots') {
      drawBackgroundOTS(ctx);
      drawDummyOTS(ctx);
      drawPlayerOTS(ctx);
      drawVignette(ctx);
      return;
    }
    drawBackground(ctx);
    drawPlayer(ctx);
    drawDummy(ctx);
    drawVignette(ctx);
  }

  // ---- OTS 渲染器 ----
  function drawBackgroundOTS(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#11101f');
    sky.addColorStop(0.55, '#171527');
    sky.addColorStop(1, '#0d0c16');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // 星
    for (let i = 0; i < 12; i++) {
      const sx = (i * 151.3) % W, sy = (i * 71.7) % (VP.y - 24);
      const tw = 0.5 + 0.5 * Math.sin(worldT * 2 + i * 1.7);
      ctx.fillStyle = `rgba(232,232,240,${0.06 + 0.16 * tw})`;
      ctx.fillRect(sx, sy, 2, 2);
    }
    // 地平线
    ctx.strokeStyle = '#262440';
    ctx.beginPath(); ctx.moveTo(0, VP.y + 14); ctx.lineTo(W, VP.y + 14); ctx.stroke();
    // 透视地面:横线按深度密度递增,纵线向灭点收束
    ctx.strokeStyle = 'rgba(38,36,64,0.9)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const p = proj(i * i * 14);
      ctx.beginPath(); ctx.moveTo(0, p.y + 26 * p.s); ctx.lineTo(W, p.y + 26 * p.s); ctx.stroke();
    }
    for (let i = -5; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(VP.x + i * 18, VP.y + 14);
      ctx.lineTo(VP.x + i * 160, H + 40);
      ctx.stroke();
    }
  }

  function drawDummyOTS(ctx) {
    const d = dummy;
    const gap = Math.max(8, d.x - player.x);
    const p = proj(gap);
    projDummy.x = p.x; projDummy.y = p.y - 60 * p.s; projDummy.s = p.s;

    if (!d.alive && d.split) {                            // 居合两断(投影空间)
      ctx.save();
      ctx.translate(p.x, p.y - 60 * p.s);
      ctx.scale(2.0 * p.s, 2.0 * p.s);
      drawSplitLocal(ctx);
      ctx.restore();
      return;
    }

    ctx.save();
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 4, 56 * p.s, 13 * p.s, 0, 0, Math.PI * 2);
    ctx.fill();

    const wob = Math.sin(d.wobble * 20) * d.wobble * 4;
    const jx = d.selfFreeze > 0 ? (Math.random() * 2 - 1) * 2 : 0;
    ctx.translate(p.x + (wob + jx) * p.s, p.y - (60 - d.dy * 0.4) * p.s);
    ctx.scale(2.0 * p.s, 2.0 * p.s);
    if (d.alive) ctx.rotate(d.staggerT * 0.14);
    if (d.spawnPop > 0) {
      const pp = 1 - d.spawnPop / 0.22;
      const s2 = 0.4 + pp * 0.75 - Math.sin(pp * Math.PI) * 0.12;
      ctx.scale(s2, s2);
    }
    if (d.squashT > 0 && d.alive) {
      const q = Math.sin(d.squashT * Math.PI) * 0.18;
      ctx.scale(1 + q, 1 - q);
    }
    if (!d.alive) ctx.rotate(0.5);
    if (sprites.ready) {
      const img = d.flashT > 0 ? sprites.dummyWhite : (d.alive ? sprites.dummy : sprites.dummyDark);
      ctx.drawImage(img, -36, -50, 72, 100);
    }
    // 血条
    if (d.alive) {
      ctx.fillStyle = 'rgba(13,12,22,0.85)';
      ctx.fillRect(-30, -66, 60, 7);
      const pct = d.hp / d.maxHp;
      ctx.fillStyle = pct > 0.35 ? '#5dff8f' : '#ff5d5d';
      ctx.fillRect(-29, -65, 58 * pct, 5);
    }
    ctx.restore();
  }

  function drawPlayerOTS(ctx) {
    const t = player.attackT >= 0 ? player.pace(Math.min(player.attackT, 1)) : -1;
    const winding = player.windupT >= 0;
    const bob = (t < 0 && !winding) ? Math.sin(worldT * 3) * 3 : 0;
    const lungeZ = t < 0 ? 0 : Math.sin(Math.min(t, 1) * Math.PI) * 0.08;  // 前冲=微缩进纵深
    ctx.save();
    ctx.translate(playerScreen.x, playerScreen.y + bob);
    const sc = 2.3 * (1 - lungeZ) * (winding ? 1.03 : 1);
    ctx.scale(sc, sc);
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(0, 46, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (sprites.ready) ctx.drawImage(sprites.knightBack, -32, -48, 64, 96);
    ctx.restore();

    // 连击段位 pips(主角头顶)
    ctx.save();
    ctx.translate(playerScreen.x, playerScreen.y + bob);
    drawComboPips(ctx, 0, -120);
    ctx.restore();

    // 挥砍表现:斩击弧出现在假人深度处(力落在哪,画在哪);四段四个方向
    if (t > 0.3 && t < 0.98) {
      const p = projDummy;
      const sw = (t - 0.3) / 0.68;
      const st = player.swingStage;
      const baseAng = st === 1 ? 2.3 : st === 2 ? 0 : st === 3 ? -1.2 : -0.7;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(baseAng + sw * (st === 2 ? 0.3 : 1.5));
      ctx.strokeStyle = `rgba(255,255,255,${0.9 - sw * 0.6})`;
      ctx.lineWidth = 5 * p.s;
      ctx.beginPath();
      ctx.arc(0, 0, 86 * p.s, -1.0, 0.4);
      ctx.stroke();
      ctx.strokeStyle = `rgba(150,220,255,${0.4 * (1 - sw)})`;
      ctx.lineWidth = 11 * p.s;
      ctx.beginPath();
      ctx.arc(0, 0, 86 * p.s, -1.0, 0.4);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBackground(ctx) {
    // 夜空渐变
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#11101f');
    sky.addColorStop(0.7, '#171527');
    sky.addColorStop(1, '#0d0c16');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 星星(固定伪随机,微闪,克制)
    for (let i = 0; i < 16; i++) {
      const sx = (i * 137.5) % W, sy = (i * 89.7) % 180;
      const tw = 0.5 + 0.5 * Math.sin(worldT * 2 + i * 1.7);
      ctx.fillStyle = `rgba(232,232,240,${0.08 + 0.18 * tw})`;
      ctx.fillRect(sx, sy, 2, 2);
    }

    // 地台:石板地面
    ctx.fillStyle = '#1e1c30';
    ctx.fillRect(0, GROUND + 28, W, H - GROUND - 28);
    ctx.fillStyle = '#262440';
    ctx.fillRect(0, GROUND + 28, W, 4);
  }

  function drawVignette(ctx) {
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawPlayer(ctx) {
    const { w, h } = player;
    const t = player.attackT >= 0 ? player.pace(Math.min(player.attackT, 1)) : -1;
    const winding = player.windupT >= 0;                  // 前摇中
    const recovering = player.recoverT > 0;               // 后摇中
    // 攻击前冲:挥砍时身体向前突进;前摇时反向蓄(重心后坐);连击段越深冲越猛
    const lunge = winding ? -8 : (t < 0 ? 0 : Math.sin(Math.min(t, 1) * Math.PI) * 22 * COMBO[player.swingStage].lungeM);
    const bob = (t < 0 && !winding) ? Math.sin(worldT * 3) * 2 : 0;   // idle 呼吸
    ctx.save();
    ctx.translate(player.x + lunge, player.y + bob);

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 6 - bob, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身体:SVG 精灵(就绪前回退简易矩形)
    if (sprites.ready) {
      // 前/后摇身体语言:前摇后倾,后摇前倾
      const lean = winding ? -0.08 : (recovering && t < 0) ? 0.07 : 0;
      ctx.save();
      ctx.rotate(lean);
      ctx.drawImage(sprites.knight, -30, -h / 2 - 18, 60, 90);
      ctx.restore();
    } else {
      ctx.fillStyle = '#3f6fb5';
      ctx.fillRect(-w / 2, -h / 2 + 12, w, h - 30);
      ctx.fillStyle = '#e8c9a0';
      ctx.fillRect(-9, -h / 2 - 4, 18, 16);
    }

    // 武器特效:风格段位 A 以上,剑身镀金燃焰(系统联动 — 打得漂亮,武器跟着燃)
    const styleMod = juice.modules.find(m => m.id === 'style');
    const burning = styleMod && styleMod.enabled && styleMod._rank >= 3;

    // 剑:idle 扛肩;前摇举到最高;后摇收剑在前下方
    // 4 级连击四套挥法:下劈 / 上撩 / 突刺(横持) / 大上段
    const st = player.swingStage;
    const swingAngle =
      st === 1 ? (0.72 - t * 2.85)                 // 上撩:由下向上反扫
      : st === 2 ? (-1.05 + Math.sin(t * Math.PI) * 0.12)  // 突刺:横持微抖,靠 lunge 出力
      : st === 3 ? (-2.75 + t * 3.4)               // 大上段:举更高劈更深
      : (-2.1 + t * 2.75);                          // 基础下劈
    const angle = winding ? (-2.45 - (player.windupT / 0.10) * 0.5)
                : recovering && t < 0 ? 0.72
                : t < 0 ? -2.45
                : swingAngle;
    // 供残影/剑气模块读取的剑骨骼信息(世界坐标)
    player.swordInfo = {
      px: player.x + lunge + w / 2 - 2,
      py: player.y + bob - h / 2 + 16,
      angle,
      active: t > 0.3 && t < 0.95,
    };
    ctx.save();
    ctx.translate(w / 2 - 2, -h / 2 + 16);
    ctx.rotate(angle);
    // 挥砍轨迹残影(攻击中段)
    if (t > 0.3 && t < 0.95) {
      ctx.fillStyle = 'rgba(207,214,228,0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, 52, -1.2, 0.5);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    }
    if (burning) {                                        // 燃焰剑:金光 + 沿刃火舌
      ctx.shadowColor = 'rgba(255,180,60,0.9)';
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = burning ? '#ffe9b8' : '#dfe6f2';
    ctx.fillRect(-2.5, -52, 5, 52);                       // 剑身
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.5, -52, 2, 52);                       // 刃高光
    if (burning) {
      for (let i = 0; i < 4; i++) {                       // 火舌(随机舔动)
        const fy = -10 - i * 11 - Math.random() * 5;
        const fr = 2.5 + Math.random() * 2.5;
        ctx.fillStyle = i % 2 ? 'rgba(255,160,50,0.85)' : 'rgba(255,211,77,0.9)';
        ctx.beginPath();
        ctx.ellipse(3 + Math.random() * 2, fy, fr, fr * 1.8, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#caa84e';
    ctx.fillRect(-8, -2, 16, 4);                          // 护手
    ctx.fillStyle = '#8a6d3b';
    ctx.fillRect(-2.5, 2, 5, 10);                         // 柄
    ctx.restore();

    drawComboPips(ctx, 0, -h / 2 - 26);
    ctx.restore();
  }

  // 连击段位指示:Ⅰ-Ⅳ 四点,亮 = 已连到;第4点红(终结段)
  function drawComboPips(ctx, cx, cy) {
    if (player.combo === 0 && player.comboWindow === 0) return;
    for (let i = 0; i < 4; i++) {
      const lit = i < (player.combo === 0 ? 4 : player.combo);
      ctx.fillStyle = lit ? (i === 3 ? '#ff5d5d' : '#ffd34d') : 'rgba(136,136,160,0.35)';
      ctx.beginPath();
      ctx.arc(cx - 15 + i * 10, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDummy(ctx) {
    const d = dummy;

    // 居合两断演出(juice⑭):尸体改为两段分离,不走普通翻倒
    if (!d.alive && d.split) { drawSplitDummy(ctx); return; }

    ctx.save();
    const wob = Math.sin(d.wobble * 20) * d.wobble * 4;
    const stagger = d.alive ? d.staggerT * 0.16 : 0;      // 硬直后仰(juice⑩)
    // 顿帧中微振动(樱井流"分解工夫"):冻住但在颤,像力量灌进身体
    const jx = d.selfFreeze > 0 ? (Math.random() * 2 - 1) * 1.6 : 0;
    const jy = d.selfFreeze > 0 ? (Math.random() * 2 - 1) * 1.2 : 0;
    ctx.translate(d.x + wob + jx, d.y - d.dy + jy);
    ctx.rotate(stagger);
    if (d.spawnPop > 0) {                                 // 复活:从 0.4 弹到 1 微过冲
      d.spawnPop = Math.max(0, d.spawnPop - 0.016);
      const p = 1 - d.spawnPop / 0.22;
      const s = 0.4 + p * 0.75 - Math.sin(p * Math.PI) * 0.12;
      ctx.scale(s, s);
    }
    if (d.squashT > 0 && d.alive) {                       // 受击挤压:横扁竖缩,弹性恢复
      const q = Math.sin(d.squashT * Math.PI) * 0.18;
      ctx.scale(1 + q, 1 - q);
    }
    if (!d.alive) ctx.rotate(0.55);

    // 影子(贴地,不随尸体腾空)
    ctx.save();
    ctx.rotate(d.alive ? 0 : -0.55);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, d.h / 2 + 8 + d.dy, 26 - d.dy * 0.05, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const flashing = d.flashT > 0;

    // 两段式尸体:沿斜切线分离滑开(チャンバラ延迟两断)。side 视角包装器。
  function drawSplitDummy(ctx) {
    const d = dummy;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, d.h / 2 + 8, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    drawSplitLocal(ctx);
    ctx.restore();
  }

  // 原点局部坐标版:side / OTS 共用
  function drawSplitLocal(ctx) {
    const d = dummy;
    const prog = Math.min(1, (1 - d.respawnT) * 2.2);     // 分离进度
    const slide = prog * 26, drop = prog * prog * 30;
    const half = (top) => {
      ctx.save();
      // 斜切线约 -20°:上半沿攻击方向滑出并翻转
      if (top) { ctx.translate(slide, -d.h * 0.18 + drop * 0.4); ctx.rotate(0.35 * prog); }
      else { ctx.translate(-slide * 0.25, drop); ctx.rotate(-0.08 * prog); }
      ctx.beginPath();
      // 上/下半身裁切区域(斜线分割,范围盖住整张精灵)
      if (top) { ctx.moveTo(-40, -d.h / 2 - 20); ctx.lineTo(40, -d.h / 2 - 20); ctx.lineTo(40, -4); ctx.lineTo(-40, 8); }
      else { ctx.moveTo(-40, 8); ctx.lineTo(40, -4); ctx.lineTo(40, d.h / 2 + 24); ctx.lineTo(-40, d.h / 2 + 24); }
      ctx.closePath();
      if (sprites.ready) {
        ctx.clip();
        ctx.drawImage(sprites.dummyDark, -36, -d.h / 2 - 16, 72, 100);
      } else {
        ctx.fillStyle = '#6e4a32';
        ctx.fill();
      }
      // 切面高亮(刚断开时发白,随时间冷却)
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.9 - prog)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-d.w / 2, 8); ctx.lineTo(d.w / 2, -4);
      ctx.stroke();
      ctx.restore();
    };
    half(false); half(true);
  }

    // 本体:SVG 精灵(闪白=全白变体,尸体=压暗变体;未就绪回退简易桶)
    if (sprites.ready) {
      const img = flashing ? sprites.dummyWhite : (d.alive ? sprites.dummy : sprites.dummyDark);
      ctx.drawImage(img, -36, -d.h / 2 - 16, 72, 100);
    } else {
      ctx.fillStyle = flashing ? '#ffffff' : (d.alive ? '#b8763f' : '#6e4a32');
      ctx.beginPath();
      ctx.roundRect(-d.w / 2, -d.h / 2, d.w, d.h, 8);
      ctx.fill();
    }

    // 血条(常显)
    if (d.alive) {
      const bw = 58, bh = 8, byy = -d.h / 2 - 20;
      ctx.fillStyle = 'rgba(13,12,22,0.85)';
      ctx.fillRect(-bw / 2 - 1, byy - 1, bw + 2, bh + 2);
      const pct = d.hp / d.maxHp;
      ctx.fillStyle = pct > 0.35 ? '#5dff8f' : '#ff5d5d';
      ctx.fillRect(-bw / 2, byy, bw * pct, bh);
    }
    ctx.restore();
  }

  return {
    player, dummy, flags, input, REACH,
    attack, applyHit, update, draw, W, H, GROUND,
    playerScreen, projDummy,
    get view() { return view; },
    setView(v) { view = v; },
  };
}
