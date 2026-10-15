/**
 * 库出口（barrel）。
 *
 * 这个文件是 vite.config.ts 里 `build.lib.entry` 指向的入口，
 * 也就是消费方 `import { X } from 'ls-design'` 实际加载的东西。
 *
 * 当前是骨架占位：令牌层、主题层、组件都还没实现，
 * 所以只导出一个版本号，保证 `pnpm build` 与 `pnpm typecheck` 有东西可跑。
 *
 * 后续会按这个顺序补齐：
 *   export * from './theme';        // ThemeProvider / useTheme
 *   export * from './components';   // Button、Layout、Grid ……
 *   import './styles/index.less';   // 副作用导入：随库一起产出 ls-design.css
 */

export const VERSION = '0.0.0';
