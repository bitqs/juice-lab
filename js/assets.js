// SVG 矢量精灵:内联定义 → 栅格化成 Image → canvas 绘制。
// 预生成变体:white(闪白用)、dark(尸体用)。

const KNIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 96">
<defs>
  <linearGradient id="armor" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#2c4d80"/><stop offset="0.45" stop-color="#4d7fc4"/>
    <stop offset="0.7" stop-color="#6fa3e8"/><stop offset="1" stop-color="#3a619e"/>
  </linearGradient>
  <linearGradient id="cape" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#27406b"/><stop offset="1" stop-color="#16243d"/>
  </linearGradient>
  <linearGradient id="helm" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7eb0ef"/><stop offset="1" stop-color="#3a619e"/>
  </linearGradient>
</defs>
<!-- 披风 -->
<path d="M22 26 Q8 50 13 84 L26 80 Q20 52 27 30 Z" fill="url(#cape)"/>
<!-- 腿 -->
<rect x="24" y="70" width="8" height="20" rx="2.5" fill="#1f2940"/>
<rect x="35" y="70" width="8" height="20" rx="2.5" fill="#283452"/>
<!-- 靴 -->
<path d="M23 88 h10 v6 h-12 q-1 -4 2 -6 Z" fill="#141b2e"/>
<path d="M34 88 h10 v6 h-12 q-1 -4 2 -6 Z" fill="#1a2238"/>
<!-- 躯干铠甲 -->
<path d="M22 32 Q32 28 45 32 L46 62 Q33 68 21 62 Z" fill="url(#armor)"/>
<path d="M22 32 Q32 28 45 32 L45.6 40 Q32 35 21.6 40 Z" fill="#7eb0ef" opacity="0.8"/>
<!-- 腰带 -->
<rect x="21" y="58" width="25" height="6" rx="2" fill="#1c2742"/>
<circle cx="33" cy="61" r="2.2" fill="#caa84e"/>
<!-- 裙甲 -->
<path d="M22 63 L45 63 L43 72 Q33 76 24 72 Z" fill="#33507f"/>
<!-- 左臂(后) -->
<rect x="19" y="34" width="7" height="16" rx="3.5" fill="#2c4d80"/>
<!-- 肩甲 -->
<ellipse cx="24" cy="33" rx="7.5" ry="6" fill="url(#helm)"/>
<ellipse cx="43" cy="33" rx="7.5" ry="6" fill="url(#helm)"/>
<!-- 右臂(持剑手,举于肩侧) -->
<rect x="41" y="28" width="7" height="14" rx="3.5" fill="#3a619e" transform="rotate(18 44 30)"/>
<circle cx="48" cy="26" r="4" fill="#e8c9a0"/>
<!-- 头 -->
<rect x="25" y="12" width="16" height="13" rx="3" fill="#e8c9a0"/>
<!-- 头盔 -->
<path d="M23 18 Q23 6 33 6 Q43 6 43 18 L43 15 Q43 12 40 12 L26 12 Q23 12 23 15 Z" fill="url(#helm)"/>
<path d="M23 15 h20 v4 q-10 3 -20 0 Z" fill="#2c4d80"/>
<!-- 目缝 -->
<rect x="35" y="16" width="5" height="2.6" rx="1.3" fill="#10131f"/>
<!-- 盔缨 -->
<path d="M30 7 Q28 -2 36 -1 Q33 2 34 7 Z" fill="#ff5d5d"/>
</svg>`;

// 背影(过肩视角用):披风为主体,盔后脑+红缨,右肩探出剑柄
const KNIGHT_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 96">
<defs>
  <linearGradient id="capeB" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2e4a7c"/><stop offset="1" stop-color="#16243d"/>
  </linearGradient>
  <linearGradient id="helmB" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7eb0ef"/><stop offset="1" stop-color="#3a619e"/>
  </linearGradient>
</defs>
<!-- 腿(披风下缘露出) -->
<rect x="22" y="84" width="9" height="10" rx="2" fill="#141b2e"/>
<rect x="34" y="84" width="9" height="10" rx="2" fill="#1a2238"/>
<!-- 披风主体 -->
<path d="M16 30 Q32 24 48 30 L52 78 Q42 88 32 88 Q22 88 12 78 Z" fill="url(#capeB)"/>
<path d="M20 32 Q22 60 21 80 M32 30 Q32 60 32 86 M44 32 Q42 60 43 80" stroke="#1d3050" stroke-width="2" fill="none"/>
<!-- 肩甲 -->
<ellipse cx="20" cy="30" rx="8" ry="6.5" fill="url(#helmB)"/>
<ellipse cx="44" cy="30" rx="8" ry="6.5" fill="url(#helmB)"/>
<!-- 探出右肩的剑柄 -->
<rect x="47" y="10" width="4" height="16" rx="2" fill="#8a6d3b" transform="rotate(14 49 18)"/>
<rect x="43" y="20" width="13" height="4" rx="2" fill="#caa84e" transform="rotate(14 49 22)"/>
<!-- 头盔后脑 -->
<path d="M23 22 Q23 8 32 8 Q41 8 41 22 Q32 26 23 22 Z" fill="url(#helmB)"/>
<rect x="23" y="20" width="18" height="3" fill="#2c4d80"/>
<!-- 盔缨 -->
<path d="M29 9 Q26 -1 35 0 Q31 3 33 9 Z" fill="#ff5d5d"/>
</svg>`;

const DUMMY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 100">
<defs>
  <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#7e4f26"/><stop offset="0.4" stop-color="#b8763f"/>
    <stop offset="0.75" stop-color="#cf8c4f"/><stop offset="1" stop-color="#8f5c2c"/>
  </linearGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#9c6531"/><stop offset="1" stop-color="#6e4520"/>
  </linearGradient>
</defs>
<!-- 底桩 -->
<rect x="30" y="78" width="12" height="18" rx="2" fill="#5c4630"/>
<path d="M26 94 h20 l3 6 h-26 Z" fill="#4a3826"/>
<!-- 横臂 -->
<rect x="2" y="28" width="68" height="9" rx="4" fill="url(#beam)"/>
<rect x="2" y="28" width="68" height="3" rx="1.5" fill="#b8824a" opacity="0.7"/>
<!-- 桶身 -->
<path d="M20 16 Q36 10 52 16 Q56 47 52 78 Q36 84 20 78 Q16 47 20 16 Z" fill="url(#wood)"/>
<!-- 木纹 -->
<path d="M28 14 Q26 47 28 80" stroke="#8f5c2c" stroke-width="1.6" fill="none" opacity="0.8"/>
<path d="M37 12 Q35 47 37 82" stroke="#8f5c2c" stroke-width="1.6" fill="none" opacity="0.6"/>
<path d="M45 14 Q44 47 45 80" stroke="#8f5c2c" stroke-width="1.6" fill="none" opacity="0.8"/>
<!-- 铁箍 -->
<g fill="#3d3d52">
  <path d="M19 20 Q36 14 53 20 l0 6 Q36 20 19 26 Z"/>
  <path d="M17.5 44 Q36 39 54.5 44 l0 6 Q36 45 17.5 50 Z"/>
  <path d="M19 68 Q36 63 53 68 l0 6 Q36 69 19 74 Z"/>
</g>
<g fill="#5d5d78">
  <circle cx="36" cy="20" r="1.4"/><circle cx="36" cy="44.5" r="1.4"/><circle cx="36" cy="68.5" r="1.4"/>
</g>
<!-- 草绳靶心 -->
<circle cx="36" cy="52" r="11" fill="none" stroke="#d9b06a" stroke-width="2.4" stroke-dasharray="3.5 2"/>
<circle cx="36" cy="52" r="5" fill="none" stroke="#d9b06a" stroke-width="2.2"/>
<circle cx="36" cy="52" r="1.8" fill="#e8c184"/>
<!-- 顶部草垫 -->
<path d="M26 13 Q36 6 46 13 Q36 17 26 13 Z" fill="#c9a05a"/>
<path d="M29 11 l2 -5 M34 10 l1 -6 M39 10 l0 -6 M43 12 l2 -5" stroke="#c9a05a" stroke-width="2" stroke-linecap="round"/>
</svg>`;

function svgToImage(svg) {
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  return img;
}

// 生成色彩变体:white = 全白剪影(闪白),dark = 压暗(尸体)
function makeVariant(img, mode) {
  const c = document.createElement('canvas');
  c.width = 144; c.height = 200;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, c.width, c.height);
  x.globalCompositeOperation = mode === 'white' ? 'source-in' : 'source-atop';
  x.fillStyle = mode === 'white' ? '#ffffff' : 'rgba(20,16,28,0.55)';
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

export const sprites = {
  knight: svgToImage(KNIGHT_SVG),
  knightBack: svgToImage(KNIGHT_BACK_SVG),
  dummy: svgToImage(DUMMY_SVG),
  knightWhite: null, dummyWhite: null, dummyDark: null,
  ready: false,
};

let loaded = 0;
for (const img of [sprites.knight, sprites.knightBack, sprites.dummy]) {
  img.onload = () => {
    if (++loaded === 3) {
      sprites.knightWhite = makeVariant(sprites.knight, 'white');
      sprites.dummyWhite = makeVariant(sprites.dummy, 'white');
      sprites.dummyDark = makeVariant(sprites.dummy, 'dark');
      sprites.ready = true;
    }
  };
}
