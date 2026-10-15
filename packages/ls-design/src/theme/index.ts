/**
 * 主题层出口
 *
 * 对外只暴露「用得到的东西」：
 *   · ThemeProvider / useTheme        —— 宿主接入点
 *   · 类型                             —— 三条轴与上下文值的类型
 *   · 常量                             —— 默认品牌色、持久化键，供宿主自建 UI 时复用
 *
 * 刻意不导出 generateBrandPalettes：它是内部实现，宿主若直接用它算色阶，
 * 就等于绕过了 ThemeProvider 的落地逻辑（缓存、防闪屏、属性同步），
 * 那条路径迟早会和 Provider 打架。
 */
export { ThemeProvider, type ThemeProviderProps } from './ThemeProvider';
export { useTheme } from './useTheme';
export {
  DEFAULT_PRIMARY_COLOR,
  DENSITY_ATTR,
  THEME_ATTR,
  THEME_STORAGE_KEY,
} from './constants';

export type {
  BrandPalette,
  BrandPalettes,
  Density,
  ResolvedThemeMode,
  ThemeConfig,
  ThemeContextValue,
  ThemeMode,
} from './types';
