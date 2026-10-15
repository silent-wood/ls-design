import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook 作为组件工作台（而非对外文档站）。
 *
 * ── 两个关键决策 ────────────────────────────────────────────────────────
 * 1. 复用项目的 vite.config.ts，不另起一套构建配置。
 *    `@storybook/react-vite` 会自动合并根目录的 vite.config.ts，于是
 *    LESS 的 additionalData（自动注入 mixin）、@ 别名都直接生效。
 *    这也是 vite.config.ts 里把 build.lib 收进 `mode === 'lib'` 分支的原因 ——
 *    否则 build.lib 会无条件参与合并，干扰 Storybook 自己的打包。
 *
 * 2. stories 与组件同目录（src/**），不集中到独立的 app。
 *    组件的 props、样式、用例在同一批次改动，物理上分开会让「改一个加一个」
 *    变成跨目录的两步操作，久而久之 stories 就会落后于组件。
 */

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],

  addons: [
    // 自动生成 props 表（配合 story 的 tags: ['autodocs']）
    '@storybook/addon-docs',
    // a11y 基线检查：ARIA 属性、对比度、键盘可达性
    '@storybook/addon-a11y',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  typescript: {
    /**
     * ⚠️ 必须显式指定 'react-docgen'，不能用 'react-docgen-typescript'。
     *
     * 理由：TypeScript 7 是 Go 原生实现，不再提供 JavaScript Compiler API，
     * 而 react-docgen-typescript 依赖那套 API 做类型推断 —— 结果是 props 表
     * 静默变空（不报错）。react-docgen 走 Babel 解析，只读 AST 不调编译器 API，
     * 因此不受影响；代价是它从 JSDoc 注释取描述、不做深层类型推断，
     * 所以组件里的 props 注释必须写全（这也是 DoD 里"props 表无缺失注释"的由来）。
     */
    reactDocgen: 'react-docgen',
  },

  core: {
    disableTelemetry: true,
  },
};

export default config;
