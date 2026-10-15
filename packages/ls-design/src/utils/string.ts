/**
 * 字符串工具（与框架无关）
 */

/** 恰好两个汉字。用于「两汉字按钮」的字距补偿，规则与 antd 一致。 */
const TWO_CN_CHAR = /^[\u4E00-\u9FA5]{2}$/;

/**
 * 判断文本是否恰好是两个汉字。
 *
 * 为什么限定「恰好两个」：这条规则解决的是「两汉字按钮比四字/三字按钮显得过挤」，
 * 三个及以上汉字时视觉密度已经正常，再插空格反而松散。
 */
export function isTwoCNChar(text: string): boolean {
  return TWO_CN_CHAR.test(text);
}

/** 值是否会被 React 渲染成可见内容（null / undefined / boolean 不渲染）。 */
export function isRenderable(value: unknown): boolean {
  return value !== null && value !== undefined && typeof value !== 'boolean';
}
