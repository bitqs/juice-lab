// 19 步双语文案。每步:篇章 / 名称 / 说明 / 真实参数 / 出处(全部可溯源)。

export const STEPS = [
  {
    act: { en: 'Baseline', zh: '对照' },
    name: { en: 'Bare hit (control group)', zh: '裸命中(对照组)' },
    desc: {
      en: 'Swing a few times. The HP bar drops, the logic is 100% correct — but doesn\'t it feel like typing on an unplugged keyboard? This is "the game logic works, the feel is zero". Each step from here adds exactly one technique. You judge the difference.',
      zh: '砍几下。血条在掉,逻辑完全正确 — 但是不是像在敲一块没插电的键盘?这就是"游戏逻辑对了,手感为零"的状态。后面每一步只加一层技术,你来感受差别。',
    },
    params: { en: 'Damage 8-14 · crit 12% (×2.5)\nFeedback: none', zh: '伤害 8-14 · 暴击率 12%(×2.5)\n反馈:无' },
    source: { en: 'Control group — "juice is the second game"', zh: '对照组 — juice 手感是第二个游戏' },
  },
  {
    act: { en: 'Games', zh: '游戏篇' },
    name: { en: '① Hit flash (tintFill)', zh: '① 闪白 tintFill' },
    desc: {
      en: 'On hit, every pixel of the target turns pure white for one blink. The eye gets a high-contrast anchor: "I definitely hit it." Best ROI in the whole stack — one line of code. On death it\'s halved so it never masks the death animation.',
      zh: '命中瞬间把目标所有像素替换成纯白,一眨眼恢复。眼睛获得一个高对比锚点:"我确实打到了"。这是性价比之王 — 一行代码,手感立增。死亡时缩短到一半,避免盖住死亡表现。',
    },
    params: { en: 'Hit flash 120ms · death 60ms\nImpl: fill #FFFFFF, then restore', zh: '命中闪白 120ms · 死亡 60ms\n实现:整体填充 #FFFFFF 后恢复' },
    source: { en: 'VS decompile HITVFX table', zh: 'VS 反编译 HITVFX 表 · 手感靠参数化而非美术帧' },
  },
  {
    act: { en: 'Games', zh: '游戏篇' },
    name: { en: '② Hitstop (two-tier, JP style)', zh: '② 顿帧 hitstop(双层日式)' },
    desc: {
      en: 'The instant a heavy hit lands, the world freezes for tens of milliseconds — the brain reads the pause as "impact so hard that time stopped". The Japanese refinement is two-tier: normal hits freeze only the target for 45ms (object-level — belt-scroll rule: only striker and struck stop, bystanders keep moving), and the frozen target micro-vibrates (Sakurai: force pouring into the body). Only crits/kills freeze the whole world, heavier = longer.',
      zh: '重击命中的一瞬,整个世界冻结几十毫秒 — 大脑把停顿解释为"冲击大到时间都卡住了"。日式精修分两层:普攻只冻受击者 45ms(对象级,世界照走 — 清版动作铁律),冻住期间假人还在微微颤动(樱井流"分解工夫");暴击/处决才冻整个世界,越重越久。',
    },
    params: { en: 'Normal: object-level 45ms + vibration ±1.6px\nCrit: world freeze 55ms · execution 80ms', zh: '普攻:对象级 45ms + 微振动 ±1.6px\n暴击:世界冻结 55ms · 处决 80ms' },
    source: { en: 'VS decompile · Sakurai\'s hitstop episode · belt-scroll convention', zh: 'VS 反编译 · 樱井政博ヒットストップ回 · ベルトスクロール顿帧惯例' },
  },
  {
    act: { en: 'Games', zh: '游戏篇' },
    name: { en: '③ Knockback + squash & stretch', zh: '③ 击退 + 挤压拉伸' },
    desc: {
      en: 'Force needs somewhere to go — in two ways. Position: hits push the target back, kills launch the corpse along your attack vector (VS: negate velocity, reuse the movement pipeline, zero tween). Shape: on impact the body squashes wide and short for a moment, then springs back — Disney\'s squash & stretch, the oldest principle in animation. Rigid things feel dead; deformation reads as alive.',
      zh: '力量要有去处 — 两个去处。位置:命中推开目标,击杀沿攻击向量弹飞尸体(VS:速度取反复用移动管线,零补间)。形状:受击瞬间身体横扁竖缩再弹回 — 迪士尼"挤压拉伸",动画第一原则。刚体感觉是死的,会变形才显得活。',
    },
    params: { en: 'Knockback 90px/s · death launch 260px/s\nSquash: ±18% scale, 0.17s spring-back', zh: '击退 90px/s · 死亡弹飞 260px/s\n挤压:±18% 缩放,0.17s 弹回' },
    source: { en: 'VS decompile deathKB · Disney 12 principles', zh: 'VS 反编译 deathKB · 迪士尼动画12原则' },
  },
  {
    act: { en: 'Games', zh: '游戏篇' },
    name: { en: '④ Damage numbers', zh: '④ 伤害数字' },
    desc: {
      en: 'Every hit pops a number: tossed up, falls, fades. Spawn position is randomized so rapid hits never stack into a blob. Crits are golden and bigger — rare events should look rare. VS renders these with a custom blitter, 16,000 digit sprites on screen.',
      zh: '每次命中弹出数字:先上抛再落下淡出。出生位置加随机偏移,连击时数字不会叠成一坨。暴击金色加大 — 稀有事件要有稀有的样子。VS 用自研 Blitter 一次画 16000 个数字精灵。',
    },
    params: { en: 'Spawn offset X±12px · toss 120px/s · life 0.7s\nCrit: gold, ×1.5 size', zh: '出生偏移 X±12px · 上抛 120px/s · 寿命 0.7s\n暴击:金色 ×1.5 大小' },
    source: { en: 'VS decompile: per-digit sprites + bounce easing', zh: 'VS 反编译:逐位精灵 + BobGroup 弹跳缓动 · ATOM-F06' },
  },
  {
    act: { en: 'Games', zh: '游戏篇' },
    name: { en: '⑤ Hit VFX + shockwave', zh: '⑤ 命中贴片 + 冲击波' },
    desc: {
      en: 'A four-point star blooms at the contact point with an expanding ring around it. This tells the eye exactly where force was applied. VS makes it a data table: a new weapon feel = one new row of config.',
      zh: '接触点绽放一颗四角星,外圈一道扩散环。这告诉眼睛"接触发生在这里" — 力的作用点从此可见。VS 把它做成数据表:加一种武器手感 = 加一行配置。',
    },
    params: { en: 'Star 90ms · ring 180ms · crits bigger & golden\nAll code-drawn, zero textures', zh: '星形 90ms · 冲击环 180ms · 暴击加大加金\n全部代码绘制,零贴图' },
    source: { en: 'VS decompile HITVFX_DATA table', zh: 'VS 反编译 HITVFX_DATA 表(命中星+冲击波贴片)' },
  },
  {
    act: { en: 'Games', zh: '游戏篇' },
    name: { en: '⑥ Death particles', zh: '⑥ 死亡粒子爆裂' },
    desc: {
      en: 'On kill the target bursts into 12 fragments that fly out radially and get pulled down by gravity. Fragments inherit the body color — it really broke. They linger a moment (Vlambeer calls it permanence): battle scars make the world remember what you did.',
      zh: '击杀时目标炸成 12 颗碎片,放射飞出再被重力拽落。碎片颜色继承本体 — 它"真的碎了"。粒子残留片刻(Vlambeer 称之 permanence):战斗痕迹让世界记住你做过的事。',
    },
    params: { en: '12 particles · speed 120-300px/s · gravity 400 · life 0.6s', zh: '12 粒 · 初速 120-300px/s · 重力 400 · 寿命 0.6s' },
    source: { en: 'Vlambeer GDC 2013 (permanence)', zh: 'Vlambeer GDC 2013(permanence)· juice 手感是第二个游戏' },
  },
  {
    act: { en: 'Games', zh: '游戏篇' },
    name: { en: '⑦ Screen shake (scarce!)', zh: '⑦ 屏震(稀缺资源!)' },
    desc: {
      en: 'The whole screen shakes — but mind the budget: normal attacks get ZERO shake. VS lands dozens of hits per second; shaking on all of them is motion sickness. Shake is reserved for kills and crits — single-digit-frequency events — so it keeps its punch. Spend your most expensive feedback on your rarest moments.',
      zh: '整个画面震一下 — 但注意配额:普攻零屏震。VS 每秒命中几十次,全震会晕船。屏震只留给击杀和暴击这种个位数频率的事件,它才保得住冲击力。把最贵的反馈留给最稀有的时刻。',
    },
    params: { en: 'Kill 11px/0.35s · crit 6px/0.22s · normal 0\nHigh-frequency games: feedback per-entity, shake global-scarce', zh: '击杀震幅 11px/0.35s · 暴击 6px/0.22s · 普攻 0\n高频游戏:反馈下放个体,屏震上收全局' },
    source: { en: 'VS decompile: no shake on normal hits, boss/death only', zh: 'VS 反编译:普攻无 ProCamera2DShake,仅 Boss/死亡导演 · ATOM-F10' },
  },
  {
    act: { en: 'Games', zh: '游戏篇' },
    name: { en: '⑧ Layered SFX', zh: '⑧ 音效分层' },
    desc: {
      en: 'Turn sound on! Light hits = short mid-frequency tick; crits = low square wave — half of "heavy" lives in the low end; kills = a 400→40Hz downward sweep that closes the sentence. All synthesized live with WebAudio, zero audio files.',
      zh: '开声音!轻击 = 中频短促;暴击 = 低频方波 — "重"这个感觉一半住在低频里;击杀 = 一道 400→40Hz 的下扫,给战斗画句号。全部 WebAudio 实时合成,零音频文件。',
    },
    params: { en: 'Hit: triangle 320→180Hz 60ms\nCrit: square 140→70Hz 120ms\nKill: saw sweep 400→40Hz 200ms', zh: '命中:三角波 320→180Hz 60ms\n暴击:方波 140→70Hz 120ms\n击杀:锯齿下扫 400→40Hz 200ms' },
    source: { en: 'Vlambeer: heavy low-freq hit SFX', zh: 'Vlambeer:heavy low-freq hit SFX · 打击感笔记' },
  },
  {
    act: { en: 'Games', zh: '游戏篇' },
    name: { en: '⑨ Tame-tsume (slow build, instant cut)', zh: '⑨ タメツメ(慢蓄瞬斩)' },
    desc: {
      en: 'The attack animation is no longer linear: the first 80% of the time covers only 35% of the motion (tame — build), then the last 20% snaps through 65% (tsume — cut). Same total duration, but asymmetric pacing makes the slash feel like lightning. Core Japanese animation timing: hitstop is the build, knockback is the release.',
      zh: '攻击动画不再匀速:前 80% 时间只走完 35% 行程(タメ·蓄),最后 20% 时间猛走 65%(ツメ·斩)。同样的总时长,不对称配速让斩击"快得像闪电"。日式动画的核心时序观,顿帧是蓄、击退是斩。',
    },
    params: { en: 'Total 230ms = build 180ms + cut 50ms\nCompare: uniform 120ms actually feels softer', zh: '总时长 230ms = 慢蓄 180ms + 瞬斩 50ms\n对比:关闭后匀速 120ms 反而显"软"' },
    source: { en: 'Impact frames & tame-tsume (Kanada-school animation)', zh: '打击帧 インパクトフレームとタメツメ(金田系作画)' },
  },
  {
    act: { en: 'Anime', zh: '动漫篇' },
    name: { en: '⑩ Startup/recovery + hitstun', zh: '⑩ 前后摇 + 硬直' },
    desc: {
      en: 'Attacks no longer fire on click: 100ms windup first (startup), then 160ms of recovery where you cannot attack again; the struck dummy staggers backward (hitstun). An attack with commitment is an attack with weight — the foundation of fighting-game feel. Stack it with ⑨ and every swing becomes a decision, not a click.',
      zh: '攻击不再"点了就出":先 100ms 起手蓄势(前摇),挥完僵 160ms 不能再砍(后摇);假人受击僵直后仰(硬直)。攻击有了承诺,就有了重量 — 这是格斗游戏手感的地基。和⑨叠加后,每一刀都像"决定"而不是"点击"。',
    },
    params: { en: 'Startup 100ms · recovery 160ms (no cancel)\nHitstun: 0.16rad lean, recovers in 0.45s', zh: '前摇 100ms · 后摇 160ms(不可取消)\n受击硬直:后仰 0.16rad,0.45s 恢复' },
    source: { en: 'Fighting-game frame data tradition', zh: '打击感笔记:手応え · 格斗帧数据传统' },
  },
  {
    act: { en: 'Anime', zh: '动漫篇' },
    name: { en: '⑪ Smear frames', zh: '⑪ 挥砍残影(スミア)' },
    desc: {
      en: 'The swing leaves a trail of stretched, blue-tinted afterimages. An old animator\'s trick: when keyframes are sparse, insert a smeared in-between and the eye invents the speed itself. Code version: record the sword bone every frame, fade in 120ms.',
      zh: '挥砍轨迹上留下一串拉伸发蓝的残像。动画师的老手艺:关键帧稀疏时,塞一张拉糊的"涂抹帧"传达运动 — 眼睛会自己脑补出速度。代码版:剑的骨骼位置每帧记录,淡出 120ms。',
    },
    params: { en: 'Smear width = sword ×2.8 (stretch)\nLife 120ms · cyan-white gradient', zh: '残影宽度 = 剑宽 ×2.8(拉伸感)\n寿命 120ms · 青白渐变' },
    source: { en: 'Smear frames (animation technique)', zh: '打击帧笔记:スミアフレーム(涂抹帧)' },
  },
  {
    act: { en: 'Anime', zh: '动漫篇' },
    name: { en: '⑫ Sword wave', zh: '⑫ 剑气' },
    desc: {
      en: 'A landed slash launches a crescent wave that hits the dummy again for 40% damage. Anime standard: power overflowing the body. Note the second hit re-triggers every earlier layer (flash, numbers, SFX) — one swing, double feedback, satisfaction compounds.',
      zh: '砍中后飞出一道新月形斩击波,命中假人造成 40% 二段伤害。动漫标配:力量大到溢出身体。二段命中会再次触发前面所有层(闪白/数字/音效)— 一刀变两次反馈,爽感按倍数走。',
    },
    params: { en: 'Speed 560px/s · damage 40% · 3-layer crescent trail\nSecond hit runs the full feedback pipeline', zh: '速度 560px/s · 伤害 40% · 三层月牙残尾\n二段命中走完整反馈管线' },
    source: { en: 'Kanada-school exaggeration · anime slash idiom', zh: '金田系夸张表现 · 动漫斩击程式' },
  },
  {
    act: { en: 'Anime', zh: '动漫篇' },
    name: { en: '⑬ Impact frame (B&W invert)', zh: '⑬ 打击帧(白黒反转)' },
    desc: {
      en: 'At the contact instant of a crit/kill, the entire screen inverts for 3 frames. The Japanese "impact frame": a single high-contrast frame at peak impact gives the eye an anchor it cannot ignore. UE5 ships this built-in. Frequency must stay scarce — inverting every hit is an epilepsy warning.',
      zh: '暴击/击杀的接触瞬间,整个画面反色 3 帧。日本动画的インパクトフレーム:在最大冲击的一瞬插入高对比单帧,给眼睛一个无法忽略的锚点。UE5 都内置了这个效果。频率必须稀缺 — 每刀都反转就是癫痫警告。',
    },
    params: { en: 'Trigger: crit/kill only · 3 frames (~50ms)\nImpl: difference-composite full-screen invert', zh: '触发:仅暴击/击杀 · 时长 3 帧(~50ms)\n实现:difference 合成模式整屏反色' },
    source: { en: 'Impact frame (インパクトフレーム)', zh: '打击帧笔记:インパクトフレーム(白黒)' },
  },
  {
    act: { en: 'Anime', zh: '动漫篇' },
    name: { en: '⑭ Iai cut (finisher)', zh: '⑭ 居合两断(终结演出)' },
    desc: {
      en: 'The kill gets a full ceremony: the world stops for 220ms → a white cut-line sweeps across the screen → the dummy splits along the diagonal, cut faces glowing, the upper half sliding off. The chanbara delayed cut: first "it is already over", then let the result happen. Death becomes ritual.',
      zh: '击杀演出全面升级:世界静止 220ms → 一道贯穿全屏的白色切线划过 → 假人沿斜线裂成两段,切面发白,上半身滑落。チャンバラ时代剧的延迟两断:先"已经结束了",再让结果发生。死亡变成仪式。',
    },
    params: { en: 'Timestop 220ms · cut-line -20° full screen\nSplit: upper half slides 26px + rotates', zh: '时停 220ms · 切线 -20° 贯穿全屏\n两段分离:上半滑出 26px + 翻转' },
    source: { en: 'Iai-giri idiom · "make certain death a ritual"', zh: '居合斬り演出程式 · VS 笔记:必死做成仪式' },
  },
  {
    act: { en: 'Games', zh: '游戏篇' },
    name: { en: '⑮ Style rank (DMC)', zh: '⑮ 风格评价(DMC)' },
    desc: {
      en: 'A rank appears top-right: D → C → B → A → S → SS → SSS. It climbs while you attack, drains when you stop, and drains faster the higher you go. Devil May Cry\'s signature invention: make "fighting beautifully" itself a real-time goal — the meter reshapes every button you press. Crits and wave hits score higher than repeated normals (reward variety, punish mashing).',
      zh: '右上角出现段位:D → C → B → A → S → SS → SSS。持续进攻往上涨,停手就掉,段位越高掉得越快。鬼泣的招牌发明:把"打得漂亮"本身变成实时追逐的目标 — 评价系统反过来塑造你每一次按键。暴击和剑气二段比重复普攻给分高(奖励多样性,惩罚无脑连点)。',
    },
    params: { en: '7 ranks · 100 pts each · kill+90 crit+40 normal+22\nDecay 35+rank×18 pts/s · combo breaks after 1.6s', zh: '七段:每段 100 点 · 击杀+90 暴击+40 普攻+22\n衰减 35+段位×18 点/秒 · 1.6s 无命中断连击' },
    source: { en: 'DMC Style Meter (D→SSS, multiplier + variety scoring)', zh: 'DMC Style Meter(D→SSS,奖励乘数+多样性评分)' },
  },
  {
    act: { en: 'Film', zh: '电影篇' },
    name: { en: '⑯ Camera language (film)', zh: '⑯ 镜头语言(电影)' },
    desc: {
      en: 'The editing-room arsenal: ① frame removal — every hit swallows 30ms ("cut one frame, hits harder"); ② crash zoom — the camera punches toward the dummy on crits, HK action staple; ③ speed ramp — kills drop to 0.25x for 300ms then snap back; ④ camera kickback — a directional shove along the attack vector (a different word than random shake); ⑤ dutch angle — heavy hits tilt the frame ~1°; ⑥ zoom-out reveal — after the kill push-in, yank back to wide. All on real time: the camera keeps moving inside slow motion. Film rule.',
      zh: '剪辑台武器全套:① 抽帧 — 命中帧吞 30ms,"去一帧更狠";② 急推 crash zoom — 暴击瞬间向假人猛推,港片标配;③ 速度坡道 — 击杀 0.25x 慢 300ms 后瞬回;④ 镜头后坐 — 沿攻击方向顶一下镜头(方向性,跟随机乱抖的屏震是两种语言);⑤ 荷兰角 — 重击画面歪 1°;⑥ 拉远揭示 — 击杀推完猛拉回广角。全部走真实时间:慢动作里镜头照常动,电影规则。',
    },
    params: { en: 'Frame removal 30ms · zoom 1.07/1.16x · ramp 0.25x·300ms\nKickback 2.5-7px directional · dutch ~1.3° · zoom-out 0.95x', zh: '抽帧 30ms · 急推 1.07/1.16x · 坡道 0.25x·300ms\n后坐 2.5-7px 方向性 · 荷兰角 ~1.3° · 拉远 0.95x' },
    source: { en: 'Fight editing: frame removal · HK crash zoom · speed ramping', zh: '武指剪辑 frame removal · 港片 crash zoom · speed ramping · dutch angle' },
  },
  {
    act: { en: 'Finale', zh: '综合' },
    name: { en: '⑰ Ultimate (full cutscene)', zh: '⑰ 大招(综合演出)' },
    desc: {
      en: 'The sum of all research. Hits build charge; at 100% press U (or the on-screen button): the world fully pauses → screen darkens → the technique name slams in with a shout → charge-up with lightning strikes → the enemy cuts in huge at screen center with anime speed lines → an infinite slash storm shreds it → the hero sheathes the sword and strikes a pose → only then does the enemy die. Every element you felt one by one earlier — the ultimate is just all of them orchestrated on a film beat.',
      zh: '所有研究的总和:命中攒充能,满 100% 按 U(或点画布按钮)发动 — 世界全停 → 暗屏 → 招式名怒吼砸入 → 蓄力电闪雷鸣 → 敌人放大到屏幕中央(集中线 cut-in)→ 无限斩风暴 → 主角收刀摆造型 → 然后,敌人才死。每个元素你都在前面单独感受过 — 大招就是把它们按电影节拍编排。',
    },
    params: { en: 'Charge: normal+8 crit+14 kill+20\nTimeline: dark 0.45s → name 0.95s → charge 0.9s → cut-in 0.6s → slash 1.1s → pose 0.85s → death', zh: '充能:普攻+8 暴击+14 击杀+20\n时间轴:暗 0.45s → 报名 0.95s → 蓄雷 0.9s → cut-in 0.6s → 无限斩 1.1s → 造型 0.85s → 死' },
    source: { en: 'All 17 layers in concert · Swink: polish is orchestration', zh: '本实验室全部 17 层的合奏 · Swink:打磨即编排' },
  },
  {
    act: { en: 'Warning', zh: '警告' },
    name: { en: '⑱ Everything on + the inverted U', zh: '⑱ 全开 + 倒U警告' },
    desc: {
      en: 'All layers on — now hit A/B against STEP 0 and feel the distance between "dead fish" and "can\'t stop". But juice is not monotonic: drag the overload slider and watch 3x+ turn numbers into mush and particles bury the target — readability dies. The empirical result: medium-high is optimal; too much scores as badly as none.',
      zh: '全层全开 — 现在回头按一下 A/B 对比第 0 步,体会"死鱼"和"上头"的距离。但 juice 不是越多越好:拖动过载滑杆,看 3x 以后数字糊屏、粒子淹没目标 — 可读性死亡。实证研究:中高强度最优,过量和零一样糟。',
    },
    params: { en: 'Overload slider: particles/shake/number size ×1-5\nOptimal zone: enough, then stop', zh: '过载滑杆:粒子数/震幅/数字尺寸 ×1-5\n最优区间:够用,然后停手' },
    source: { en: 'CHI 2024 inverted-U · Juul & Begy 2016 · Hicks et al.', zh: 'CHI 2024 倒U实证 · Juul & Begy 2016 · 打击感笔记' },
  },
];
