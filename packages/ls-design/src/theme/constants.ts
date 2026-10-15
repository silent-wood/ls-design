/**
 * 主题层的共享常量
 *
 * 这里的每个字符串都是「跨进程契约」，改动会同时影响三处：
 *   1. 本文件与 ThemeProvider
 *   2. packages/ls-design/index.html 里那段同步的防闪屏脚本
 *   3. packages/ls-design/src/styles/tokens/*.less 里的选择器
 * 所以集中在一处，并用常量名而不是字面量去引用。
 */

/** 持久化键。防闪屏脚本同步读取它，因此值不能随意改（改了等于让老用户丢配置）。 */
export const THEME_STORAGE_KEY = 'ls-design-theme';

/** 主题模式属性，挂在 <html> 上。 */
export const THEME_ATTR = 'data-ls-theme';

/** 密度属性，挂在 <html> 上。 */
export const DENSITY_ATTR = 'data-ls-density';

/**
 * 默认品牌色。
 *
 * ⚠️ 与 scripts/gen-antd-tokens.mjs 里的 SEED_PRIMARY 是同一个值，
 *    两边必须一致 —— 这个值决定了「未换色时」与 antd 是否逐像素相同。
 *    之所以不做成共享常量：脚本是 .mjs 构建期运行、这里要进浏览器产物，
 *    为消除这一处重复而引入一层生成物不划算。改动时请同时改两处。
 */
export const DEFAULT_PRIMARY_COLOR = '#1677ff';

/** 品牌色阶的 CSS 变量前缀，完整形态为 --ls-primary-1 .. --ls-primary-10。 */
export const PRIMARY_VAR_PREFIX = '--ls-primary-';

/**
 * 主色阴影色的 CSS 变量名。
 * 它由 JS 按品牌色重算，所以必须能被增量覆盖 —— 这正是它不放进色阶的原因。
 */
export const CONTROL_OUTLINE_VAR = '--ls-control-outline';

/** 容器底色的 CSS 变量名。求 controlOutline 时需要把「衬底」一起喂给算法。 */
export const BG_CONTAINER_VAR = '--ls-color-bg-container';

/** 跟随系统时需要监听的媒体查询。 */
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
