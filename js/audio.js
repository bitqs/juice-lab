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

  if (kind === 'hit') {
    // 中频三角波 60ms,带一点点噪声脆感
    tone(a, t, 'triangle', 320, 180, 0.06, 0.25);
    noise(a, t, 0.03, 0.08);
  } else if (kind === 'crit') {
    // 低频方波 120ms + 噪声 — "重"在低频
    tone(a, t, 'square', 140, 70, 0.12, 0.35);
    noise(a, t, 0.06, 0.18);
  } else if (kind === 'kill') {
    // 下扫 200ms:从 400Hz 滑到 40Hz,终结感
    tone(a, t, 'sawtooth', 400, 40, 0.2, 0.3);
    noise(a, t, 0.1, 0.2);
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
