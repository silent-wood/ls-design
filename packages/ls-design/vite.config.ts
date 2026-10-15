import { fileURLToPath } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

/**
 * ls-design 的 Vite 配置，同时服务两种模式：
 *
 *   1. 开发 / 演示 / Storybook —— `vite`，走 index.html + src/main.tsx
 *   2. 库构建                 —— `vite build --mode lib`，产出 dist/ 的 ESM + CJS + CSS + 类型
 *
 * 关键设计：库构建相关的选项全部收在 `mode === 'lib'` 分支里。
 * 原因：Storybook 会合并本文件，若 `build.lib` 无条件存在，会干扰 Storybook 自己的打包流程。
 * 这样非库模式拿到的是一个完全朴素的配置，两边互不污染。
 */

/** mixin 入口。每个 .less 都会被自动 (reference) 引入它，省去逐文件手写相对路径。 */
const MIXINS_ENTRY = "mixins/index.less";

export default defineConfig(({ mode }) => {
  const isLib = mode === "lib";

  return {
    plugins: [
      // JSX 转换。开发与库构建都需要，不加条件。
      react(),

      // 类型声明只在库构建时产出 —— 开发模式下跑它纯属浪费构建时间。
      // Vite 的 plugins 数组原生接受 false，不需要额外 filter。
      isLib &&
        dts({
          // 只处理源码。排除演示页与 stories，它们不属于发布产物。
          include: ["src"],
          exclude: [
            "src/**/*.stories.tsx",
            "src/**/*.test.tsx",
            "src/App.tsx",
            "src/main.tsx",
          ],
          tsconfigPath: "./tsconfig.json",

          // 生成 dist/index.d.ts 作为类型入口，让 package.json 的 "types" 有东西可指。
          // 若之后想把所有声明合并成单文件，改用 rollupTypes: true，
          // 但需确认 @microsoft/api-extractor 可用，且会显著拖慢构建。
          insertTypesEntry: true,
        }),
    ] as PluginOption[],

    resolve: {
      alias: {
        // ⚠️ 必须与 tsconfig.json 的 compilerOptions.paths 保持一致，
        //    否则会出现"IDE 能跳转、构建报找不到"的不一致问题。
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },

    css: {
      preprocessorOptions: {
        less: {
          // LESS 4 起默认关闭 JS 表达式，这里放开。
          javascriptEnabled: true,

          // 自动为每个 .less 注入 mixin 入口。两个必须遵守的点：
          //   1. 用【函数形式】按路径排除 mixins 目录自身
          //      —— 否则它 import 自己，造成循环导入
          //   2. 必须带 (reference)
          //      —— 否则每个组件文件都会把 mixin 里的 CSS 完整重复输出一遍，产物体积翻倍
          additionalData: (content: string, filename: string) =>
            filename.includes(MIXINS_ENTRY)
              ? content
              : `@import (reference) "${MIXINS_ENTRY}";\n${content}`,
        },
      },
    },

    server: {
      // 固定 host 与端口，避免端口漂移导致 Storybook 的 iframe 连不上。
      host: "127.0.0.1",
      port: 5173,
      open: false,
    },

    build: {
      // 非库模式不覆盖任何 build 选项，把控制权完整交还给 Storybook。
      ...(isLib && {
        outDir: "dist",
        emptyOutDir: true,

        // 库产物带 sourcemap 便于排查；若在意发布体积可改成 'hidden'。
        sourcemap: true,

        // 产出单份 CSS，不按 chunk 切分。
        // 组件库的样式应该是一次性引入的整体，切成多份只会让消费方难以处理。
        cssCodeSplit: false,

        lib: {
          entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),

          // ESM 是主产物；CJS 给老构建器与 Jest 兜底。
          // 不产 UMD —— React 组件库要在 <script> 下使用需要宿主提供 React 全局，
          // 实际场景近乎为零，多一个产物只是多一份要维护的映射。
          formats: ["es", "cjs"],

          // 实测产物（vite 8.3.4 + type: module）：
          //   es  → dist/ls-design.js
          //   cjs → dist/ls-design.cjs
          //   css → dist/ls-design.css
          // package.json 的 exports 映射必须与此完全一致。
          fileName: "ls-design",
        },

        // ⚠️ Vite 8 的内核已换成 Rolldown，external 写在 rolldownOptions 下。
        //    build.rollupOptions 仍然存在但已标注 @deprecated，写它等于走兼容层。
        rolldownOptions: {
          external: [
            // React 全家桶必须 external。否则业务侧会打进两份 React 实例，
            // 表现为 hooks 报 Invalid hook call 或 Symbol 不匹配 —— 排查成本极高。
            "react",
            "react-dom",

            // React 19 的自动 JSX 运行时。这两条极容易漏，
            // 漏了会把整份 jsx-runtime 打进产物。
            "react/jsx-runtime",
            "react/jsx-dev-runtime",

            // @ant-design/colors 声明在 dependencies，由消费方安装，不进产物。
            // 若想让它对消费方零感知，可改为打包进来并把依赖挪到 devDependencies。
            "@ant-design/colors",
          ],
        },
      }),
    },
  };
});
