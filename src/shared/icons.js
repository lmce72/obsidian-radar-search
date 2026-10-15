import { setIcon, getIcon } from 'obsidian';
import { PLUGIN_ICON_ID } from './plugin-icon.js';

export class IconRenderer {
  static name(value) {
    const name=String(value||'').trim().toLowerCase();
    return name==='search'?PLUGIN_ICON_ID:name||'files';
  }
  static setIcon(element, value, size) {
    const name = this.name(value);
    setIcon(element, getIcon(name) ? name : 'files');
    const svg = element.querySelector('svg');
    if (svg && size) { svg.style.setProperty('width', `${size}px`); svg.style.setProperty('height', `${size}px`); }
  }
}
