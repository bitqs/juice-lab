// 双语:默认英文,可切中文。lang 持久化在 localStorage。

export let lang = localStorage.getItem('jl-lang') || 'en';

export function setLang(l) {
  lang = l;
  localStorage.setItem('jl-lang', l);
}

export function t(key) {
  return (UI[lang] && UI[lang][key]) || UI.en[key] || key;
}

export const UI = {
  en: {
    title: '⚔️ Juice Lab',
    subtitle: 'An interactive anatomy of why hitting things feels good.',
    hint: 'tap / space = attack',
    ab: 'A/B: ',
    abCurrent: 'current',
    abBase: 'STEP 0 (bare)',
    prev: '← Prev',
    next: 'Next →',
    freeMode: 'Free mode',
    freeModeHint: 'mix any layers',
    auto: '🤖 Auto-attack: ',
    on: 'ON', off: 'OFF',
    gif: '📹 Record GIF (v2)',
    gifAlert: 'GIF recording coming in v2 — use system screen recording for now',
    overloadLabel: 'Overload',
    overloadWarn: '⚠ Inverted-U: too much juice → readability dies (CHI 2024)',
    ultCharge: 'ULT charge',
    ultReady: '⚡ ULT READY — press U / tap button',
    ultBtn: '⚡ ULT',
    poseLine: '...it is already cut.',
    step: 'STEP',
  },
  zh: {
    title: '⚔️ Juice Lab · 打击感实验室',
    subtitle: '从"死鱼"到"上头",一层一层叠出来 — 参数溯源自 VS / Hades 源码拆解',
    hint: '点击 / 空格 = 攻击',
    ab: 'A/B 对比:',
    abCurrent: '当前配置',
    abBase: '第 0 步(裸)',
    prev: '← 上一步',
    next: '下一步 →',
    freeMode: '自由模式',
    freeModeHint: '任意组合开关',
    auto: '🤖 自动连击:',
    on: '开', off: '关',
    gif: '📹 录 5 秒 GIF(v2)',
    gifAlert: 'GIF 录制 v2 安排上 — 先用系统录屏吧',
    overloadLabel: '过载倍率',
    overloadWarn: '⚠ 倒U曲线:juice 过量 → 可读性下降(CHI 2024)',
    ultCharge: '大招充能',
    ultReady: '⚡ 大招就绪 — 按 U / 点按钮',
    ultBtn: '⚡ 大招',
    poseLine: '……斬り終わった。',
    step: 'STEP',
  },
};
