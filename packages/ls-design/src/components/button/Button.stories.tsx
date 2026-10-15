import { useState, type CSSProperties, type ReactNode } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { DownloadOutlined, PlusOutlined, SearchOutlined } from '../../icons';
import { useTheme } from '../../theme';

import { Button, type ButtonColor, type ButtonVariant } from './Button';

/**
 * 按钮的组件工作台。
 *
 * ── 为什么把「视觉矩阵」也做成 story ────────────────────────────────────
 * 按钮的外观是 6 变体 × 3 语义色 × 3 尺寸 × 4 形状的正交矩阵，肉眼过一遍需要
 * 几十个实例；而这些组合之间只靠 CSS 变量层叠决定，改一个色块就可能连带
 * 影响另一组。把矩阵固化成 story，等于给这套层叠关系留下一个可随时复看的快照。
 *
 * ── 关于主题 ────────────────────────────────────────────────────────────
 * 亮暗 / 密度由 Storybook 顶部工具栏（.storybook/preview.tsx 注册的 globals）
 * 全局控制；品牌色与「三轴联动」在最后一则 story 里交互演示。
 */

/* 演示用的排版容器。只消费语义令牌，不写任何字面颜色 —— 与组件遵守同一条纪律，
   否则演示页在暗色下会露馅，反而掩盖真实问题。 */
const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ls-margin-md)',
  padding: 'var(--ls-padding-lg)',
  background: 'var(--ls-color-bg-container)',
  color: 'var(--ls-color-text)',
  borderRadius: 'var(--ls-radius-lg)',
  border: '1px solid var(--ls-color-border-secondary)',
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ls-margin-md)' }}>
      <span
        style={{
          inlineSize: '6em',
          flex: 'none',
          color: 'var(--ls-color-text-tertiary)',
          fontSize: 'var(--ls-font-size-sm)',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--ls-margin-sm)' }}>
        {children}
      </div>
    </div>
  );
}

const VARIANTS: ButtonVariant[] = ['outlined', 'dashed', 'solid', 'filled', 'text', 'link'];
const COLORS: ButtonColor[] = ['default', 'primary', 'danger'];

const meta = {
  title: '通用/Button',
  component: Button,
  parameters: {
    // 按钮是内联元素，用 centered 才有合理的观察距离；padding 交给演示容器。
    layout: 'centered',
    docs: {
      description: {
        component:
          '按钮。外观由 `variant`（外形）与 `color`（语义色）两个正交属性决定，' +
          '默认 `outlined` + `default`。所有视觉值对齐 antd 6.6.6。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: VARIANTS,
      description: '外形。`solid` 为实心，`filled` 为浅底填充，`text` / `link` 无边框无底。',
    },
    color: {
      control: 'select',
      options: COLORS,
      description: '语义色。`danger` 与 `danger` 属性等价。',
    },
    size: { control: 'inline-radio', options: ['small', 'middle', 'large'] },
    shape: { control: 'inline-radio', options: ['default', 'circle', 'round', 'square'] },
    iconPlacement: { control: 'inline-radio', options: ['start', 'end'] },
    htmlType: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
    // 这几个开关在 Playground 里逐个试最容易看出差异
    block: { control: 'boolean' },
    ghost: { control: 'boolean' },
    danger: { control: 'boolean' },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    autoInsertSpace: { control: 'boolean' },
    // 图标是 ReactNode，用控件调没有意义
    icon: { control: false },
    children: { control: 'text' },
  },
  args: {
    children: '按钮',
    variant: 'outlined',
    color: 'default',
    size: 'middle',
    shape: 'default',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ══════════════════════════════════════════════════════════════════════════
 * 交互试验台
 * ══════════════════════════════════════════════════════════════════════════ */

export const Playground: Story = {
  name: '试验台',
  args: {},
};

/* ══════════════════════════════════════════════════════════════════════════
 * 外观矩阵
 * ══════════════════════════════════════════════════════════════════════════ */

export const VariantMatrix: Story = {
  name: '变体 × 语义色',
  args: {},
  render: () => (
    <div style={stack}>
      {COLORS.map((color) => (
        <Row key={color} label={color}>
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} color={color}>
              {variant}
            </Button>
          ))}
        </Row>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '6 变体 × 3 语义色的完整矩阵。这 18 种外观只由 3 个变体块 + 3 个色块' +
          '交叉层叠得出，看一眼是否有哪格「没跟上」就能判断变量层叠有没有被破坏。',
      },
    },
  },
};

export const Sizes: Story = {
  name: '尺寸',
  args: {},
  render: () => (
    <div style={stack}>
      <Row label="large">
        <Button size="large">大号按钮</Button>
        <Button size="large" variant="solid" color="primary">
          主色
        </Button>
        <Button size="large" icon={<DownloadOutlined />}>
          下载
        </Button>
      </Row>
      <Row label="middle">
        <Button>中号按钮</Button>
        <Button variant="solid" color="primary">
          主色
        </Button>
        <Button icon={<DownloadOutlined />}>下载</Button>
      </Row>
      <Row label="small">
        <Button size="small">小号按钮</Button>
        <Button size="small" variant="solid" color="primary">
          主色
        </Button>
        <Button size="small" icon={<DownloadOutlined />}>
          下载
        </Button>
      </Row>
      <Row label="紧凑验证">
        <span style={{ color: 'var(--ls-color-text-tertiary)', fontSize: 'var(--ls-font-size-sm)' }}>
          把顶部工具栏的「密度」切到 compact，上面三行的控件高度会整体收缩，
          而小号按钮的水平内边距保持不变 —— 后者在 antd 里是字面量 8px，不随密度变化。
        </span>
      </Row>
    </div>
  ),
};

export const Shapes: Story = {
  name: '形状',
  args: {},
  render: () => (
    <div style={stack}>
      <Row label="default">
        <Button>按钮</Button>
        <Button variant="solid" color="primary">
          按钮
        </Button>
      </Row>
      <Row label="round">
        <Button shape="round">按钮</Button>
        <Button shape="round" variant="solid" color="primary">
          按钮
        </Button>
      </Row>
      <Row label="circle">
        <Button shape="circle" icon={<SearchOutlined />} />
        <Button shape="circle" variant="solid" color="primary" icon={<SearchOutlined />} />
        <Button shape="circle" size="small" icon={<PlusOutlined />} />
        <Button shape="circle" size="large" icon={<PlusOutlined />} />
      </Row>
      <Row label="square">
        <Button shape="square">按钮</Button>
        <Button shape="square" variant="solid" color="primary">
          按钮
        </Button>
      </Row>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '形状的几何基准是控件高度：圆形的直径、胶囊的圆角半径都等于当前尺寸的高度。' +
          '所以它们是按尺寸重算的，而不是一个固定值 —— 把 density 切成 compact 可以验证。',
      },
    },
  },
};

/* ══════════════════════════════════════════════════════════════════════════
 * 图标
 * ══════════════════════════════════════════════════════════════════════════ */

export const WithIcon: Story = {
  name: '图标',
  args: {},
  render: () => (
    <div style={stack}>
      <Row label="前置">
        <Button icon={<SearchOutlined />}>搜索</Button>
        <Button variant="solid" color="primary" icon={<DownloadOutlined />}>
          下载
        </Button>
      </Row>
      <Row label="后置">
        <Button icon={<DownloadOutlined />} iconPlacement="end">
          下载
        </Button>
        <Button variant="text" color="primary" icon={<PlusOutlined />} iconPlacement="end">
          新建
        </Button>
      </Row>
      <Row label="纯图标">
        <Button icon={<SearchOutlined />} aria-label="搜索" />
        <Button icon={<PlusOutlined />} aria-label="新建" />
        <Button variant="solid" color="primary" icon={<DownloadOutlined />} aria-label="下载" />
        <Button variant="text" icon={<SearchOutlined />} aria-label="搜索" />
      </Row>
      <Row label="圆角图标">
        <Button shape="round" icon={<SearchOutlined />}>
          搜索
        </Button>
        <Button shape="round" icon={<SearchOutlined />} aria-label="搜索" />
      </Row>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '图标与文字之间是 flex 的 gap（8px），不靠图标的 margin。' +
          '后置用 flex-direction: row-reverse 实现，DOM 顺序仍是「图标在前」，' +
          '屏幕阅读器的朗读顺序不受视觉位置影响。纯图标按钮请务必给 aria-label。',
      },
    },
  },
};

/* ══════════════════════════════════════════════════════════════════════════
 * 边界态
 * ══════════════════════════════════════════════════════════════════════════ */

export const Loading: Story = {
  name: '加载',
  args: {},
  render: () => (
    <div style={stack}>
      <Row label="各变体">
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} loading>
            {variant}
          </Button>
        ))}
      </Row>
      <Row label="带图标">
        <Button loading icon={<DownloadOutlined />}>
          下载
        </Button>
        <Button loading icon={<DownloadOutlined />} iconPlacement="end">
          下载
        </Button>
      </Row>
      <Row label="纯图标">
        <Button loading />
        <Button loading variant="solid" color="primary" />
        <Button loading size="small" />
      </Row>
      <Row label="延时 400ms">
        <DelayedLoadingDemo />
      </Row>
      <Row label="点击拦截">
        <LoadingClickDemo />
      </Row>
      <Row label="说明">
        <span style={{ color: 'var(--ls-color-text-tertiary)', maxInlineSize: '42em' }}>
          延时的语义是「跃迁才计时」：从非 loading 变成 loading 时等 400ms 再显示，
          所以 200ms 就返回的请求全程不闪。但按钮初次挂载时就是 loading 的话会立即转圈 ——
          初始状态直接取自入参，没有发生跃迁。
        </span>
      </Row>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '加载中会整体降到 `--ls-opacity-loading`，并且**拦截点击**（用 preventDefault，' +
          '所以嵌在 <form> 里的按钮也不会被误提交）。' +
          'loading 图标的收放用 CSS transition 做，折叠时用负 margin 抵掉 flex gap，' +
          '避免文字位置抖动。',
      },
    },
  },
};

function DelayedLoadingDemo() {
  const [pending, setPending] = useState(false);

  const run = (duration: number) => {
    setPending(true);
    window.setTimeout(() => setPending(false), duration);
  };

  return (
    <>
      {/* 400ms 的请求 + 400ms 延时：转圈刚好出现 */}
      <Button loading={pending ? { delay: 400 } : false} onClick={() => run(1400)}>
        慢请求 1.4s
      </Button>
      {/* 200ms 的请求：永远等不到 400ms，所以全程无转圈 —— 这正是延时的意义 */}
      <Button loading={pending ? { delay: 400 } : false} onClick={() => run(200)}>
        快请求 200ms（不闪）
      </Button>
      <span style={{ color: 'var(--ls-color-text-tertiary)' }}>
        状态：{pending ? '请求中' : '空闲'}
      </span>
    </>
  );
}

function LoadingClickDemo() {
  const [count, setCount] = useState(0);

  return (
    <>
      <Button
        variant="solid"
        color="primary"
        loading
        onClick={() => setCount((value) => value + 1)}
      >
        点了不该有反应
      </Button>
      <span style={{ color: 'var(--ls-color-text-tertiary)' }}>
        成功触发次数：{count}（加载中应始终为 0）
      </span>
    </>
  );
}

export const Disabled: Story = {
  name: '禁用',
  args: {},
  render: () => (
    <div style={stack}>
      {COLORS.map((color) => (
        <Row key={color} label={color}>
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} color={color} disabled>
              禁用
            </Button>
          ))}
        </Row>
      ))}
      <Row label="图标 / 纯图标">
        <Button disabled icon={<SearchOutlined />}>
          搜索
        </Button>
        <Button disabled icon={<SearchOutlined />} aria-label="搜索" />
        <Button disabled loading>
          同时加载
        </Button>
      </Row>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '禁用态统一由 `--ls-color-border-disabled` / `--ls-color-text-disabled` 与' +
          '`--ls-color-bg-container-disabled` 三个语义令牌决定，与变体无关。' +
          '无边框变体额外把底与边框显式置透明，否则会露出一块方块。' +
          '最后一组验证「disabled 与 loading 并存」：两者都阻止点击，视觉上叠加。',
      },
    },
  },
};

export const Block: Story = {
  name: '撑满宽度',
  args: {},
  render: () => (
    <div style={{ ...stack, inlineSize: '24em' }}>
      <Button block>撑满</Button>
      <Button block variant="solid" color="primary" icon={<DownloadOutlined />}>
        撑满带图标
      </Button>
      <Button block size="small" variant="dashed" color="danger">
        小号虚线危险
      </Button>
    </div>
  ),
};

export const Ghost: Story = {
  name: '幽灵',
  args: {},
  render: () => (
    <div
      style={{
        ...stack,
        // 幽灵按钮的存在意义就是「放在彩色底上」，所以演示也必须给一个彩色底。
        background: 'var(--ls-color-primary)',
        border: 'none',
        color: 'var(--ls-color-text-light-solid)',
      }}
    >
      <Row label="幽灵">
        <Button ghost>按钮</Button>
        <Button ghost color="primary">
          主色
        </Button>
        <Button ghost color="danger">
          危险
        </Button>
      </Row>
      <Row label="幽灵 + 实心">
        <Button ghost variant="solid" color="primary">
          降级为描边
        </Button>
      </Row>
      <Row label="幽灵 + 虚线">
        <Button ghost variant="dashed">
          虚线
        </Button>
      </Row>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '幽灵态把底色置透明、阴影置零，用于放在彩色底（主色横幅、图片上）的按钮。' +
          '`ghost` 与 `variant="solid"` 是矛盾组合，会自动降级成描边 ——' +
          '幽灵表达的是「所处环境」，环境不该被外观覆盖。',
      },
    },
  },
};

export const TwoChineseChars: Story = {
  name: '两汉字字距',
  args: {},
  render: () => (
    <div style={stack}>
      <Row label="自动补偿">
        <Button>确定</Button>
        <Button>取消</Button>
        <Button>搜索</Button>
      </Row>
      <Row label="对照：关闭补偿">
        <Button autoInsertSpace={false}>确定</Button>
        <Button autoInsertSpace={false}>取消</Button>
        <Button autoInsertSpace={false}>搜索</Button>
      </Row>
      <Row label="不受影响">
        <Button>确 定</Button>
        <Button>重置全部</Button>
        <Button icon={<SearchOutlined />}>搜索</Button>
      </Row>
      <Row label="说明">
        <span style={{ color: 'var(--ls-color-text-tertiary)', maxInlineSize: '40em' }}>
          恰好两个汉字的按钮，两字紧挨会显得比多字按钮拥挤。补偿做法是插入一个空格并把
          字距拉到 0.34em，再用负 margin 把末位偏移收回 —— 呼吸感与多字按钮一致，
          按钮宽度仍是「两字宽度」。超过两个字、或已有图标、或是 text / link 变体时都不适用。
        </span>
      </Row>
    </div>
  ),
};

/* ══════════════════════════════════════════════════════════════════════════
 * 三条主题轴
 * ══════════════════════════════════════════════════════════════════════════ */

export const ThemeAxes: Story = {
  name: '主题三轴',
  args: {},
  render: () => <ThemeAxesDemo />,
  parameters: {
    docs: {
      description: {
        story:
          '三条正交轴：**模式**（light / dark / system，走 data-ls-theme）、' +
          '**密度**（default / compact，走 data-ls-density）、**品牌色**（内联 --ls-primary-1..10）。' +
          '前两条是纯 CSS 切换、零 JS 参与渲染；品牌色必须用色彩算法重算，是唯一走 JS 的一条。' +
          '切到暗色再改品牌色，可以验证主色阴影（按钮下方那道 2px）也跟着变了 —— ' +
          '它是色阶的派生值，不是写死的。',
      },
    },
  },
};

const BRAND_PRESETS = [
  { label: 'antd 默认蓝', value: '#1677ff' },
  { label: '极客蓝', value: '#2f54eb' },
  { label: '薄暮红', value: '#f5222d' },
  { label: '极光绿', value: '#52c41a' },
  { label: '日暮黄', value: '#faad14' },
  { label: '酱紫', value: '#722ed1' },
];

function ThemeAxesDemo() {
  const { mode, density, primaryColor, resolvedMode, setMode, setDensity, setPrimaryColor, toggleMode } =
    useTheme();

  const chip: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--ls-margin-xs)',
    fontFamily: 'var(--ls-font-family)',
    fontSize: 'var(--ls-font-size)',
    color: 'var(--ls-color-text)',
  };

  return (
    <div style={{ ...stack, gap: 'var(--ls-margin-lg)' }}>
      <Row label="模式">
        <div style={chip}>
          {(['light', 'dark', 'system'] as const).map((value) => (
            <label key={value} style={{ display: 'inline-flex', gap: 'var(--ls-margin-xxs)' }}>
              <input
                type="radio"
                name="ls-demo-mode"
                checked={mode === value}
                onChange={() => setMode(value)}
              />
              {value}
            </label>
          ))}
          <span style={{ color: 'var(--ls-color-text-tertiary)' }}>
            （当前解析为 {resolvedMode}）
          </span>
          <Button size="small" onClick={toggleMode}>
            一键切换
          </Button>
        </div>
      </Row>

      <Row label="密度">
        <div style={chip}>
          {(['default', 'compact'] as const).map((value) => (
            <label key={value} style={{ display: 'inline-flex', gap: 'var(--ls-margin-xxs)' }}>
              <input
                type="radio"
                name="ls-demo-density"
                checked={density === value}
                onChange={() => setDensity(value)}
              />
              {value}
            </label>
          ))}
        </div>
      </Row>

      <Row label="品牌色">
        <div style={{ ...chip, flexWrap: 'wrap' }}>
          {BRAND_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              size="small"
              variant={primaryColor === preset.value ? 'solid' : 'outlined'}
              color={primaryColor === preset.value ? 'primary' : 'default'}
              onClick={() => setPrimaryColor(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--ls-margin-xs)' }}>
            自定义
            <input
              type="color"
              value={primaryColor}
              onChange={(event) => setPrimaryColor(event.target.value)}
            />
          </label>
        </div>
      </Row>

      <Row label="矩阵抽查">
        <Button variant="solid" color="primary">
          主色实心
        </Button>
        <Button variant="solid" color="primary" icon={<DownloadOutlined />}>
          带图标
        </Button>
        <Button variant="filled" color="primary">
          主色填充
        </Button>
        <Button variant="outlined" color="primary">
          主色描边
        </Button>
        <Button variant="text" color="primary">
          主色文字
        </Button>
        <Button variant="link">链接</Button>
        <Button variant="solid" color="danger">
          危险实心
        </Button>
        <Button variant="filled" color="danger">
          危险填充
        </Button>
      </Row>

      <Row label="两套色阶">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ls-margin-xxs)' }}>
          {(['light', 'dark'] as const).map((which) => (
            <div key={which} style={{ display: 'flex', alignItems: 'center', gap: 'var(--ls-margin-xs)' }}>
              <span
                style={{
                  inlineSize: '3em',
                  fontSize: 'var(--ls-font-size-sm)',
                  color: 'var(--ls-color-text-tertiary)',
                }}
              >
                {which}
              </span>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
                <span
                  key={level}
                  title={`--ls-primary-${level}`}
                  style={{
                    inlineSize: 'var(--ls-size-lg)',
                    blockSize: 'var(--ls-size-lg)',
                    borderRadius: 'var(--ls-radius-xs)',
                    // 这里必须读变量而不是内联色值：色阶正是 JS 写进变量的那 10 个值，
                    // 直接读变量才能看到「实际生效」的结果。
                    background: `var(--ls-primary-${level})`,
                    border: '1px solid var(--ls-color-border-secondary)',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </Row>

      <Row label="说明">
        <span style={{ color: 'var(--ls-color-text-tertiary)', maxInlineSize: '44em' }}>
          色阶行读的是 `--ls-primary-1..10` 实际生效值。注意暗色一行的 index 6 不等于所选品牌色本身，
          且 hover / active 用的是与亮色相反的方向（暗色色阶是「深 → 浅」排列）——
          这是 antd 算法本身的行为，不是实现偏差。
        </span>
      </Row>
    </div>
  );
}
