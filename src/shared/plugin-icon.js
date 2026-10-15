import { addIcon } from 'obsidian';
import svg from '../../assets/search-radar.svg' with { type: 'text' };

export const PLUGIN_ICON_ID='primecore-search-logo';
export function registerPluginIcon() {
  const paths=svg.trim().replace(/^<svg\b[^>]*>/,'').replace(/<\/svg>$/,'');
  // Obsidian custom icons use a 100 × 100 viewBox; the artwork uses 24 × 24.
  // Obsidian 自定义图标使用 100 × 100 坐标，统一缩放 24 × 24 原稿。
  addIcon(PLUGIN_ICON_ID,`<g transform="scale(${100/24})">${paths}</g>`);
}
