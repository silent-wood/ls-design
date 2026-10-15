# ls-design · 项目长期约定

## 定位（2026-10-15 修订）
参照 antd 设计体系构建的自有 React 组件库，**定位是练手项目**，不考虑与个人简历/求职方向的匹配度。

因此优化目标不是"企业级治理完备"，而是**跑通完整闭环**：设计令牌 → 组件 → Storybook 文档 → 库构建 → 公网可访问。

由此产生的裁剪原则：
- **砍掉**：体积预算（size-limit）、视觉回归矩阵（降级为亮暗两态截图）、commitlint/CODEOWNERS、locale 机制的完整实现（可用常量文件替代）、私有 registry 自建
- **保留**：三层令牌 + 运行时主题切换（核心练习价值）、10 个组件覆盖 forwardRef / 受控非受控 / 复合组件 / 栅格等模式、Storybook、库构建（ESM + 类型 + CSS 产物）
- **新增要求**：产物需可部署到公网（Storybook 静态构建 / Rspress SSG）
- 建议先做 4 个组件（Button / Input / Layout / Grid）跑通一次全链路拿到公网链接，再横向铺开到 10 个

**视觉对齐基准：像素级对齐 antd（2026-10-15 用户决定）。基准版本锁定 `antd@6.6.6`。**
关键认知：antd 把视觉决策全部数值化了，所以"像素级对齐" = **"数值级对齐"**，不靠肉眼比对。做法是把 antd 的 MapToken 值直接抄进 `alias.less`，只有品牌色需要 `@ant-design/colors` 的 `generate()` 运行时派生。

## 硬性约定
1. **LESS 边界**：LESS 只用于 mixin、嵌套、结构组织；禁止用 LESS 变量承载颜色/圆角/字号等主题值。主题一律走 CSS 变量，保证运行时切换能力。
2. **命名空间**：包名 `ls-design`；类名 `ls-`；CSS 变量 `--ls-`；LESS 变量 `@ls-`。
3. **令牌三层**：基础令牌（色板/尺寸/动效）→ 语义令牌（按用途命名）→ 组件令牌（组件私有，引用语义令牌）。组件样式只允许消费 `var(--ls-*)`，禁止硬编码 hex。
4. ~~**令牌成对声明**：LESS 变量与 CSS 变量通过 `.var(@name, @value)` mixin 成对产出。~~
   ❌ **2026-10-15 实测推翻**：LESS 的 mixin 内变量定义**不会外泄到兄弟作用域**，同一作用域内还要求调用早于使用。实测：
   ```less
   .var(@n; @v) { --ls-@{n}: @v; @ls-@{n}: @v; }
   .a { .var(color-text; rgba(0,0,0,.88)); }
   .b { color: @ls-color-text; }   // ✗ variable @ls-color-text is undefined
   ```
   修正后的约定：**令牌的唯一载体是 CSS 变量**。`.var(@name; @value)` mixin 只产出 `--ls-@{name}`（参数分隔符必须是 `;`，值里含逗号时会与参数分隔冲突）。组件里的编译期算术一律走 `calc()` 组合 CSS 变量，例：`paddingInline = calc(var(--ls-padding-content-horizontal) - var(--ls-line-width))`。附带好处：值只在运行时解析，天然跟随主题与品牌色，不需要为"换主题重算"写第二套逻辑。
5. **主题切换三个轴**：`data-ls-theme`（light/dark/system）、内联 `--ls-color-primary`（品牌色）、`data-ls-density`（default/compact）。
6. **中性文本用 `rgba(0,0,0,α)` 而非灰色 hex**（α 阶梯 0.88 / 0.65 / 0.45 / 0.25），理由是叠加性——透明黑落在着色背景上能自然融合。
7. **包管理器统一 pnpm**（本机 11.15.0），禁止混入 `package-lock.json`。`react`/`react-dom` 归 `peerDependencies`。`shamefully-hoist=false` 保持严格布局——未声明的依赖必须在本地就失败，这是发布质量的前置防线。
   - ⚠️ **`pnpm-workspace.yaml` 的 `allowBuilds` 是 map，不是数组**（2026-10-15 实测）：正确写法
     ```yaml
     allowBuilds:
       esbuild: true
     ```
     写成数组 `allowBuilds: [esbuild]` 不会报错，但 pnpm 会把它**改写成** `{'0': esbuild}` + 一条占位项 `esbuild: set this to true or false`，构建脚本依然被拦。字段名是 `allowBuilds`（不是 `onlyBuiltDependencies`）。
   - **两个配置文件都支持 `#` 注释**（实测保留）；`.npmrc` 另支持 `;`。`pnpm install` 不会动注释，但 pnpm 会**重写它自己维护的节点**（如上面那个误写的 `allowBuilds`），被重写的那个节点上的注释会丢。
   - **命令执行层级**（2026-10-15 实测）：`pnpm install` 一律在 **workspace 根**跑——在子包目录跑也一样（输出 `Scope: all N workspace projects`，装的仍是整个 workspace）。**依赖实体只有一份**在根 `node_modules/.pnpm/`，子包 `node_modules/` 顶层只有指向它的软链；**lockfile 全仓只有一份在根**，子包目录出现 lockfile 即 workspace 未识别。
   - **`pnpm add` 写入"当前所在目录"的 package.json**。装到子包用 `pnpm -F ls-design add -D <pkg>` 或 `cd packages/ls-design && pnpm add -D <pkg>`。
   - ⚠️ **"根不装任何依赖"这条纪律没有机制兜底**：实测在根跑 `pnpm add`（不加 `-w`）**不报错**，直接静默写入根 `package.json`（旧版会报 `ERR_PNPM_ADDING_TO_ROOT`，11.15.0 不报）。
   - **严格布局拦截的边界**（实测，从子包目录解析）：子包声明的 ✅；**只在根声明的也 ✅**（Node 向上遍历 `node_modules` 命中根，非 pnpm 提升）；完全未声明的间接依赖 ❌ `MODULE_NOT_FOUND`。即 pnpm 拦的是"完全未声明"，不是"根声明"。
8. **构建工具链基线**：Vite 8（内核已换 Rolldown，库构建 external 写 `build.rolldownOptions`，非 `rollupOptions`）+ LESS 4 + TS + `vite-plugin-dts`（底层已是 unplugin-dts）。
   - **库构建产物命名已实测**（vite 8.3.4，`type: module` + `fileName: 'ls-design'`）：`formats: ['es','cjs']` → `ls-design.js` / `ls-design.cjs` / `ls-design.css`；改 `['es','umd']` → `ls-design.js` / `ls-design.umd.cjs`。**exports 映射必须与之一致。**
   - 库构建选项（`build.lib` / `cssCodeSplit` / `rolldownOptions`）应**按 `mode === 'lib'` 分支隔离**——Storybook 会合并 vite.config，`build.lib` 无条件存在会干扰它的打包。
   - ⚠️ **TypeScript 7 有两处破坏性变更，均已实测踩到**（2026-10-15）：
     1. **`baseUrl` 被移除**，写了报 `TS5102: Option 'baseUrl' has been removed`。tsconfig 里只能写 `paths`（TS 4.4 起 paths 即相对 tsconfig 目录解析，本就不需要 baseUrl）。
     2. **TS 7 是 Go 原生实现，不再提供 JavaScript Compiler API**，导致 `vite-plugin-dts` / `unplugin-dts` 无法生成 `.d.ts`，报错要求装兜底包。解法：`pnpm -F ls-design add -D @typescript/typescript6`（当前 6.0.2）。装后 `tsc --noEmit` 走 TS 7（快），d.ts 生成走 TS 6 的 API，两者并存。
9. **Tailwind 已弃用**（2026-10-15 用户决定）。样式体系全局只有一套：LESS + `var(--ls-*)`。文档与工作台的外观由 Storybook / Rspress 自带主题承接，不自建工具类体系。
   - 若未来重新引入，必读实测结论：`.less` 文件内的 `@apply` **会静默失效**（构建通过、无报错、样式丢失）；`.css` 内用 `@apply` 必须同文件加 `@reference`，否则构建直接失败。桥接只能靠 `@theme inline { --color-ls-*: var(--ls-color-*) }`，`inline` 不可省。
10. **文档策略（两阶段）**：① Storybook 10 作为组件工作台与 props 文档（`@storybook/react-vite` 与 Vite 8 同栈，直接复用 vite.config 的 LESS 配置）；**stories 必须与组件同目录**，禁止集中放到独立 app。② Rspress 2 留作第二阶段对外文档站（Rsbuild 栈，属第二套构建器，需评估成本）。
11. **monorepo 触发条件已成立**（文档站成为第 2 个消费方），目录按 pnpm workspace 组织：`packages/ls-design` + 预留 `apps/docs`。
12. **发布路径（待定，但已核实成本）**：npm **公开发布免费**（私有包 $7/月）；GitHub Packages 提供免费额度的私有 npm registry（GitHub Free 计划含 500MB 存储 + 1GB/月流量，超出 $0.25/GiB + $0.50/GB）；本地可用 `file:` / `link:` 引用。练手项目建议发公开 scope 包（`@用户名/ls-design`），避免占用通用包名——公开发布后 72 小时即无法自行 unpublish。
13. **部署**：Storybook 静态构建可直投 GitHub Pages / Vercel / Netlify / Cloudflare Pages。⚠️ 部署到子路径（如 GitHub Pages 项目页）必须设 `base`，否则资源全部 404；根路径部署（Vercel/Netlify）无需处理。
14. **antd 基准版本必须 pin**：`antd@6.6.6`（实测于 2026-10-15）。antd 每个 minor 都可能调视觉值，不 pin 就无法判定"对齐是否回归"。
15. **字体栈必须与 antd 完全一致**，否则字宽不同会让所有文本的横向位置偏移——这是"像素级对齐"最常失败的点。原样抄：
    `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`
16. **组件内部存在未令牌化的数值**（如 Button 的 `paddingInline = paddingContentHorizontal - lineWidth`、`iconGap = marginXS`）。全局令牌表抄完仍会有像素差，这部分只能读 antd 组件源码 `antd/es/<comp>/style/token.js` 的 `prepareComponentToken`。
17. **暗色色阶索引与亮色不同，不可套用同一张映射表**（实测值见 `2026-10-15.md`）。且暗色 `generate()` 必须传 `backgroundColor: '#141414'`——传 `'#000'` 会得到与 antd 完全不匹配的整套色阶。

## 架构决策记录
- 主题机制选型：**纯 CSS 变量**，不用 CSS-in-JS（零运行时开销、宿主可直接覆盖）。antd 走到 v6 的最终形态同样是"静态 CSS + CSS 变量"。
- 密度不通过改字号实现，只重写控件高度/内边距/字号三个变量。
- 栅格响应式不生成 6 断点 × 24 栅格类名，用 CSS 变量级联（约 6 条媒体查询）。
- ~~monorepo 暂不上~~ → **已修订**：触发条件成立（文档站是第 2 个消费方，且 stories 与组件 API 必须同批次改），采用 pnpm workspace。
- **目录归属判据：看"构建器与依赖是否需要隔离"，不看"是不是文档"。** Storybook 复用 Vite → 留在包内；Rspress 自带 Rsbuild → 独立成 `apps/docs`。

## 目录结构（阶段 0 目标树，2026-10-15 定）
```
ls-design/                          # workspace 根，只放 workspace 级内容
├── .workbuddy/memory/              # 项目记忆
├── package.json                    # private，只放脚本，不装依赖
├── pnpm-workspace.yaml             # packages: [packages/*] + allowBuilds: { esbuild: true }
├── .npmrc                          # shamefully-hoist=false
├── .gitignore                      # 只忽略 node_modules；lockfile 必须提交
└── packages/
    └── ls-design/                  # 唯一功能包
        ├── package.json  tsconfig.json  vite.config.ts  index.html
        ├── .storybook/             # main.ts + preview.tsx（不放 stories）
        ├── scripts/                # gen-antd-tokens.mjs 等构建期脚本
        └── src/
            ├── index.ts            # 库出口
            ├── main.tsx  App.tsx  App.less   # dev 演示页
            ├── styles/             # 静态值：编译期为主
            │   ├── index.less  base.less
            │   ├── tokens/         # 三层令牌。seed/palette/themes 由脚本生成，alias 手写
            │   └── mixins/         # 编译期工具，必须独立成目录（additionalData 需按路径排除）
            ├── theme/              # 运行时：把用户选择翻译成 html 属性 + 内联变量
            ├── utils/              # 与框架无关的纯函数
            ├── icons/              # 内联 SVG，不引图标库
            └── components/         # 扁平一层，每个组件一个目录
                                    # 固定 4 文件：X.tsx / X.less / X.stories.tsx / index.ts
```
**两条修正**：① 组件目录**不按 general/layout 分两级**——分组交给 Storybook 的 `title: '通用/Button'` 命名，物理分层只会让 import 变长；② `apps/` 现阶段**不建**，等阶段 11 上 Rspress 时再建 `apps/docs`。
**生成物**（不手建、全部进 .gitignore）：`dist/`、`storybook-static/`、`node_modules/`、`pnpm-lock.yaml` 除外（lockfile 要提交）。

## 组件清单（首版 10 个）
- 通用：Button、Input、Typography、Tag、Switch
- 布局：Layout、Grid、Space、Divider、Card

## DoD（完成定义，参考 antd 6.6.6 的实测令牌）
定义：一个工作项在**被判定为完成之前**必须全部满足的显式清单；属质量门槛（做到什么程度），不是需求（做什么）。全局统一，不随组件变化——变化的那部分叫验收标准（AC）。

**单个组件的 DoD（4 类，全过才算完成）**
1. **功能**：props 全部可用且有 story 覆盖组合态；受控/非受控双模式（走统一 `useMergedState`，不各自实现）；`forwardRef` 透传；继承原生 props 时用 `Omit` 去掉与语义 props 冲突的键（如 `input` 的 `size`/`prefix`）；`disabled` 与 `loading` 并存时的优先级明确。
2. **主题**：亮/暗 × 品牌色 × 密度 共 4 种组合下无异常；无任何硬编码颜色（由 stylelint `color-no-hex` 强制）；控件尺寸数值与 antd 6.6.6 对齐。
3. **文档**：story 与组件同目录；autodocs 的 props 表无 `any`、无缺失注释；至少一个 story 展示禁用/加载等边界态。
4. **质量**：a11y 基线（ARIA 属性、键盘可达、焦点环统一）；TS 类型无 `any` 逃逸；亮暗两态各一张截图留档。

**阶段 DoD（门禁）**
阶段 0/1/3 不通过不得进入组件开发；阶段 5（Button）不通过不得横向铺其余组件——Button 是全部样式模式的样板，它跑通则其余为套模板，跑不通则错误会被复制 9 次。
