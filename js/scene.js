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

  function draw(ctx) {
    // 地面
    ctx.strokeStyle = '#232338';
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 34);
    ctx.lineTo(W, GROUND + 34);
    ctx.stroke();

    drawPlayer(ctx);
    drawDummy(ctx);
  }

  function drawPlayer(ctx) {
    const { x, y, w, h } = player;
    ctx.save();
    ctx.translate(x, y);

    // 身体
    ctx.fillStyle = '#4d9fff';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    // 眼
    ctx.fillStyle = '#fff';
    ctx.fillRect(w / 2 - 12, -h / 2 + 10, 6, 6);

    // 剑:idle 垂直背后;攻击时从上往前劈(角度由 pace 映射)
    const t = player.attackT >= 0 ? player.pace(Math.min(player.attackT, 1)) : -1;
    const angle = t < 0 ? -2.4 : (-2.0 + t * 2.6);       // 弧度,劈向假人
    ctx.save();
    ctx.translate(w / 2 - 4, -h / 2 + 14);
    ctx.rotate(angle);
    ctx.fillStyle = '#cfd6e4';
    ctx.fillRect(-2, -46, 4, 46);                        // 剑身
    ctx.fillStyle = '#8a6d3b';
    ctx.fillRect(-3, -4, 6, 10);                         // 剑柄
    ctx.restore();

    ctx.restore();
  }

  function drawDummy(ctx) {
    const d = dummy;
    ctx.save();
    const wob = Math.sin(d.wobble * 20) * d.wobble * 4;
    ctx.translate(d.x + wob, d.y - d.dy);
    if (!d.alive) ctx.rotate(0.35 * (d.respawnT < 1 ? 1 : 0));

    // 本体(木桩假人)
    const flashing = d.flashT > 0;
    ctx.fillStyle = flashing ? '#ffffff' : (d.alive ? '#c97b4a' : '#6e4a32');
    ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
    if (!flashing) {
      ctx.fillStyle = '#a05c34';
      ctx.fillRect(-d.w / 2, -d.h / 2 + 14, d.w, 6);     // 木纹
      ctx.fillRect(-d.w / 2, d.h / 2 - 22, d.w, 6);
      // 桩脸
      ctx.fillStyle = '#3a2417';
      ctx.fillRect(-10, -d.h / 2 + 26, 5, 5);
      ctx.fillRect(5, -d.h / 2 + 26, 5, 5);
    }

    // 血条(假人头顶,常显)
    if (d.alive) {
      const bw = 56, bh = 7, byy = -d.h / 2 - 18;
      ctx.fillStyle = '#26263a';
      ctx.fillRect(-bw / 2, byy, bw, bh);
      ctx.fillStyle = d.hp / d.maxHp > 0.35 ? '#5dff8f' : '#ff5d5d';
      ctx.fillRect(-bw / 2, byy, bw * (d.hp / d.maxHp), bh);
    }
    ctx.restore();
  }

  return { player, dummy, attack, update, draw, W, H, GROUND };
}
