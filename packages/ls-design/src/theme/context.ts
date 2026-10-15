import { createContext } from 'react';

import type { ThemeContextValue } from './types';

/**
 * 主题上下文。
 *
 * 单独成文件是为了打断循环依赖：ThemeProvider 需要它来提供值，
 * useTheme 需要它来读取值。若把 context 写在 ThemeProvider.tsx 里，
 * useTheme 就要 import ThemeProvider.tsx，而 Provider 又会用到 useTheme 的兄弟模块。
 *
 * 默认值给 `null` 而不是「一套默认配置」，是为了让 useTheme 能识别出
 * 「在 Provider 之外被调用」这个误用。若给默认值，误用会静默失效 ——
 * 组件看起来有主题、切换却完全不响应，是排查成本最高的一类 bug。
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

ThemeContext.displayName = 'LsThemeContext';
