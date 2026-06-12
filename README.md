# ⚔️ Juice Lab · 打击感实验室

**从"死鱼"到"上头",一步一步感受打击感是怎么叠出来的。**

一个零依赖的交互式 demo:一名剑士、一个木桩假人,从毫无反馈的"裸命中"开始,
逐层叠加 10 层打击感技术 — 每层都能独立开关、自由组合、A/B 对比。

> 所有参数溯源自《吸血鬼幸存者》反编译研究([vs-anatomy](https://github.com/bitqs/vs-anatomy))、
> 《Hades》Lua 源码拆解,以及樱井政博 / Vlambeer GDC / 日式作画理论 / CHI 实证研究。

## 10 层技术阶梯

| # | 技术 | 关键参数 |
|---|------|---------|
| 1 | 闪白 tintFill | 命中 120ms / 死亡 60ms |
| 2 | 顿帧 hitstop | 普攻 0 / 暴击 55ms / 处决 80ms |
| 3 | 击退 + 死亡弹飞 | velocity = dir × (−KB) |
| 4 | 伤害数字 | ±12px 随机偏移,弹跳缓动 |
| 5 | 命中贴片 + 冲击波 | 星形 90ms + 扩散环 180ms |
| 6 | 死亡粒子爆裂 | 12 粒放射 + 重力 |
| 7 | 屏震(稀缺资源) | 仅击杀 6px / 暴击 3px,普攻 **0** |
| 8 | 音效分层 | WebAudio 合成:重 = 低频 |
| 9 | タメツメ | 慢蓄 180ms → 瞬斩 50ms |
| 10 | 过载滑杆 | 倒U曲线:juice 过量 = 可读性死亡 |

## 本地运行

```bash
python3 -m http.server 8765
# 打开 http://localhost:8765
```

零构建,零依赖,vanilla JS + Canvas 2D。

## 项目结构

```
js/scene.js   场景与规则(这里没有任何"手感")
js/juice.js   10 个技术模块,统一钩子 onHit/onKill/onUpdate/onDraw
js/steps.js   每步说明文案 + 参数 + 出处
js/audio.js   WebAudio 实时合成音效(零音频文件)
js/main.js    游戏循环 / 顿帧时间控制 / 步进状态机
```

设计哲学呼应研究结论:**手感靠参数化,而非美术帧** — 全项目没有一张贴图。

## License

MIT
