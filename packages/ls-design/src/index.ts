/**
 * 库出口（barrel）
 *
 * 这个文件是 vite.config.ts 里 `build.lib.entry` 指向的入口，
 * 也就是消费方 `import { Button } from 'ls-design'` 实际加载的东西。
 *
 * ── 三类导出，顺序有意义 ────────────────────────────────────────────────
 * 1. 副作用导入样式放在最前 —— 它是唯一让 ls-design.css 被产出的地方。
 *    放在后面同样能工作（ES 模块的 import 会被提升），但写在最前，
 *    阅读时能立刻知道「这个包带样式」。
 * 2. 主题层与组件层平级导出，不额外包命名空间。
 *    理由：消费方最常写的两件事是 <ThemeProvider> 和 <Button>，
 *    给它们套一层 `Ls.Button` 只会让树里的组件名从 Button 变成 Ls.Button。
 *
 * ── 有意不导出的 ────────────────────────────────────────────────────────
 * styles/ 下的任何东西（令牌文件、mixin）。样式以整体 CSS 的形式随包发布，
 * 想深度定制的消费方应该覆盖 CSS 变量，而不是 import 我们的 LESS 源文件 ——
 * 后者会让我们的重构变成对方的破坏性变更。
 */

import './styles/index.less';

export * from './theme';
export * from './components';

/* 图标单独导出：内置的那几个（loading / search / download / plus）在后文
   组件里会用到，消费方做自己的按钮时也需要一套「与库同一套视觉」的图标。
   自定义图标用 createIcon 生成，保证尺寸与基线对齐与库内一致。 */
export * from './icons';
