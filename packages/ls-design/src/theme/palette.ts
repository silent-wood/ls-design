/**
 * 品牌色阶的运行时生成
 *
 * 这是整个主题机制里唯一需要 JS 参与的部分。原因：antd 的色阶不是「把主色调亮调暗」，
 * 而是一套带感知校正的算法（色相微调 + 明度阶梯 + 暗色反向排列）。
 * 用 CSS 的 color-mix() 或 filter 近似出来的色阶，和 antd 会长得完全不像，
 * 所以这里直接复用 antd 自己依赖的 @ant-design/colors。
 */
import { generate } from '@ant-design/colors';

import { getAlphaColor } from '../utils/color';

import type { BrandPalette, BrandPalettes, ResolvedThemeMode } from './types';

/**
 * 暗色色阶生成时必须传的底色。
 *
 * ⚠️ 这不是可调项，实测值。传 '#000' 不会报错，但会得到一整套与 antd MapToken
 *    不匹配的色阶 —— 表现为暗色下所有主色系控件偏亮偏艳，而排查时没有任何报错线索。
 */
export const DARK_BG_CONTAINER = '#141414';

/** 亮色容器底色。同上，与 --ls-color-bg-container 的亮色取值一致。 */
export const LIGHT_BG_CONTAINER = '#ffffff';

/**
 * 色阶里哪一级是「主色底」（antd 的 colorPrimaryBg）。
 *
 * 亮色的色阶是浅→深，第 1 级最浅，所以主色底取索引 0。
 * 暗色反过来，索引 2（即 --ls-primary-3）才是主色底。
 * 这个不对称与 tokens/palette.less 里那张索引对照表是同一份知识。
 */
const PRIMARY_BG_INDEX: Record<ResolvedThemeMode, number> = {
  light: 0,
  dark: 2,
};

/** 取一套色阶 + 由它派生的主色阴影色。 */
function buildPalette(palette: string[], mode: ResolvedThemeMode): BrandPalette {
  const backgroundColor = mode === 'dark' ? DARK_BG_CONTAINER : LIGHT_BG_CONTAINER;
  return {
    palette,
    controlOutline: getAlphaColor(palette[PRIMARY_BG_INDEX[mode]], backgroundColor),
  };
}

/**
 * 按品牌色算出亮暗两套色阶。
 *
 * 两套一起算而不是按需算，理由是持久化：防闪屏脚本需要「不论当前是哪套模式，
 * 都能直接从缓存回填」，所以缓存里必须两套俱全。单次 generate() 的开销在
 * 微秒量级，多算一套不值得为它引入分支。
 *
 * @param primaryColor 任意合法颜色串（hex / rgb / hsl 均可，由 @ant-design/colors 解析）
 */
export function generateBrandPalettes(primaryColor: string): BrandPalettes {
  return {
    light: buildPalette(generate(primaryColor), 'light'),
    // 暗色必须带上 backgroundColor，见 DARK_BG_CONTAINER 的说明。
    dark: buildPalette(generate(primaryColor, { theme: 'dark', backgroundColor: DARK_BG_CONTAINER }), 'dark'),
  };
}
