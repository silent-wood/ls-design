/**
 * 工具层出口
 *
 * 只导出组件层真正会用到的部分。getAlphaColor 不在这里导出 ——
 * 它服务于主题层内部（见 src/utils/color.ts 的说明），
 * 属于实现细节，暴露出去只会让「谁能算主题色」这件事出现两个答案。
 */
export { cx } from './cx';
export { composeRefs, setRef } from './refs';
export { isRenderable, isTwoCNChar } from './string';
