#!/usr/bin/env node
/**
 * 从 antd 生成 ls-design 的两份【生成物】令牌文件：
 *
 *   src/styles/tokens/seed.less     —— 与主题无关的原始令牌（尺寸 / 间距 / 圆角 / 字号 / 行高 / 动效）
 *   src/styles/tokens/palette.less  —— 品牌色 10 级色阶 × 亮暗两套（运行时会被 JS 覆盖）
 *
 * ⚠️ 这两个文件不要手改 —— 改动会在下次 `pnpm tokens` 时丢失。要调逻辑请改本脚本。
 *
 * 为什么用脚本而不是手抄：
 *   像素级对齐的本质是数值级对齐。手抄 100+ 个令牌必然出错，且 antd 升 minor 后无从 diff。
 *   脚本把「基准版本」锚定在 devDependencies 里的 antd 上，升级即为一次显式的 diff。
 *
 * 用法（在 packages/ls-design 下）：
 *   pnpm tokens
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate } from '@ant-design/colors';
import { theme } from 'antd';

const require = createRequire(import.meta.url);

/** 基准品牌色。与 antd 默认 seed 一致，保证「未换色时」与 antd 逐像素相同。 */
const SEED_PRIMARY = '#1677ff';

/**
 * 暗色色阶生成时必须传的底色。
 * ⚠️ 实测：传 '#000' 会得到与 antd MapToken 完全不匹配的一整套色阶，且不报错。
 *    必须是 antd 暗色主题的容器底色 #141414。
 */
const DARK_BG = '#141414';

/** 从已安装的 antd 读出真实版本号写进文件头 —— 避免脚本里的版本号与实际基线脱节。 */
const ANTD_VERSION = JSON.parse(
  readFileSync(require.resolve('antd/package.json'), 'utf8'),
).version;

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '../src/styles/tokens');

/* ──────────────────────────────────────────────────────────────
 * 1. 取数：antd 的三套 algorithm
 * ────────────────────────────────────────────────────────────── */

const opts = { token: { colorPrimary: SEED_PRIMARY } };

const light = theme.getDesignToken({ ...opts, algorithm: theme.defaultAlgorithm });
const dark = theme.getDesignToken({ ...opts, algorithm: theme.darkAlgorithm });
const compact = theme.getDesignToken({
  ...opts,
  algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm],
});

const paletteLight = generate(SEED_PRIMARY);
const paletteDark = generate(SEED_PRIMARY, { theme: 'dark', backgroundColor: DARK_BG });

/* ──────────────────────────────────────────────────────────────
 * 2. 自校验：色阶索引映射
 *
 * 这是本方案最易错的地方 —— 暗色的索引相对亮色是【反向】的。
 * 所以不靠人记，靠断言。任一项不匹配就中止，绝不生成一份静默错误的令牌。
 * ────────────────────────────────────────────────────────────── */

const errors = [];

const assertIndex = (label, palette, index, actual) => {
  const expected = palette[index - 1];
  if (String(expected).toLowerCase() !== String(actual).toLowerCase()) {
    errors.push(`${label}  语义令牌色阶[${index}] 期望 ${actual}，实际 ${expected}`);
  }
};

// 亮色：索引与 MapToken 顺序一致
const LIGHT_MAP = {
  colorPrimaryBg: 1,
  colorPrimaryBgHover: 2,
  colorPrimaryBorder: 3,
  colorPrimaryBorderHover: 4,
  colorPrimaryHover: 5,
  colorPrimary: 6,
  colorPrimaryActive: 7,
};

// 暗色：色阶是「深 → 浅」排列，索引越大越亮，因此 hover / active 与亮色相反
const DARK_MAP = {
  colorPrimaryBg: 3,
  colorPrimaryBgHover: 4,
  colorPrimaryBorder: 3,
  colorPrimaryBorderHover: 4,
  colorPrimaryHover: 7, // ← 亮色为 5
  colorPrimary: 6,
  colorPrimaryActive: 5, // ← 亮色为 7
};

for (const [tokenName, index] of Object.entries(LIGHT_MAP)) {
  assertIndex(`light.${tokenName}`, paletteLight, index, light[tokenName]);
}
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
 * 3. 输出工具
 * ────────────────────────────────────────────────────────────── */

const banner = (title, lines = []) =>
  [
    '/**',
    ` * ${title}`,
    ' *',
    ` * 由 scripts/gen-antd-tokens.mjs 从 antd@${ANTD_VERSION} 生成，请勿手改。`,
    ' * 重新生成：pnpm tokens',
    ' *',
    ...lines.map((l) => (l ? ` * ${l}` : ' *')),
    ' */',
  ].join('\n');

/** 数字 → 带 px 的 CSS 值。antd 的尺寸令牌是纯数字，必须补单位。 */
const px = (v) => `${v}px`;

/** 渲染一组 [变量名, 值, 注释?] 为 CSS 变量声明块（不含选择器）。 */
const block = (rows, indent = '  ') =>
  rows
    .map(([name, value, comment]) =>
      comment === undefined || comment === ''
        ? `${indent}--ls-${name}: ${value};`
        : `${indent}--ls-${name}: ${value};${' '.repeat(Math.max(1, 44 - indent.length - `--ls-${name}: ${value};`.length))}// ${comment}`,
    )
    .join('\n');

/* ──────────────────────────────────────────────────────────────
 * 4. seed.less —— 与主题无关的原始令牌
 *
 * 这一层在亮色 / 暗色 / 任意品牌色下取值都相同，所以不需要按主题分块。
 * 语义令牌（alias.less）只引用本层，组件只引用语义令牌。
 * ────────────────────────────────────────────────────────────── */

const SEED_GROUPS = [
  [
    '控件高度',
    [
      ['control-height-xs', px(light.controlHeightXS), 'controlHeightXS'],
      ['control-height-sm', px(light.controlHeightSM), 'controlHeightSM'],
      ['control-height', px(light.controlHeight), 'controlHeight'],
      ['control-height-lg', px(light.controlHeightLG), 'controlHeightLG'],
    ],
  ],
  [
    '尺寸阶梯（sizeUnit 与 sizeStep 均为 4，故全是 4 的倍数）',
    [
      ['size-unit', px(light.sizeUnit), 'sizeUnit'],
      ['size-step', px(light.sizeStep), 'sizeStep'],
      ['size-xxs', px(light.sizeXXS), 'sizeXXS'],
      ['size-xs', px(light.sizeXS), 'sizeXS'],
      ['size-sm', px(light.sizeSM), 'sizeSM'],
      ['size-md', px(light.size), 'size'],
      ['size-lg', px(light.sizeLG), 'sizeLG'],
      ['size-xl', px(light.sizeXL), 'sizeXL'],
      ['size-xxl', px(light.sizeXXL), 'sizeXXL'],
    ],
  ],
  [
    '间距阶梯（供组件消费；md 对应 antd 的 padding / margin 本体）',
    [
      ['padding-xxs', px(light.paddingXXS), 'paddingXXS'],
      ['padding-xs', px(light.paddingXS), 'paddingXS'],
      ['padding-sm', px(light.paddingSM), 'paddingSM'],
      ['padding-md', px(light.padding), 'padding'],
      ['padding-lg', px(light.paddingLG), 'paddingLG'],
      ['padding-xl', px(light.paddingXL), 'paddingXL'],
      ['margin-xxs', px(light.marginXXS), 'marginXXS'],
      ['margin-xs', px(light.marginXS), 'marginXS'],
      ['margin-sm', px(light.marginSM), 'marginSM'],
      ['margin-md', px(light.margin), 'margin'],
      ['margin-lg', px(light.marginLG), 'marginLG'],
      ['margin-xl', px(light.marginXL), 'marginXL'],
    ],
  ],
  [
    '内容区内边距（容器用，非控件用）',
    [
      ['padding-content-horizontal', px(light.paddingContentHorizontal), 'paddingContentHorizontal'],
      ['padding-content-horizontal-lg', px(light.paddingContentHorizontalLG), 'paddingContentHorizontalLG'],
      ['padding-content-vertical', px(light.paddingContentVertical), 'paddingContentVertical'],
    ],
  ],
  [
    '圆角',
    [
      ['radius-xs', px(light.borderRadiusXS), 'borderRadiusXS'],
      ['radius-sm', px(light.borderRadiusSM), 'borderRadiusSM'],
      ['radius', px(light.borderRadius), 'borderRadius'],
      ['radius-lg', px(light.borderRadiusLG), 'borderRadiusLG'],
    ],
  ],
  [
    '字体',
    [
      // ⚠️ 必须与 antd 逐字符一致。字宽不同会让所有文本的横向位置偏移，
      //    这是「像素级对齐」最常失败的地方。注意 antd 的值里带换行，这里折成单行。
      ['font-family', light.fontFamily.replace(/\s*\n\s*/g, ' '), 'fontFamily'],
      ['font-family-code', light.fontFamilyCode, 'fontFamilyCode'],
    ],
  ],
  [
    '字号',
    [
      ['font-size-sm', px(light.fontSizeSM), 'fontSizeSM'],
      ['font-size', px(light.fontSize), 'fontSize'],
      ['font-size-lg', px(light.fontSizeLG), 'fontSizeLG'],
      ['font-size-xl', px(light.fontSizeXL), 'fontSizeXL'],
      ['font-size-heading-1', px(light.fontSizeHeading1), 'fontSizeHeading1'],
      ['font-size-heading-2', px(light.fontSizeHeading2), 'fontSizeHeading2'],
      ['font-size-heading-3', px(light.fontSizeHeading3), 'fontSizeHeading3'],
      ['font-size-heading-4', px(light.fontSizeHeading4), 'fontSizeHeading4'],
      ['font-size-heading-5', px(light.fontSizeHeading5), 'fontSizeHeading5'],
    ],
  ],
  [
    '行高（无单位倍数）',
    [
      ['line-height-sm', light.lineHeightSM, 'lineHeightSM'],
      ['line-height', light.lineHeight, 'lineHeight'],
      ['line-height-lg', light.lineHeightLG, 'lineHeightLG'],
      ['line-height-heading-1', light.lineHeightHeading1, 'lineHeightHeading1'],
      ['line-height-heading-2', light.lineHeightHeading2, 'lineHeightHeading2'],
      ['line-height-heading-3', light.lineHeightHeading3, 'lineHeightHeading3'],
      ['line-height-heading-4', light.lineHeightHeading4, 'lineHeightHeading4'],
      ['line-height-heading-5', light.lineHeightHeading5, 'lineHeightHeading5'],
    ],
  ],
  [
    '线宽',
    [
      ['line-width', px(light.lineWidth), 'lineWidth'],
      ['line-width-bold', px(light.lineWidthBold), 'lineWidthBold'],
      ['line-width-focus', px(light.lineWidthFocus), 'lineWidthFocus'],
      ['control-outline-width', px(light.controlOutlineWidth), 'controlOutlineWidth'],
    ],
  ],
  [
    '动效',
    [
      ['motion-duration-fast', light.motionDurationFast, 'motionDurationFast'],
      ['motion-duration-mid', light.motionDurationMid, 'motionDurationMid'],
      ['motion-duration-slow', light.motionDurationSlow, 'motionDurationSlow'],
      ['motion-ease-out', light.motionEaseOut, 'motionEaseOut'],
      ['motion-ease-in-out', light.motionEaseInOut, 'motionEaseInOut'],
      ['motion-ease-in-out-circ', light.motionEaseInOutCirc, 'motionEaseInOutCirc'],
      ['motion-ease-out-back', light.motionEaseOutBack, 'motionEaseOutBack'],
    ],
  ],
  [
    '层级与不透明度',
    [
      ['z-index-popup-base', light.zIndexPopupBase, 'zIndexPopupBase'],
      ['opacity-loading', light.opacityLoading, 'opacityLoading'],
      ['opacity-image', light.opacityImage, 'opacityImage'],
    ],
  ],
];

const seedBody = SEED_GROUPS.map(
  ([title, rows]) => `  /* ── ${title} ${'─'.repeat(Math.max(2, 56 - title.length * 2))} */\n${block(rows)}`,
).join('\n\n');

/* ──────────────────────────────────────────────────────────────
 * 5. 密度覆盖
 *
 * antd 的 compactAlgorithm 会改动数十个令牌。按项目约定，密度轴只重写
 * 「控件高度 / 内边距 / 字号」三类 —— 这才是控件外观的实际变量。
 * 其余令牌跟随会让令牌表膨胀，且把密度轴和主题轴耦合成一张大表。
 * 取值全部来自 compactAlgorithm 实测，不是估算。
 * ────────────────────────────────────────────────────────────── */

const DENSITY_ROWS = [
  ['control-height-xs', px(compact.controlHeightXS), 'controlHeightXS'],
  ['control-height-sm', px(compact.controlHeightSM), 'controlHeightSM'],
  ['control-height', px(compact.controlHeight), 'controlHeight'],
  ['control-height-lg', px(compact.controlHeightLG), 'controlHeightLG'],
  ['padding-content-horizontal', px(compact.paddingContentHorizontal), 'paddingContentHorizontal'],
  ['padding-content-horizontal-lg', px(compact.paddingContentHorizontalLG), 'paddingContentHorizontalLG'],
  ['padding-content-vertical', px(compact.paddingContentVertical), 'paddingContentVertical'],
  ['font-size', px(compact.fontSize), 'fontSize'],
  ['font-size-sm', px(compact.fontSizeSM), 'fontSizeSM'],
  ['font-size-lg', px(compact.fontSizeLG), 'fontSizeLG'],
];

const seedFile = `${banner('基础令牌（seed）—— 与主题无关的原始值', [
  '本层在亮色 / 暗色 / 任意品牌色下取值都相同，所以不按主题分块。',
  '语义令牌（alias.less）只引用本层，组件只引用语义令牌。',
])}

:root {
${seedBody}
}

/**
 * 紧凑密度：覆写 seed 层变量，因此所有引用它们的语义令牌与组件自动跟随。
 * 唯一例外是 Button 的内边距，它在 antd 里是字面量而非令牌派生（见 Button.less）。
 */
[data-ls-density='compact'] {
${block(DENSITY_ROWS)}
}
`;

/* ──────────────────────────────────────────────────────────────
 * 6. palette.less —— 品牌色色阶
 * ────────────────────────────────────────────────────────────── */

const ladder = (palette) =>
  palette.map((color, i) => `  --ls-primary-${i + 1}: ${color};`).join('\n');

const paletteFile = `${banner('品牌色色阶（10 级）× 亮暗两套', [
  '这是整个令牌体系里【唯一】会被 JS 在运行时覆盖的一层。',
  'src/theme/ThemeProvider.tsx 用 @ant-design/colors 的 generate() 按当前品牌色',
  '重新算出两套色阶，以内联变量形式写到 <html> 上（与 data-ls-theme 同元素）。',
  '',
  '本文件的作用是【首屏兜底】：React 尚未挂载、或用户从未换过品牌色时，',
  `让页面有颜色可用。取值为 antd@${ANTD_VERSION} 的默认品牌色 ${SEED_PRIMARY}。`,
  '',
  '契约：JS 只负责 --ls-primary-1..10 这 10 个变量，语义层及以下一个字都不动。',
  '',
  '── 索引映射（由脚本断言校验，与 antd MapToken 逐项比对）────────',
  '语义令牌                   亮色   暗色',
  'colorPrimaryBg              1      3',
  'colorPrimaryBgHover         2      4',
  'colorPrimaryBorder          3      3',
  'colorPrimaryBorderHover     4      4',
  'colorPrimaryHover           5      7   ← 暗色反向',
  'colorPrimary                6      6',
  'colorPrimaryActive          7      5   ← 暗色反向',
  '',
  '⚠️ 暗色色阶是「深 → 浅」排列（1..5 偏暗，6..10 偏亮），',
  '   所以 hover 走高阶、active 走低阶，与亮色完全相反。绝不能套用亮色表。',
  `⚠️ 暗色下 --ls-primary-6 不等于传入的品牌色（${SEED_PRIMARY} → ${paletteDark[5]}），`,
  '   这是 antd 算法本身的行为，不是 bug。',
])}

:root,
[data-ls-theme='light'] {
${ladder(paletteLight)}
}

[data-ls-theme='dark'] {
${ladder(paletteDark)}
}
`;

/* ──────────────────────────────────────────────────────────────
 * 7. 写入
 * ────────────────────────────────────────────────────────────── */

mkdirSync(OUT_DIR, { recursive: true });

const files = [
  ['seed.less', seedFile],
  ['palette.less', paletteFile],
];

for (const [name, content] of files) {
  writeFileSync(resolve(OUT_DIR, name), content, 'utf8');
}

const lines = (s) => s.split('\n').length;

console.log(`✔ 令牌生成完成（基准 antd@${ANTD_VERSION}）\n`);
for (const [name, content] of files) {
  console.log(`  ${name.padEnd(14)}${String(lines(content)).padStart(4)} 行`);
}

console.log('\n  色阶索引校验：亮色 7 项 + 暗色 7 项，全部命中');
console.log(`  light palette  ${paletteLight.join('  ')}`);
console.log(`  dark  palette  ${paletteDark.join('  ')}`);
console.log('');
