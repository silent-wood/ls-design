import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  CONTROL_OUTLINE_VAR,
  DARK_SCHEME_QUERY,
  DEFAULT_PRIMARY_COLOR,
  DENSITY_ATTR,
  PRIMARY_VAR_PREFIX,
  THEME_ATTR,
  THEME_STORAGE_KEY,
} from './constants';
import { ThemeContext } from './context';
import { generateBrandPalettes } from './palette';

import type { Density, ResolvedThemeMode, ThemeContextValue, ThemeMode } from './types';

/**
 * useLayoutEffect 在服务端渲染时会触发 React 告警，而浏览器里又必须用它 ——
 * 主题变量得在绘制前写好，否则会闪一帧无主题的样式。
 * 所以按环境切换：浏览器用 layout 版，SSR 退化成普通 effect（服务端本就不绘制）。
 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * localStorage 的持久化结构。index.html 的防闪屏脚本按同一结构同步读取。
 *
 * 品牌色存两份是有意的：`primaryColor` 是「输入」，给 React 用；
 * `brand` 是「输出」（算好的色阶 + 主色阴影），给防闪屏脚本用。
 * 只存输入的话，脚本就得在阻塞渲染的关键路径上跑一遍色彩算法；
 * 只存输出的话，React 无法还原出当前品牌色是什么。
 */
interface PersistedConfig {
  mode?: ThemeMode;
  density?: Density;
  primaryColor?: string;
  brand?: Record<ResolvedThemeMode, { palette?: string[]; outline?: string }>;
}

export interface ThemeProviderProps {
  children?: ReactNode;

  /** 初始主题模式。默认 `system`（跟随操作系统）。 */
  defaultMode?: ThemeMode;
  /** 初始密度。默认 `default`。 */
  defaultDensity?: Density;
  /** 初始品牌色。默认与 antd 一致的 `#1677ff`。 */
  defaultPrimaryColor?: string;

  /**
   * 是否把配置写入 localStorage。
   * 设为 `false` 用于「主题被外层固定」的场景（如文档站里演示某个固定主题的区块），
   * 避免演示区块的挂载污染用户的真实偏好。
   */
  persist?: boolean;

  /**
   * 属性与 CSS 变量的落地元素。
   * 默认 `document.documentElement` —— 挂在 <html> 上才能让 <body> 与所有
   * 浮层（Portal 到 body 的那些）都继承到主题。
   */
  target?: HTMLElement | null;

  /** 持久化键。默认 `ls-design-theme`，与 index.html 的防闪屏脚本共用。 */
  storageKey?: string;
}

/** 读持久化配置。任一字段损坏都只丢弃该字段，不整体回退。 */
function readPersisted(storageKey: string): PersistedConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedConfig;
    const config: PersistedConfig = {};
    if (parsed.mode) config.mode = parsed.mode;
    if (parsed.density) config.density = parsed.density;
    if (typeof parsed.primaryColor === 'string' && parsed.primaryColor) {
      config.primaryColor = parsed.primaryColor;
    }

    return Object.keys(config).length > 0 ? config : null;
  } catch {
    // localStorage 被禁用（隐私模式 / 沙箱 iframe）或数据损坏时不阻断渲染。
    return null;
  }
}

export function ThemeProvider({
  children,
  defaultMode = 'system',
  defaultDensity = 'default',
  defaultPrimaryColor = DEFAULT_PRIMARY_COLOR,
  persist = true,
  target,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  /**
   * 用惰性初始化读持久化配置，而不是在 effect 里补读。
   * 理由：effect 里补读会先用默认配置渲染一帧，随后立即改成持久化配置 ——
   * 表现为一次可见的跳变，正好抵消掉 index.html 里防闪屏脚本的作用。
   */
  const [mode, setMode] = useState<ThemeMode>(() => readPersisted(storageKey)?.mode ?? defaultMode);
  const [density, setDensity] = useState<Density>(
    () => readPersisted(storageKey)?.density ?? defaultDensity,
  );
  const [primaryColor, setPrimaryColorState] = useState(
    () => readPersisted(storageKey)?.primaryColor ?? defaultPrimaryColor,
  );

  /** 系统的暗色偏好。仅在 mode === 'system' 时参与计算，但始终订阅。 */
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(DARK_SCHEME_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const query = window.matchMedia(DARK_SCHEME_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);

    // 现代 API 优先；addListener 只作为旧 Safari 的兜底。
    if (query.addEventListener) {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);

  const resolvedMode: ResolvedThemeMode =
    mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode;

  /**
   * 品牌色阶。亮暗两套一起算，被下面两个 effect 共用 ——
   * 否则同一次换色要跑两遍 generate()。
   */
  const brand = useMemo(() => generateBrandPalettes(primaryColor), [primaryColor]);

  const resolveTarget = useCallback(
    (): HTMLElement | null =>
      target ?? (typeof document === 'undefined' ? null : document.documentElement),
    [target],
  );

  /* ① 属性落地。排在写变量之前，保证任何「读当前生效值」的逻辑拿到的都是新主题。 */
  useIsomorphicLayoutEffect(() => {
    const el = resolveTarget();
    if (!el) return;

    el.setAttribute(THEME_ATTR, resolvedMode);
    el.setAttribute(DENSITY_ATTR, density);

    // 让原生 UI（滚动条、表单控件、自动填充底色）跟随主题。
    // base.less 里也有 color-scheme 声明，这里用内联覆盖是为了让 target 不是 <html> 的场景同样生效。
    el.style.colorScheme = resolvedMode;
  }, [resolveTarget, resolvedMode, density]);

  /* ② 品牌色阶落地。只在「非默认品牌色」时写内联变量 ——
        默认品牌色交给 tokens/palette.less 的静态声明，保持 DOM 干净，
        也让消费方仍能通过 CSS 层覆盖同名变量。 */
  useIsomorphicLayoutEffect(() => {
    const el = resolveTarget();
    if (!el) return;

    if (primaryColor === DEFAULT_PRIMARY_COLOR) {
      for (let level = 1; level <= 10; level += 1) {
        el.style.removeProperty(`${PRIMARY_VAR_PREFIX}${level}`);
      }
      el.style.removeProperty(CONTROL_OUTLINE_VAR);
      return;
    }

    const current = brand[resolvedMode];
    current.palette.forEach((color, index) => {
      el.style.setProperty(`${PRIMARY_VAR_PREFIX}${index + 1}`, color);
    });
    el.style.setProperty(CONTROL_OUTLINE_VAR, current.controlOutline);
  }, [resolveTarget, primaryColor, resolvedMode, brand]);

  /* ③ 持久化。写两套色阶，供防闪屏脚本按当前模式直接回填，无需在关键路径上跑色彩算法。 */
  useEffect(() => {
    if (!persist || typeof window === 'undefined') return;

    try {
      const payload: PersistedConfig = {
        mode,
        density,
        primaryColor,
        brand: {
          light: { palette: brand.light.palette, outline: brand.light.controlOutline },
          dark: { palette: brand.dark.palette, outline: brand.dark.controlOutline },
        },
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // 写失败（配额 / 隐私模式）不影响运行时表现，静默降级为「不持久化」。
    }
  }, [persist, storageKey, mode, density, primaryColor, brand]);

  const setPrimaryColor = useCallback((color: string) => {
    setPrimaryColorState(color || DEFAULT_PRIMARY_COLOR);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      // 从 system 切出去时，切到与「当前实际显示」相反的一侧，
      // 这样点一次必定看得见变化 —— 否则跟随暗色系统时点一下毫无反应。
      if (prev === 'system') return resolvedMode === 'dark' ? 'light' : 'dark';
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, [resolvedMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      density,
      primaryColor,
      resolvedMode,
      setMode,
      setDensity,
      setPrimaryColor,
      toggleMode,
    }),
    [mode, density, primaryColor, resolvedMode, setPrimaryColor, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
