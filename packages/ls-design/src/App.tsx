import { useState } from 'react';

import { Button } from './components';
import { DownloadOutlined, PlusOutlined, SearchOutlined } from './icons';
import { useTheme, type Density, type ThemeMode } from './theme';

import './App.less';

/**
 * 开发期演示页。
 *
 * 与 Storybook 的分工：Storybook 是「单个组件的边界态工作台」（受控参数、
 * props 表、a11y 检查），这里是「整页拼装的样子」——主题切换器与组件放在
 * 真实的页面流里，用来验证工作台上看不见的问题：滚动条是否跟随暗色、
 * 组件在容器内是否有溢出、以及主题切换器本身的可用性。
 */

const BRAND_PRESETS = [
  { label: 'antd 默认蓝', value: '#1677ff' },
  { label: '极客蓝', value: '#2f54eb' },
  { label: '薄暮红', value: '#f5222d' },
  { label: '极光绿', value: '#52c41a' },
  { label: '日暮黄', value: '#faad14' },
  { label: '酱紫', value: '#722ed1' },
];

const MODES: ThemeMode[] = ['light', 'dark', 'system'];
const DENSITIES: Density[] = ['default', 'compact'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ls-demo__section">
      <h2 className="ls-demo__section-title">{title}</h2>
      <div className="ls-demo__card">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ls-demo__row">
      <span className="ls-demo__row-label">{label}</span>
      {children}
    </div>
  );
}

function ThemeToolbar() {
  const { mode, density, primaryColor, resolvedMode, setMode, setDensity, setPrimaryColor, toggleMode } =
    useTheme();

  return (
    <div className="ls-demo__toolbar">
      {MODES.map((value) => (
        <Button
          key={value}
          size="small"
          variant={mode === value ? 'solid' : 'outlined'}
          color={mode === value ? 'primary' : 'default'}
          onClick={() => setMode(value)}
        >
          {value}
        </Button>
      ))}

      {DENSITIES.map((value) => (
        <Button
          key={value}
          size="small"
          variant={density === value ? 'solid' : 'outlined'}
          color={density === value ? 'primary' : 'default'}
          onClick={() => setDensity(value)}
        >
          {value}
        </Button>
      ))}

      <Button size="small" onClick={toggleMode}>
        一键切换
      </Button>

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

      <label className="ls-demo__hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        自定义品牌色
        <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
      </label>

      <span className="ls-demo__hint">解析模式：{resolvedMode}</span>
    </div>
  );
}

function PalettePreview() {
  return (
    <div className="ls-demo__palette">
      {(['light', 'dark'] as const).map((which) => (
        <div key={which} className="ls-demo__palette-row">
          <span className="ls-demo__row-label">{which}</span>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
            <span
              key={level}
              title={`--ls-primary-${level}`}
              className="ls-demo__palette-swatch"
              style={{ background: `var(--ls-primary-${level})` }}
            />
          ))}
        </div>
      ))}
      <p className="ls-demo__hint">
        色阶读的是 <code>--ls-primary-1..10</code> 的实际生效值。亮暗两行的排列方向相反 ——
        暗色色阶是「深 → 浅」，所以 hover 走高阶、active 走低阶，与亮色刚好倒过来。
      </p>
    </div>
  );
}

export default function App() {
  const [clickCount, setClickCount] = useState(0);

  return (
    <main className="ls-demo">
      <header className="ls-demo__header">
        <h1 className="ls-demo__title">ls-design</h1>
        <span className="ls-demo__hint">对齐 antd 6.6.6</span>
        <ThemeToolbar />
      </header>

      <Section title="变体 × 语义色">
        {(['default', 'primary', 'danger'] as const).map((color) => (
          <Row key={color} label={color}>
            {(['outlined', 'dashed', 'solid', 'filled', 'text', 'link'] as const).map((variant) => (
              <Button key={variant} variant={variant} color={color}>
                {variant}
              </Button>
            ))}
          </Row>
        ))}
      </Section>

      <Section title="尺寸与形状">
        <Row label="尺寸">
          <Button size="large">大号</Button>
          <Button>中号</Button>
          <Button size="small">小号</Button>
        </Row>
        <Row label="形状">
          <Button shape="round">圆角</Button>
          <Button shape="square">方角</Button>
          <Button shape="circle" icon={<SearchOutlined />} aria-label="搜索" />
          <Button shape="circle" size="small" icon={<PlusOutlined />} aria-label="新建" />
          <Button shape="circle" size="large" icon={<PlusOutlined />} aria-label="新建" />
        </Row>
      </Section>

      <Section title="图标与加载">
        <Row label="图标">
          <Button icon={<SearchOutlined />}>搜索</Button>
          <Button icon={<DownloadOutlined />} iconPlacement="end">
            下载
          </Button>
          <Button icon={<SearchOutlined />} aria-label="搜索" />
        </Row>
        <Row label="加载">
          <Button loading>加载中</Button>
          <Button loading variant="solid" color="primary">
            提交
          </Button>
          <Button loading />
          <Button loading={clickCount > 0} onClick={() => setClickCount((n) => n + 1)}>
            点我（点击次数 {clickCount}）
          </Button>
        </Row>
        <Row label="禁用">
          <Button disabled>禁用</Button>
          <Button disabled variant="solid" color="primary">
            禁用主色
          </Button>
          <Button disabled variant="text" color="danger">
            禁用文字
          </Button>
        </Row>
      </Section>

      <Section title="两汉字字距">
        <Row label="自动补偿">
          <Button>确定</Button>
          <Button>取消</Button>
          <Button variant="solid" color="primary">
            提交
          </Button>
        </Row>
        <Row label="关闭补偿">
          <Button autoInsertSpace={false}>确定</Button>
          <Button autoInsertSpace={false}>取消</Button>
        </Row>
      </Section>

      <Section title="幽灵与撑满">
        <div className="ls-demo__brand-surface">
          <Button ghost>默认</Button>
          <Button ghost color="primary">
            主色
          </Button>
          <Button ghost color="danger">
            危险
          </Button>
          <Button ghost variant="dashed">
            虚线
          </Button>
        </div>
        <Row label="撑满">
          <Button block variant="solid" color="primary" icon={<DownloadOutlined />}>
            撑满宽度
          </Button>
        </Row>
      </Section>

      <Section title="品牌色阶">
        <PalettePreview />
      </Section>
    </main>
  );
}
