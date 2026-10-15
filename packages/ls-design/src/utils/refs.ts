import type { MutableRefObject, Ref } from 'react';

/** React 19 起 ref 回调的返回值有了语义（可作为清理函数），因此不能顺手返回赋值结果。 */
type RefCallback<T> = (instance: T | null) => void | (() => void);

/**
 * 把一次 ref 赋值同时分发给「一个 ref 对象」和「一个 ref 回调」。
 *
 * 组件库里为什么必须自备这个：组件对外要透传 ref（forwardRef），
 * 对内又要持有同一个 DOM 节点（测两汉字、setTimeout 后聚焦等）。
 * 直接写 `ref={ref}` 就丢掉了内部的 ref，写 `ref={innerRef}` 又丢掉了对外的。
 */
export function setRef<T>(ref: Ref<T> | undefined, instance: T | null): void {
  if (typeof ref === 'function') {
    (ref as RefCallback<T>)(instance);
    return;
  }

  if (ref) {
    (ref as MutableRefObject<T | null>).current = instance;
  }
}

/**
 * 合并任意多个 ref（对象或回调）。
 * 返回的回调每次调用都会把同一个实例分发给全部 ref，顺序与传入一致。
 */
export function composeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (instance) => {
    // 用 for 而非 forEach：这里要保证「回调 ref 的清理函数」不会提前 return。
    for (const ref of refs) {
      setRef(ref, instance);
    }
  };
}
