import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

/**
 * 开发期入口，仅用于 `pnpm dev` 与本地的演示页。
 * 它不是库的一部分 —— vite.config.ts 里 build.lib.entry 指向的是 src/index.ts，
 * 且 dts 插件已排除本文件。
 */

const container = document.getElementById('root');

if (!container) {
  throw new Error('未找到 #root 挂载点，请检查 index.html。');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
