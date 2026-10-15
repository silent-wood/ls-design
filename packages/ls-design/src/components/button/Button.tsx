import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { LoadingOutlined } from '../../icons';
import { composeRefs, cx, isRenderable, isTwoCNChar } from '../../utils';

import './Button.less';

/**
 * 按钮。
 *
 * ── API 取向 ────────────────────────────────────────────────────────────
 * 采用 antd 6 的两个正交属性来表达外观，而不是 v4/v5 的单一 `type`：
 *
 *   variant —— 外形（outlined / dashed / solid / filled / text / link）
 *   color   —— 语义色（default / primary / danger）
 *
 * 拆开的价值在于能表达原来表达不出的组合，比如「虚线红框按钮」：v5 里
 * danger 会把外观强制成主色实心，只能二选一。两个属性各自映射到一层 CSS 变量，
 * 组合数从 5 个枚举值变成 6×3 的正交矩阵，而样式代码只多了两个变量块。
 *
 * 有意不提供的部分：
 *   · 旧 `type` 属性 —— 保留它就要维护一张映射表，且两套 API 打架时行为不可预测。
 *     这个仓库不背迁移包袱。
 *   · 预设色（cyan / purple / geekblue … 13 种）—— 每种都要一整套 10 级色阶，
 *     属于「等真正用到再加」的一类。
 *   · Button.Group / 与 Space.Compact 的联动 —— 依赖尚未实现的其他组件。
 */

export type ButtonVariant = 'outlined' | 'dashed' | 'solid' | 'filled' | 'text' | 'link';
export type ButtonColor = 'default' | 'primary' | 'danger';
export type ButtonShape = 'default' | 'circle' | 'round' | 'square';
export type ButtonSize = 'small' | 'middle' | 'large';
export type ButtonIconPlacement = 'start' | 'end';

/** `loading` 传对象形态时的配置。 */
export interface ButtonLoadingConfig {
  /**
   * 延迟多少毫秒才显示 loading。
   *
   * 用途：接口常几十毫秒就返回，立刻显示 loading 会让界面闪一下，反而比不显示更显慢。
   * 设 100~200ms 可让快请求完全无感。
   *
   * ⚠️ 实测语义（与 antd 一致）：延时只作用在「从非 loading 跃迁到 loading」这一跳上。
   *    如果按钮**初次挂载时就是 loading**，会立即显示转圈，不等延时 ——
   *    因为初始状态直接取自入参，还没有发生任何跃迁。
   */
  delay?: number;
  /** 自定义 loading 图标，替代默认的旋转圆弧。 */
  icon?: ReactNode;
}

export interface ButtonProps
  // `type` 与 `color` 必须去掉：前者与 `htmlType` 语义重复且极易误用（不写等于 submit）；
  // 后者在 DOM 上是 CSS 颜色字符串，与本组件的语义色枚举完全不是一回事。
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'color'> {
  /** 外形。默认 `outlined`。 */
  variant?: ButtonVariant;
  /** 语义色。默认 `default`。 */
  color?: ButtonColor;
  /** 等价于 `color="danger"`。保留这个名字是为了让 antd 用户少一次心智转换。 */
  danger?: boolean;
  /** 形状。`circle` 为圆形（直径等于控件高度），`round` 为胶囊。 */
  shape?: ButtonShape;
  /** 尺寸。默认 `middle`（不产生尺寸类名）。 */
  size?: ButtonSize;
  /** 加载态。为真时按钮不可点、整体透明度降到 `--ls-opacity-loading`。 */
  loading?: boolean | ButtonLoadingConfig;
  /** 图标。与 `children` 同时存在时，间距为 `--ls-btn-icon-gap`。 */
  icon?: ReactNode;
  /** 图标位置。默认 `start`（文字之前）。 */
  iconPlacement?: ButtonIconPlacement;
  /** 幽灵态：背景透明，用于彩色底（如主色横幅）上的按钮。 */
  ghost?: boolean;
  /** 撑满父容器宽度。 */
  block?: boolean;
  /**
   * 原生 `type`。默认 `'button'`。
   *
   * 为什么改名：`type` 这个名字在旧版 antd 里被用作「按钮外观」，
   * 且 <form> 内不写 type 的原生按钮默认是 `submit`，会意外提交表单 ——
   * 所以默认值必须是 `button`，名字也必须让位。
   */
  htmlType?: 'submit' | 'reset' | 'button';
  /**
   * 是否在两个汉字之间自动插入间距。默认 `true`。
   * 关掉它可用在「按钮宽度必须精确」的场景。
   */
  autoInsertSpace?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/** text / link 无边框，两汉字补偿对它们没有意义（antd 同此判断）。 */
function isUnBorderedVariant(variant: ButtonVariant): boolean {
  return variant === 'text' || variant === 'link';
}

/**
 * 把 `variant` / `color` / `danger` 三个入口收敛成唯一一对 (color, variant)。
 *
 * 重叠时以显式传的为准：
 *   1. 两个都传 —— 直接用
 *   2. 传了 danger —— color 定为 danger，variant 取显式值，缺省 outlined
 *      （注：antd 在只传 danger 时会忽略 variant，这里不复制这个会丢信息的怪癖）
 *   3. 只传 color —— variant 缺省 outlined
 *   4. 只传 variant —— solid 视为 primary（"实心"必然要有个底色），其余为 default
 *   5. 都没传 —— default + outlined
 */
function resolveColorVariant(
  color: ButtonColor | undefined,
  variant: ButtonVariant | undefined,
  danger: boolean | undefined,
): [ButtonColor, ButtonVariant] {
  if (color && variant) return [color, variant];
  if (danger) return ['danger', variant ?? 'outlined'];
  if (color) return [color, variant ?? 'outlined'];
  if (variant) return [variant === 'solid' ? 'primary' : 'default', variant];
  return ['default', 'outlined'];
}

/** 规整 loading：布尔与对象两种入参统一成一个结构。 */
function normalizeLoading(loading: boolean | ButtonLoadingConfig | undefined) {
  if (typeof loading === 'object' && loading !== null) {
    return { loading: true, delay: loading.delay ?? 0, icon: loading.icon };
  }
  return { loading: !!loading, delay: 0, icon: undefined as ReactNode };
}

/**
 * 把纯文本子节点逐个包进 <span>。
 *
 * 两个理由：
 *   1. 两汉字补偿用的是 `.ls-btn-two-chinese-chars > *:not(.ls-icon)` 这类子选择器，
 *      裸文本节点不匹配任何选择器，字距样式无处落脚。
 *   2. 顺带合并相邻的字符串子节点（`{'a'}{'b'}` 与 `'ab'` 等价但会被 React
 *      渲染成两个文本节点），否则它们之间会被 flex gap 插入 8px 空隙。
 */
function spaceChildren(children: ReactNode, needInserted: boolean): ReactNode {
  let isPrevChildPure = false;
  const childList: ReactNode[] = [];

  Children.forEach(children, (child) => {
    const isCurrentChildPure = typeof child === 'string' || typeof child === 'number';

    if (isPrevChildPure && isCurrentChildPure) {
      const lastIndex = childList.length - 1;
      childList[lastIndex] = `${childList[lastIndex]}${child}`;
    } else {
      childList.push(child);
    }

    isPrevChildPure = isCurrentChildPure;
  });

  return Children.map(childList, (child) => {
    if (!isRenderable(child)) return child;

    // 数字同样需要包装：它渲染出的也是可被字距规则命中的文本。
    if (typeof child === 'string' || typeof child === 'number') {
      const text = String(child);
      return <span>{isTwoCNChar(text) && needInserted ? text.split('').join(' ') : text}</span>;
    }

    // Fragment 无法承载 className，包一层 span 才能让它成为可被选中的子元素。
    if (isValidElement(child) && child.type === Fragment) {
      return <span>{child}</span>;
    }

    return child;
  });
}

/**
 * 图标容器。
 * 独立成 span 而不是把图标直接当子元素，是为了让 flex gap 只在
 * 「图标 ↔ 文字」之间生效，而不在图标与它自己的 svg 之间产生间距。
 */
function IconWrapper({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cx('ls-btn-icon', className)}>{children}</span>;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const {
    variant,
    color,
    danger,
    shape = 'default',
    size = 'middle',
    loading,
    icon,
    iconPlacement = 'start',
    ghost = false,
    block = false,
    htmlType = 'button',
    autoInsertSpace = true,
    className,
    children,
    disabled,
    onClick,
    ...rest
  } = props;

  const [mergedColor, parsedVariant] = resolveColorVariant(color, variant, danger);

  // 幽灵 + 实心是矛盾组合（透明底上看不见实心色块），降级成描边。
  // 让「幽灵」的语义优先于「实心」—— 它表达的是所处环境，环境不该被覆盖。
  const mergedVariant: ButtonVariant =
    ghost && parsedVariant === 'solid' ? 'outlined' : parsedVariant;

  const isDangerous = mergedColor === 'danger';

  /* ── loading 延时 ───────────────────────────────────────────────── */
  const loadingConfig = useMemo(() => normalizeLoading(loading), [loading]);
  const [innerLoading, setInnerLoading] = useState(loadingConfig.loading);

  useEffect(() => {
    // 无延时：直接跟随入参，少一帧。
    if (!loadingConfig.delay) {
      setInnerLoading(loadingConfig.loading);
      return;
    }
    // 有延时：退出必须立即生效（否则「点了取消还挂着 200ms」会让人以为没点上），
    // 进入才计时。
    if (!loadingConfig.loading) {
      setInnerLoading(false);
      return;
    }

    const timer = window.setTimeout(() => setInnerLoading(true), loadingConfig.delay);
    return () => window.clearTimeout(timer);
  }, [loadingConfig.loading, loadingConfig.delay]);

  /**
   * loading 图标的展开动画。
   * 用一个 rAF 把「已挂载」和「已展开」拆成两帧 —— CSS transition 需要在两个
   * 各自完成过样式的状态之间才有过渡，同一帧内挂类又改宽度不会产生动画。
   */
  const [iconAppeared, setIconAppeared] = useState(false);

  useEffect(() => {
    if (!innerLoading) {
      setIconAppeared(false);
      return;
    }
    const raf = window.requestAnimationFrame(() => setIconAppeared(true));
    return () => window.cancelAnimationFrame(raf);
  }, [innerLoading]);

  /* ── 两汉字补偿 ─────────────────────────────────────────────────── */
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hasTwoCNChar, setHasTwoCNChar] = useState(false);

  const childCount = Children.toArray(children).length;
  // 只有「纯两汉字」才补偿：带图标时已有视觉分隔，无边框变体则不需要。
  const needInserted = childCount === 1 && !icon && !isUnBorderedVariant(mergedVariant);

  /**
   * ⚠️ 一个实测出来的反直觉结论（antd 自身的实现细节）：
   *
   * 下面这个 effect 在 antd 里**永远不会把 hasTwoCNChar 置为 true**，
   * 因此 `ls-btn-two-chinese-chars` 这个类实际上加不上。
   *
   * 原因：空格在【渲染阶段】就已经插入了（`needInserted` 参与 spaceChildren），
   * 所以首帧之后 textContent 读到的是「确 定」（3 个字符，含空格），
   * 而 isTwoCNChar 只匹配「恰好两个汉字」，判定必然为 false。
   * 真正产生视觉效果的是那个被插入的空格，不是那条 letter-spacing 补偿规则。
   *
   * 既然照抄了 DOM 又与 CSS 逐条对齐，最终像素就必然一致 —— 谁"本该"生效并不影响结果。
   * 所以这里仍然完整保留 effect 与补偿类（antd 将来若修掉这个时序问题，
   * 我们会自动一起"修好"，而不是先一步跑偏）。
   */
  // 无依赖数组：antd 同样每次渲染都重新判定 —— textContent 的变化可能来自
  // 子节点内部（如 <FormatMessage/>），React 不会把它反映到本组件的任何 prop 上。
  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return;

    const text = node.textContent ?? '';
    const shouldInsert = autoInsertSpace && needInserted && isTwoCNChar(text);

    setHasTwoCNChar((prev) => (prev === shouldInsert ? prev : shouldInsert));
  });

  /* ── 图标与内容 ─────────────────────────────────────────────────── */
  const iconNode = useMemo(() => {
    // 加载中优先显示 loading 图标：此时不显示业务图标，避免两个图标并排。
    if (innerLoading) {
      return (
        <IconWrapper
          className={cx('ls-btn-loading-icon', iconAppeared && 'ls-btn-loading-icon-active')}
        >
          {loadingConfig.icon ?? <LoadingOutlined />}
        </IconWrapper>
      );
    }

    if (isRenderable(icon)) return <IconWrapper>{icon}</IconWrapper>;
    return null;
  }, [innerLoading, iconAppeared, loadingConfig.icon, icon]);

  const contentNode = isRenderable(children)
    ? spaceChildren(children, needInserted && autoInsertSpace)
    : null;

  const mergedDisabled = disabled ?? false;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // 加载中与禁用态都要拦住点击。用 preventDefault 而不是直接 return：
      // 按钮可能被包在 <form> 或 <a> 里，不阻止默认行为会照样提交或跳转。
      if (innerLoading || mergedDisabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    },
    [innerLoading, mergedDisabled, onClick],
  );

  /**
   * 纯图标按钮。`children !== 0` 是为了让 `<Button>{0}</Button>` 被当作
   * 有内容（数字 0 是合法渲染结果），而不是纯图标按钮。
   */
  const isIconOnly = !children && children !== 0 && (innerLoading || isRenderable(icon));

  const classes = cx(
    'ls-btn',
    // shape 的 default 与 square 都不产生类名：square 表示「不要圆角」，
    // 由 border-radius: 0 的独立规则处理（见 Button.less）。
    shape !== 'default' && shape !== 'square' && `ls-btn-${shape}`,
    `ls-btn-color-${isDangerous ? 'dangerous' : mergedColor}`,
    `ls-btn-variant-${mergedVariant}`,
    size === 'small' && 'ls-btn-sm',
    size === 'large' && 'ls-btn-lg',
    isIconOnly && 'ls-btn-icon-only',
    ghost && !isUnBorderedVariant(mergedVariant) && 'ls-btn-background-ghost',
    innerLoading && 'ls-btn-loading',
    // antd 的条件是 hasTwoCNChar && insertSpace && !loading，逐项照抄。
    hasTwoCNChar && autoInsertSpace && !innerLoading && 'ls-btn-two-chinese-chars',
    block && 'ls-btn-block',
    iconPlacement === 'end' && 'ls-btn-icon-end',
    className,
  );

  return (
    <button
      // aria-busy 让屏幕阅读器知道「这里在忙」，而不只是一片静止内容。
      // 放在 {...rest} 之前，调用方显式传入时以调用方为准。
      aria-busy={innerLoading || undefined}
      {...rest}
      type={htmlType}
      className={classes}
      onClick={handleClick}
      disabled={mergedDisabled}
      ref={composeRefs(ref, buttonRef)}
    >
      {iconNode}
      {contentNode}
    </button>
  );
});

Button.displayName = 'Button';
