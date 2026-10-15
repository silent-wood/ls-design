import { useContext } from 'react';

import { ThemeContext } from './context';

import type { ThemeContextValue } from './types';

/**
 * 读取当前主题配置与切换方法。
 *
 * 在 <ThemeProvider> 之外调用会直接抛错，而不是返回一套默认值。
 * 这是刻意的：静默降级会让「切换主题没反应」变成一个没有报错线索的 bug，
 * 而显式抛错会在开发阶段第一眼就暴露出来。
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error(
      '[ls-design] useTheme 必须在 <ThemeProvider> 内部使用。' +
        '请确认组件树顶层（通常是 main.tsx 里）已经包了一层 <ThemeProvider>。',
    );
  }

  return context;
}
