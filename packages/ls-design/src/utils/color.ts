/**
 * 颜色工具（与框架无关的纯函数）
 *
 * 目前只有一件事：把「一个不透明的浅色」翻译成「等价的半透明色」。
 *
 * ── 为什么需要它 ────────────────────────────────────────────────────────
 * antd 里 Button 的主色阴影不是固定色，而是
 *   primaryShadow = `0 2px 0 ${getAlphaColor(colorPrimaryBg, colorBgContainer)}`
 * 即「把 colorPrimaryBg 这个很浅的底色，表示成叠加在容器底色上等价的一个半透明色」。
 * 半透明是必要的：阴影叠在页面底色上时，必须透出下层而不是糊上一块实色。
 *
 * 品牌色是运行时可变的三条轴之一，所以这个值不能写死 —— 换色时必须跟着重算。
 * 与其把 antd 的 colorPrimaryBg 抄一份到 JS 里，不如从 DOM 读当前生效的
 * --ls-color-bg-container，再套同一个算法算出来。这样 JS 侧零重复定义。
 *
 * 算法逐行对齐 antd/lib/theme/util/getAlphaColor.js：
 * 从 α=0.01 起以 0.01 步长递增，取第一个能让 r/g/b 三个分量都落回 [0,255]
 * 的 α。为什么必须同序同精度：解不唯一时 antd 取的是最小可行 α，
 * 用别的 α 会得到视觉等价但数值不同的字符串，diff 时无法判定是否回归。
 */

/** 解析 #rgb / #rrggbb / #rrggbbaa 为 0-255 分量与 0-1 的 alpha。 */
function parseHex(hex: string): { r: number; g: number; b: number; a: number } | null {
  const match = /^#?([0-9a-f]{3,8})$/i.exec(hex.trim());
  if (!match) return null;

  let value = match[1];
  if (value.length === 3 || value.length === 4) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (value.length !== 6 && value.length !== 8) return null;

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
    a: value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1,
  };
}

const isStable = (channel: number) => channel >= 0 && channel <= 255;

/**
 * 求一个半透明色，使其叠加在 `backgroundColor` 上后与 `frontColor` 等价。
 *
 * @param frontColor     目标实色（如 #e6f4ff）
 * @param backgroundColor 衬底（如 #ffffff）
 * @returns 形如 `rgba(5,145,255,0.1)`；frontColor 本身已半透明或无解时原样返回
 */
export function getAlphaColor(frontColor: string, backgroundColor: string): string {
  const front = parseHex(frontColor);
  const back = parseHex(backgroundColor);

  // antd 的行为：入参本身已是半透明就原样返回，不做二次求解。
  if (!front || front.a < 1) return frontColor;
  if (!back) return frontColor;

  for (let alpha = 0.01; alpha <= 1.0001; alpha += 0.01) {
    const r = Math.round((front.r - back.r * (1 - alpha)) / alpha);
    const g = Math.round((front.g - back.g * (1 - alpha)) / alpha);
    const b = Math.round((front.b - back.b * (1 - alpha)) / alpha);

    if (isStable(r) && isStable(g) && isStable(b)) {
      // 保留两位小数，与 antd 的 `Math.round(fA * 100) / 100` 一致。
      const rounded = Math.round(alpha * 100) / 100;
      return `rgba(${r},${g},${b},${rounded})`;
    }
  }

  return `rgba(${front.r},${front.g},${front.b},1)`;
}
