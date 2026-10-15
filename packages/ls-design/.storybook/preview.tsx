import type { Decorator, Preview } from '@storybook/react-vite';

import { ThemeProvider } from '../src/theme';

// 令牌与组件样式。组件自己的 .less 会随组件被导入，
// 但令牌层（palette / seed / alias）只在 src/index.ts 里被副作用导入，
// Storybook 不走库入口，所以这里必须显式引一次。
import '../src/styles/index.less';

/**
 * 全局预览配置。
 *
 * ── 为什么主题轴用 globals 而不是 addon-themes ──────────────────────────
 * @storybook/addon-themes 会自己往 <html> 上写 class / data 属性，与
 * ThemeProvider 争抢同一个 DOM 属性；两边都写会导致「切一次跳两下」。
 * 本仓库的主题机制本身就是被测试对象，所以直接用自己的 API：
 * toolbar 选择 → decorator 把值传给 ThemeProvider。
 *
 * ⚠️ 用 key 强制重挂载：ThemeProvider 的 default* 只在首次挂载时生效
 * （设计如此，避免受控/非受控两套语义混在一起）。切工具栏时若不重挂载，
 * 组件内部 state 不会跟着变。这是演示层的妥协，消费方正常使用时不需要。
 */

const withTheme: Decorator = (Story, context) => {
  const mode = (context.globals.theme as string) ?? 'light';
  const density = (context.globals.density as string) ?? 'default';

  return (
    <ThemeProvider
      key={`${mode}-${density}`}
      defaultMode={mode as 'light' | 'dark' | 'system'}
      defaultDensity={density as 'default' | 'compact'}
      // 演示环境不写 localStorage：否则在 Storybook 里随手切一次主题
      // 会污染演示页（pnpm dev）的持久化偏好，两边互相干扰。
      persist={false}
    >
      <Story />
    </ThemeProvider>
  );
};

/**
 * 画布容器。给 story 一个「像真实页面」的底：底色、文字色、字体栈都来自令牌。
 * 缺了它，/dark 主题下画布仍是白底，反而看不出暗色适配的真实效果。
 */
const withCanvas: Decorator = (Story) => (
  <div
    style={{
      minBlockSize: '100vh',
      padding: 'var(--ls-padding-lg)',
      background: 'var(--ls-color-bg-layout)',
      color: 'var(--ls-color-text)',
      fontFamily: 'var(--ls-font-family)',
      fontSize: 'var(--ls-font-size)',
      lineHeight: 'var(--ls-line-height)',
    }}
  >
    <Story />
  </div>
);

const preview: Preview = {
  decorators: [withTheme, withCanvas],

  globalTypes: {
    theme: {
      description: '主题模式',
      toolbar: {
        title: '模式',
        icon: 'contrast',
        items: [
          { value: 'light', title: '亮色' },
          { value: 'dark', title: '暗色' },
          { value: 'system', title: '跟随系统' },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: '密度',
      toolbar: {
        title: '密度',
        icon: 'component',
        items: [
          { value: 'default', title: '常规' },
          { value: 'compact', title: '紧凑' },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    theme: 'light',
    density: 'default',
  },

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'error' 会让有 a11y 问题的 story 直接失败，适合当门禁；
      // 现阶段先设为 'todo'，先看见问题再逐个修。
      test: 'todo',
    },
  },
};

/**
 * 说明：上面的 withCanvas 只改画布，不改 <html>。data-ls-theme 由 ThemeProvider 写在
 * document.documentElement 上，而 Storybook 的工具栏属于宿主 UI —— 它不会被主题化，
 * 这是刻意的：工作台自身的配色不该随被测主题变化，否则切主题时无法判断
 * 是组件变了还是工作台变了。
 *
 * 「跟随系统」这一项在 Storybook 里同样有意义：iframe 拿到的系统偏好就是宿主的真实偏好，
 * 不需要额外同步逻辑。
 */

export default preview;
