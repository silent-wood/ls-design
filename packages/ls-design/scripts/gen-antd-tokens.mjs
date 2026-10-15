#!/usr/bin/env node
/**
 * 从 antd 6.6.6 导出设计令牌，生成 ls-design 的两份令牌文件：
 *
 *   src/styles/tokens/seed.less     —— 与主题无关的原始令牌（尺寸 / 字号 / 行高 / 动效 / 层级）
 *   src/styles/tokens/palette.less  —— 品牌色 10 级色阶 × 亮暗两套（会被 JS 运行时覆盖）
 *
 * ⚠️ 这两个文件是【生成物】，不要手改 —— 改动会在下次 `pnpm tokens` 时丢失。
 *    需要调整取值逻辑请改本脚本。
 *
 * 为什么用脚本而不是手抄：
 *   像素级对齐的本质是数值级对齐。手抄 100+ 个令牌必然出错，且 antd 升 minor 后无从 diff。
 *   脚本把「基准版本」固定在 antd 的 devDependency 上，升级即为显式的 diff。
 *
 * 用法：
 *   pnpm tokens          # 在 packages/ls-design 下执行
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate } from '@ant-design/colors';
import { theme } from 'antd';

/** 基准品牌色。与 antd 默认 seed 一致，保证「未换色时」与 antd 逐像素相同。 */
const SEED_PRIMARY = '#1677ff';

/**
 * 暗色色阶生成时必须传的底色。
 * ⚠️ 实测：传 '#000' 会得到与 antd MapToken 完全不匹配的一整套色阶，且不报错。
 */
const DARK_BG = '#141414';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/styles/tokens');

const light = theme.getDesignToken({ algorithm: theme.defaultAlgorithm, token: { colorPrimary: SEED_PRIMARY } });
const dark = theme.getDesignToken({ algorithm: theme.darkAlgorithm, token: { colorPrimary: SEED_PRIMARY } });
const compact = theme.getDesignToken({
  algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm],
  token: { colorPrimary: SEED_PRIMARY },
});

const paletteLight = generate(SEED_PRIMARY);
const paletteDark = generate(SEED_PRIMARY, { theme: 'dark', backgroundColor: DARK_BG });

/* ──────────────────────────────────────────────────────────────
 * 自校验：色阶索引映射
 *
 * 这是本方案最易错的地方——暗色的索引相对亮色是【反向】的。
 * 所以不靠人记，靠断言。任一项不匹配就中止，避免生成一份错误的令牌。
 * ────────────────────────────────────────────────────────────── */
const errors = [];

const assertIndex = (label, palette, index, actual) => {
  const expected = palette[index - 1];
  if (String(expected).toLowerCase() !== String(actual).toLowerCase()) {
    errors.push(`${label}  色阶[${index}] 应为 ${actual}，实际 ${expected}`);
  }
};

// 亮色：索引与 MapToken 一一对应，1..7
const LIGHT_MAP = {
  colorPrimaryBg: 1,
  colorPrimaryBgHover: 2,
  colorPrimaryBorder: 3,
  colorPrimaryBorderHover: 4,
  colorPrimaryHover: 5,
  colorPrimary: 6,
  colorPrimaryActive: 7,
};
for (const [tokenName, index] of Object.entries(LIGHT_MAP)) {
  assertIndex(`light.${tokenName}`, paletteLight, index, light[tokenName]);
}

// 暗色：色阶是「深 → 浅」排列，索引越大越亮，因此 hover / active 与亮色相反
const DARK_MAP = {
  colorPrimaryBg: 3,
  colorPrimaryBgHover: 4,
  colorPrimaryBorder: 3, // 与 Bg 同阶
  colorPrimaryBorderHover: 4,
  colorPrimaryHover: 7, // ← 亮色是 5
  colorPrimary: 6,
  colorPrimaryActive: 5, // ← 亮色是 7
};
for (const [tokenName, index] of Object.entries(DARK_MAP)) {
  assertIndex(`dark.${tokenName}`, paletteDark, index, dark[tokenName]);
}

if (errors.length > 0) {
  console.error('\n✖ 色阶索引校验失败，已中止生成。antd 的映射关系可能已变更：\n');
  for (const line of errors) console.error(`  · ${line}`);
  console.error('');
  process.exit(1);
}

/* ──────────────────────────────────────────────────────────────
 * 工具函数
 * ────────────────────────────────────────────────────────────── */

/** 生成物头部。所有输出文件共用，明确「不要手改」与取值来源。 */
const banner = (title, extra) => `/**
 * ${title}
 *
 * 由 scripts/gen-antd-tokens.mjs 从 antd@${ANTD_VERSION} 生成，请勿手改。
 * 重新生成：pnpm tokens
 *
${extra} */`;

/** 数字 → 带 px 的 CSS 值。antd 的尺寸令牌是纯数字，必须补单位。 */
const px = (v) => `${v}px`;

/** 输出一个 CSS 变量声明行。 */
const decl = (name, value, comment) =>
  `  --ls-${name}: ${value};${comment ? ` // ${comment}` : ''}`;

/** 把一组 [变量名, 值, 注释?] 渲染成块。 */
const block = (rows) => rows.map(([n, v, c]) => decl(n, v, c)).join('\n');

/* ──────────────────────────────────────────────────────────────
 * seed.less —— 与主题无关的原始令牌
 * ────────────────────────────────────────────────────────────── */

const sizeScale = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
const sizeVars = {
  xxs: light.sizeXXS,
  xs: light.sizeXS,
  sm: light.sizeSM,
  md: light.size,
  lg: light.sizeLG,
  xl: light.sizeXL,
  xxl: light.sizeXXL,
};

const paddingScale = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl'];
const paddingVars = {
  xxs: light.paddingXXS,
  xs: light.paddingXS,
  sm: light.paddingSM,
  md: light.padding,
  lg: light.paddingLG,
  xl: light.paddingXL,
};

const seedContent = `
:root {
  /* ── 控件高度 ─────────────────────────────────────────────── */
${block([
  ['control-height-xs', px(light.controlHeightXS), 'controlHeightXS'],
  ['control-height-sm', px(light.controlHeightSM), 'controlHeightSM'],
  ['control-height', px(light.controlHeight), 'controlHeight'],
  ['control-height-lg', px(light.controlHeightLG), 'controlHeightLG'],
])}

  /* ── 尺寸阶梯（sizeUnit / sizeStep 均为 4，故为 4 的倍数） ── */
${block([
  ['size-unit', px(light.sizeUnit), 'sizeUnit'],
  ['size-step', px(light.sizeStep), 'sizeStep'],
  ...sizeScale.map((k) => [`size-${k}`, px(sizeVars[k]), `size${k.toUpperCase() === 'MD' ? '' : k.toUpperCase()}`]),
])}

  /* ── 间距阶梯 ─────────────────────────────────────────────── */
${block([
  ...paddingScale.map((k) => [`padding-${k}`, px(paddingVars[k]), `padding${k === 'md' ? '' : k.toUpperCase()}`]),
  ['margin-xxs', px(light.marginXXS), 'marginXXS'],
  ['margin-xs', px(light.marginXS), 'marginXS'],
  ['margin-sm', px(light.marginSM), 'marginSM'],
  ['margin-md', px(light.margin), 'margin'],
  ['margin-lg', px(light.marginLG), 'marginLG'],
  ['margin-xl', px(light.marginXL), 'marginXL'],
])}

  /* ── 内容区内边距（容器用，非控件用） ─────────────────────── */
${block([
  ['padding-content-horizontal', px(light.paddingContentHorizontal), 'paddingContentHorizontal'],
  ['padding-content-horizontal-lg', px(light.paddingContentHorizontalLG), 'paddingContentHorizontalLG'],
  ['padding-content-vertical', px(light.paddingContentVertical), 'paddingContentVertical'],
])}

  /* ── 圆角 ─────────────────────────────────────────────────── */
${block([
  ['radius-xs', px(light.borderRadiusXS), 'borderRadiusXS'],
  ['radius-sm', px(light.borderRadiusSM), 'borderRadiusSM'],
  ['radius', px(light.borderRadius), 'borderRadius'],
  ['radius-lg', px(light.borderRadiusLG), 'borderRadiusLG'],
])}

  /* ── 字号 ─────────────────────────────────────────────────── */
${block([
  ['font-size-sm', px(light.fontSizeSM), 'fontSizeSM'],
  ['font-size', px(light.fontSize), 'fontSize'],
  ['font-size-lg', px(light.fontSizeLG), 'fontSizeLG'],
  ['font-size-xl', px(light.fontSizeXL), 'fontSizeXL'],
  ['font-size-heading-1', px(light.fontSizeHeading1), 'fontSizeHeading1'],
  ['font-size-heading-2', px(light.fontSizeHeading2), 'fontSizeHeading2'],
  ['font-size-heading-3', px(light.fontSizeHeading3), 'fontSizeHeading3'],
  ['font-size-heading-4', px(light.fontSizeHeading4), 'fontSizeHeading4'],
  ['font-size-heading-5', px(light.fontSizeHeading5), 'fontSizeHeading5'],
])}

  /* ── 行高（无单位倍数） ───────────────────────────────────── */
${block([
  ['line-height-sm', light.lineHeightSM, 'lineHeightSM'],
  ['line-height', light.lineHeight, 'lineHeight'],
  ['line-height-lg', light.lineHeightLG, 'lineHeightLG'],
  ['line-height-heading-1', light.lineHeightHeading1, 'lineHeightHeading1'],
  ['line-height-heading-2', light.lineHeightHeading2, 'lineHeightHeading2'],
  ['line-height-heading-3', light.lineHeightHeading3, 'lineHeightHeading3'],
  ['line-height-heading-4', light.lineHeightHeading4, 'lineHeightHeading4'],
  ['line-height-heading-5', light.lineHeightHeading5, 'lineHeightHeading5'],
])}

  /* ── 线宽 ─────────────────────────────────────────────────── */
${block([
  ['line-width', px(light.lineWidth), 'lineWidth'],
  ['line-width-bold', px(light.lineWidthBold), 'lineWidthBold'],
  ['line-width-focus', px(light.lineWidthFocus), 'lineWidthFocus'],
])}

  /* ── 动效 ─────────────────────────────────────────────────── */
${block([
  ['motion-duration-fast', light.motionDurationFast, 'motionDurationFast'],
  ['motion-duration-mid', light.motionDurationMid, 'motionDurationMid'],
  ['motion-duration-slow', light.motionDurationSlow, 'motionDurationSlow'],
  ['motion-ease-out', light.motionEaseOut, 'motionEaseOut'],
  ['motion-ease-in-out', light.motionEaseInOut, 'motionEaseInOut'],
  ['motion-ease-in-out-circ', light.motionEaseInOutCirc, 'motionEaseInOutCirc'],
  ['motion-ease-out-back', light.motionEaseOutBack, 'motionEaseOutBack'],
])}

  /* ── 层级 ─────────────────────────────────────────────────── */
${block([['z-index-popup-base', light.zIndexPopupBase, 'zIndexPopupBase']])}

  /* ── 不透明度 ─────────────────────────────────────────────── */
${block([
  ['opacity-loading', light.opacityLoading, 'opacityLoading'],
  ['opacity-image', light.opacityImage, 'opacityImage'],
])}
}
`.trim();

/* ──────────────────────────────────────────────────────────────
 * 密度覆盖值
 *
 * antd 的 compactAlgorithm 会改动数十个令牌。但按项目约定，密度轴只重写
 * 「控件高度 / 内边距 / 字号」三类 —— 这是控件外观的实际变量，其余跟随会让
 * 令牌表膨胀，且与主题轴耦合。
 * 取值来自 compactAlgorithm 实测，不是估算。
 * ────────────────────────────────────────────────────────────── */
const densityContent = `
/**
 * 紧凑密度。覆盖的是 seed 层变量，因此所有引用它们的组件令牌自动跟随。
 * 唯一例外：Button 的 paddingInlineSM 在 antd 里是字面量 '8 - lineWidth'，
 * 不随密度变化，故此处也不覆盖它。
 */
[data-ls-density='compact'] {
${block([
  ['control-height-xs', px(compact.controlHeightXS), '32 → 28 一族的起点'],
  ['control-height-sm', px(compact.controlHeightSM), ''],
  ['control-height', px(compact.controlHeight), ''],
  ['control-height-lg', px(compact.controlHeightLG), ''],
  ['padding-content-horizontal', px(compact.paddingContentHorizontal), ''],
  ['padding-content-horizontal-lg', px(compact.paddingContentHorizontalLG), ''],
  ['padding-content-vertical', px(compact.paddingContentVertical), ''],
  ['font-size', px(compact.fontSize), ''],
  ['font-size-sm', px(compact.fontSizeSM), ''],
  ['font-size-lg', px(compact.fontSizeLG), ''],
  ['size-unit', px(compact.sizeUnit), ''],
  ['size-step', px(compact.sizeStep), ''],
])}
}
`.trim();

const seedFile = `${banner(
  '基础令牌（seed）—— 与主题无关的原始值',
  ` * 这一层的值在亮色 / 暗色 / 任意品牌色下都相同，因此不需要按主题分块。\n * 语义令牌（alias.less）只引用本层的变量，组件只引用语义令牌。`,
)}

${seedContent}

${densityContent}
`;

/* ──────────────────────────────────────────────────────────────
 * palette.less —— 品牌色色阶
 * ────────────────────────────────────────────────────────────── */

const ladder = (palette) => palette.map((c) => `  --ls-primary-${palette.indexOf(c) + 1}: ${c};`).join('\n');
const ladderIndexed = (palette) =>
  palette.map((c, i) => `  --ls-primary-${i + 1}: ${c};`).join('\n');

const paletteFile = `${banner(
  '品牌色色阶（10 级）× 亮暗两套',
  ` * 这是整个令牌体系里【唯一】会被 JS 在运行时覆盖的一层。
 * src/theme/ThemeProvider.tsx 用 @ant-design/colors 的 generate() 按当前品牌色
 * 重新算出这两套色阶，以内联变量形式写在挂载 data-ls-theme 的同一个元素上。
 *
 * 本文件的作用是【首屏兜底】：React 尚未挂载、或用户从未换过品牌色时，
 * 让页面有颜色可用。取值为 antd ${'6.6.6'} 的默认品牌色 ${SEED_PRIMARY}。
 *
 * 契约：JS 只负责 --ls-primary-1..10 这 10 个变量，语义层及以下一个字都不动。
 *
 * ── 索引映射（由脚本断言校验，与 antd MapToken 逐项比对）────────
 * 语义令牌            亮色索引   暗色索引
 * colorPrimaryBg         1         3
 * colorPrimaryBgHover    2         4
 * colorPrimaryBorder     3         3
 * colorPrimaryBorderHover 4        4
 * colorPrimaryHover      5         7   ← 暗色反向
 * colorPrimary            6        6
 * colorPrimaryActive     7         5   ← 暗色反向
 *
 * ⚠️ 暗色色阶是「深 → 浅」排列（1..5 偏暗，6..10 偏亮），
 *    所以 hover 走高阶、active 走低阶，与亮色完全相反。绝不能套用亮色表。
 * ⚠️ 暗色下 --ls-primary-6 不等于传入的品牌色（${SEED_PRIMARY} → ${paletteDark[5]}），
 *    这是 antd 算法本身的行为，不是 bug。
 */

:root,
[data-ls-theme='light'] {
${ladderIndexed(paletteLight)}
}

[data-ls-theme='dark'] {
${ladderIndexed(paletteDark)}
}
`;

/* ──────────────────────────────────────────────────────────────
 * 写入
 * ────────────────────────────────────────────────────────────── */

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'seed.less'), seedFile, 'utf8');
writeFileSync(resolve(OUT_DIR, 'palette.less'), paletteFile, 'utf8');

console.log('✔ 令牌生成完成');
console.log(`  seed.less     ${seedFile.split('\n').length} 行`);
console.log(`  palette.less  ${paletteFile.split('\n').length} 行`);
console.log('');
console.log('  色阶索引校验：亮色 7 项 + 暗色 7 项，全部命中');
console.log(`  light primary  = ${paletteLight.join(' ')}`);
console.log(`  dark  primary  = ${paletteDark.join(' ')}`);
