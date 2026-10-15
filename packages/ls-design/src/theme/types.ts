/**
 * 主题层的公开类型
 *
 * 主题在这里被拆成三条互相正交的轴，而不是一个 theme 对象：
 *   mode      —— 亮 / 暗 / 跟随系统（对应 html 的 data-ls-theme）
 *   density   —— 常规 / 紧凑（对应 html 的 data-ls-density）
 *   primaryColor —— 品牌色（对应内联的 --ls-primary-1..10）
 *
 * 三条轴为什么必须正交：它们的生效方式完全不同。mode 与 density 是
 * 「切换到另一套静态 CSS 变量」（纯 CSS，零 JS 参与渲染）；
 * 品牌色是「用色彩算法算出一套色阶」（必须 JS）。混成一个对象会让
 * 「换个密度要不要重算色阶」这类问题永远说不清。
 */

/** 主题模式。`system` 表示跟随操作系统的 prefers-color-scheme。 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 解析后的模式。`system` 被解析成具体值后不再存在。 */
export type ResolvedThemeMode = 'light' | 'dark';

/** 密度。只重写控件高度 / 内边距 / 字号三类令牌。 */
export type Density = 'default' | 'compact';

/** 可持久化的主题配置。 */
export interface ThemeConfig {
  mode: ThemeMode;
  density: Density;
  primaryColor: string;
}

/** 一套品牌色阶及其派生值。 */
export interface BrandPalette {
  /** 10 级色阶，索引 0 对应 --ls-primary-1 */
  palette: string[];
  /**
   * 主色阴影用的半透明色，等价于 antd 的 controlOutline。
   * 详情见 src/utils/color.ts 的文件头。
   */
  controlOutline: string;
}

/** 亮暗两套品牌色阶。 */
export type BrandPalettes = Record<ResolvedThemeMode, BrandPalette>;

/** ThemeProvider 提供的上下文值。 */
export interface ThemeContextValue extends ThemeConfig {
  /** `mode` 解析后的具体值，供需要 JS 分支的场景使用（如选一套第三方组件的主题）。 */
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
  setDensity: (density: Density) => void;
  setPrimaryColor: (color: string) => void;
  /** 在 light / dark 之间切换；当前是 system 时切到与系统相反的一侧。 */
  toggleMode: () => void;
}
