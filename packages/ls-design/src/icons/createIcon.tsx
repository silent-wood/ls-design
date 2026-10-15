import { forwardRef, type HTMLAttributes, type Ref } from 'react';

import { cx } from '../utils';

/**
 * 图标基元
 *
 * ── 为什么不引 @ant-design/icons ────────────────────────────────────────
 * 图标库的价值是「几千个图标的检索与按需加载」，而本仓库只用得到个位数。
 * 引进来会让消费方多一个运行时依赖，且它的样式（.anticon）与我们自己的
 * 命名空间并存，反而增加一层要解释的东西。
 *
 * ── 但视觉契约必须与 antd 完全一致 ──────────────────────────────────────
 * 所以下面这几处不是自创，而是逐项对齐 antd 的 svgBaseProps 与 .anticon 样式：
 *   · 尺寸用 1em —— 让图标自动跟随宿主字号，不需要每个尺寸单独指定
 *   · fill="currentColor" —— 让图标继承文字色，color / disabled 等状态零额外代码
 *   · vertical-align: -0.125em —— 与汉字基线对齐的偏移量，值错了图标就会「飘」
 *   · role="img" + aria-label —— 图标本身可被屏幕阅读器读作有意义的图像
 */
export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** 旋转动画。loading 图标默认开启（与 antd 一致），无需显式传。 */
  spin?: boolean;
  /** 顺时针旋转角度。 */
  rotate?: number;
  ref?: Ref<HTMLSpanElement>;
}

/** 一个图标的静态定义。形状直接对应 @ant-design/icons-svg 的数据结构。 */
export interface IconDefinition {
  /** 类名后缀与默认 aria-label，用小写英文（如 'search'）。 */
  name: string;
  /** 组件 displayName，便于 React DevTools 里辨认。 */
  displayName: string;
  viewBox: string;
  /** 各 path 的 d 属性。按顺序渲染成一个 <svg> 的多个 <path>。 */
  paths: string[];
}

/**
 * 由静态定义生成图标组件。
 *
 * 所有图标共用同一份实现，好处不只是少写代码：任何对齐修正
 * （比如将来 antd 改了垂直对齐偏移）只需改这里一处，不会漏掉某个图标。
 */
export function createIcon({ name, displayName, viewBox, paths }: IconDefinition) {
  const Icon = forwardRef<HTMLSpanElement, IconProps>(function Icon(
    { className, spin, rotate, style, ...rest },
    ref,
  ) {
    // loading 图形天然是旋转的，多要一个 spin prop 属于多余仪式感。
    const mergedSpin = spin ?? name === 'loading';

    return (
      <span
        role="img"
        aria-label={name}
        // {...rest} 放在 aria-label 之后：调用方可以覆盖 aria-label（比如本地化），
        // 但不会因为漏传而丢掉默认值。
        {...rest}
        ref={ref}
        className={cx('ls-icon', `ls-icon-${name}`, mergedSpin && 'ls-icon-spin', className)}
        style={style}
      >
        <svg
          viewBox={viewBox}
          width="1em"
          height="1em"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
          style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
        >
          {paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </span>
    );
  });

  Icon.displayName = displayName;

  return Icon;
}
