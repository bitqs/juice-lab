// WebAudio 合成音效,零音频文件。
// 分层哲学(Vlambeer GDC 2013):重击 = 低频;轻击 = 中频短促;击杀 = 下扫收尾。

let ac = null;

function ctx() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

export function sfx(kind) {
  const a = ctx();
  const t = a.currentTime;
  const pv = 0.92 + Math.random() * 0.16;   // 音调随机 ±8%:每刀不重样(Vlambeer)

  if (kind === 'hit') {
    // 中频三角波 60ms,带一点点噪声脆感
    tone(a, t, 'triangle', 320 * pv, 180 * pv, 0.06, 0.25);
    noise(a, t, 0.03, 0.08);
  } else if (kind === 'crit') {
    // 低频方波 120ms + 噪声 — "重"在低频
    tone(a, t, 'square', 140 * pv, 70 * pv, 0.12, 0.35);
    noise(a, t, 0.06, 0.18);
  } else if (kind === 'kill') {
    // 下扫 200ms:从 400Hz 滑到 40Hz,终结感
    tone(a, t, 'sawtooth', 400, 40, 0.2, 0.3);
    noise(a, t, 0.1, 0.2);
  } else if (kind === 'ultCharge') {
    // 大招蓄力:上扫 550ms,越升越紧
    tone(a, t, 'sawtooth', 60, 880, 0.55, 0.18);
    tone(a, t + 0.1, 'sine', 120, 1200, 0.45, 0.12);
  } else if (kind === 'slash') {
    // 斩线:高频噪声短爆
    noise(a, t, 0.07, 0.3);
    tone(a, t, 'triangle', 1800, 600, 0.06, 0.15);
  } else if (kind === 'whiff') {
    // 挥空:闷风声,明显比命中"空"
    noise(a, t, 0.09, 0.12);
    tone(a, t, 'sine', 220, 140, 0.08, 0.06);
  } else if (kind === 'shout') {
    // 招式名吼出:太鼓重击 + 中频吼(锯齿短扫)
    tone(a, t, 'sine', 90, 50, 0.3, 0.5);
    tone(a, t, 'sawtooth', 300, 150, 0.25, 0.22);
    noise(a, t, 0.12, 0.3);
  } else if (kind === 'thunder') {
    // 雷:噼啪裂响 + 低频滚雷
    noise(a, t, 0.05, 0.5);
    noise(a, t + 0.05, 0.4, 0.25);
    tone(a, t + 0.04, 'sine', 70, 30, 0.5, 0.35);
  } else if (kind === 'ultBoom') {
    // 终镇:亚低频长鸣 + 噪声尾
    tone(a, t, 'sine', 80, 32, 0.5, 0.5);
    tone(a, t, 'square', 110, 45, 0.3, 0.2);
    noise(a, t, 0.25, 0.3);
  }
}

function tone(a, t, type, f0, f1, dur, gain) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur);
}

function noise(a, t, dur, gain) {
  const len = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const g = a.createGain();
  src.buffer = buf;
  g.gain.value = gain;
  src.connect(g).connect(a.destination);
  src.start(t);
}
