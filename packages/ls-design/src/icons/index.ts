/**
 * 图标层出口
 *
 * Icon.less 在这里副作用导入一次：任何用到图标的地方都会经这个 barrel，
 * 因此样式一定被带上；分散到各图标文件导入会导致重复声明被去重后顺序不可控。
 */
import './Icon.less';

export { createIcon, type IconDefinition, type IconProps } from './createIcon';
export { DownloadOutlined, LoadingOutlined, PlusOutlined, SearchOutlined } from './outlined';
