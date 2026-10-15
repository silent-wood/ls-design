/**
 * 极小的类名拼接工具
 *
 * 为什么不装 clsx / classnames：
 *   库对外发布的每个依赖都会成为消费方的负担，而这里需要的全部能力就是
 *   「过滤假值 + 拼空格」。为此引一个包不划算。
 *   取舍代价是：不支持对象/数组嵌套（clsx 能写 `cx('a', ['b', { c: true }])`）。
 *   本项目统一用 `cx('a', cond && 'b')` 的单层写法，够用且更直白。
 */
type ClassValue = string | number | false | null | undefined;

export function cx(...values: ClassValue[]): string {
  let result = '';

  for (const value of values) {
    if (!value && value !== 0) continue;
    result = result ? `${result} ${value}` : String(value);
  }

  return result;
}
