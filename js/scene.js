// 场景:玩家(剑士)+ 训练假人。所有"手感"都不在这里 — 这里只有规则。
// juice 模块通过钩子介入:registry.fire('onHit'/'onKill', payload)

export function createScene(juice) {
  const W = 640, H = 440, GROUND = 340;

  const player = {
    x: 200, y: GROUND, w: 34, h: 56,
    facing: 1,
    attackT: -1,          // -1 = idle;0..1 = 攻击动画进度
    attackDur: 0.12,      // 匀速;タメツメ模块会改写 pace()
    pace: t => t,         // 攻击动画时间重映射(juice9 改写成慢蓄快斩)
    didHit: false,
  };

  const dummy = {
    x: 430, y: GROUND, w: 44, h: 64,
    hp: 100, maxHp: 100,
    alive: true, respawnT: 0,
    vx: 0, vy: 0, dy: 0,   // dy: 尸体腾空高度
    flashT: 0,             // 闪白剩余秒数(juice1 写入,这里只衰减与绘制)
    wobble: 0,             // 受击晃动
  };

  function attack() {
    if (player.attackT >= 0) return;        // 攻击中
    player.attackT = 0;
    player.didHit = false;
  }

  function tryHit() {
    if (!dummy.alive) return;
    const dmg = 8 + Math.floor(Math.random() * 7);       // 8-14
    const crit = Math.random() < 0.12;
    const final = crit ? Math.round(dmg * 2.5) : dmg;
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
    juice.fire('onHit', { target: dummy, dmg: final, crit, kill, dir });
  }

  function update(dt) {
    worldT += dt;
    // 攻击动画推进;命中点在进度 0.55
    if (player.attackT >= 0) {
      player.attackT += dt / player.attackDur;
      if (!player.didHit && player.pace(Math.min(player.attackT, 1)) >= 0.55) {
        player.didHit = true;
        tryHit();
      }
      if (player.attackT >= 1) player.attackT = -1;
    }

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
      }
    }
    dummy.x = Math.max(300, Math.min(W - 60, dummy.x));
    dummy.flashT = Math.max(0, dummy.flashT - dt);
    dummy.wobble = Math.max(0, dummy.wobble - dt * 4);
  }

  let worldT = 0;                                        // 场景时钟(呼吸/火把用)

  function draw(ctx) {
    drawBackground(ctx);
    drawPlayer(ctx);
    drawDummy(ctx);
    drawVignette(ctx);
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
    // 攻击前冲:挥砍时身体向前突进(力量要有身体语言)
    const lunge = t < 0 ? 0 : Math.sin(Math.min(t, 1) * Math.PI) * 22;
    const bob = t < 0 ? Math.sin(worldT * 3) * 2 : 0;     // idle 呼吸
    ctx.save();
    ctx.translate(player.x + lunge, player.y + bob);

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 6 - bob, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 披风(深色,随呼吸微摆)
    ctx.fillStyle = '#2a3f66';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -h / 2 + 8);
    ctx.quadraticCurveTo(-w / 2 - 10 - bob, 0, -w / 2 - 5, h / 2 - 2);
    ctx.lineTo(-w / 2 + 4, h / 2 - 4);
    ctx.closePath();
    ctx.fill();

    // 腿
    ctx.fillStyle = '#27304a';
    ctx.fillRect(-10, h / 2 - 18, 8, 18);
    ctx.fillRect(3, h / 2 - 18, 8, 18);

    // 躯干(铠甲两档色)
    ctx.fillStyle = '#3f6fb5';
    ctx.fillRect(-w / 2, -h / 2 + 12, w, h - 30);
    ctx.fillStyle = '#5b8fd9';
    ctx.fillRect(-w / 2, -h / 2 + 12, w, 8);              // 肩甲高光
    ctx.fillStyle = '#2c4d80';
    ctx.fillRect(-w / 2, h / 2 - 26, w, 8);               // 腰带暗部

    // 头 + 头盔
    ctx.fillStyle = '#e8c9a0';
    ctx.fillRect(-9, -h / 2 - 4, 18, 16);                 // 脸
    ctx.fillStyle = '#5b8fd9';
    ctx.fillRect(-11, -h / 2 - 10, 22, 9);                // 盔
    ctx.fillStyle = '#3f6fb5';
    ctx.fillRect(-11, -h / 2 - 2, 22, 3);
    ctx.fillStyle = '#1c1c28';
    ctx.fillRect(2, -h / 2 + 2, 4, 4);                    // 眼

    // 剑:idle 扛肩;攻击从上劈下(pace 映射)
    const angle = t < 0 ? -2.45 : (-2.1 + t * 2.75);
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
    ctx.fillStyle = '#dfe6f2';
    ctx.fillRect(-2.5, -52, 5, 52);                       // 剑身
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.5, -52, 2, 52);                       // 刃高光
    ctx.fillStyle = '#caa84e';
    ctx.fillRect(-8, -2, 16, 4);                          // 护手
    ctx.fillStyle = '#8a6d3b';
    ctx.fillRect(-2.5, 2, 5, 10);                         // 柄
    ctx.restore();

    ctx.restore();
  }

  function drawDummy(ctx) {
    const d = dummy;
    ctx.save();
    const wob = Math.sin(d.wobble * 20) * d.wobble * 4;
    ctx.translate(d.x + wob, d.y - d.dy);
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

    // 底座桩(插在地里)
    if (d.alive) {
      ctx.fillStyle = flashing ? '#ffffff' : '#5c4630';
      ctx.fillRect(-6, d.h / 2 - 6, 12, 16);
    }

    // 本体(木桶身假人,两档木色 + 横箍)
    ctx.fillStyle = flashing ? '#ffffff' : (d.alive ? '#b8763f' : '#6e4a32');
    ctx.beginPath();
    ctx.roundRect(-d.w / 2, -d.h / 2, d.w, d.h, 8);
    ctx.fill();
    if (!flashing) {
      ctx.fillStyle = d.alive ? '#9c5f2e' : '#54381f';
      ctx.beginPath();
      ctx.roundRect(-d.w / 2, -d.h / 2, d.w * 0.35, d.h, 8); // 左侧暗部
      ctx.fill();
      // 铁箍三道
      ctx.fillStyle = '#3d3d52';
      for (const ry of [-d.h / 2 + 10, -2, d.h / 2 - 14]) {
        ctx.fillRect(-d.w / 2, ry, d.w, 5);
      }
      // 横臂(训练假人标志)
      ctx.fillStyle = d.alive ? '#8a5a2c' : '#54381f';
      ctx.fillRect(-d.w / 2 - 14, -d.h / 2 + 18, d.w + 28, 7);
      // 草绳靶心
      ctx.strokeStyle = '#d9b06a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 6, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 6, 4, 0, Math.PI * 2); ctx.stroke();
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

  return { player, dummy, attack, update, draw, W, H, GROUND };
}
