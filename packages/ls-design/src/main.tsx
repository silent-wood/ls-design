import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { ThemeProvider } from './theme';

/**
 * 开发期入口，仅用于 `pnpm dev` 与本地演示页。
 * 它不是库的一部分 —— vite.config.ts 里 build.lib.entry 指向的是 src/index.ts，
 * 且 dts 插件已排除本文件与 App.tsx。
 */

/**
 * ThemeProvider 放在最外层，且包住 StrictMode 之内的整棵树。
 * 位置很关键：它往 document.documentElement 上写 data-ls-theme / 内联色阶变量，
 * 所以必须在首帧就把主题落地，否则页面会先按 palette.less 的默认色渲染一帧。
 */
const container = document.getElementById('root');

if (!container) {
  throw new Error('未找到 #root 挂载点，请检查 index.html。');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
