import { setIcon, getIcon } from 'obsidian';

export class IconRenderer {
  static name(value) {
    const raw = String(value || '').replaceAll(':', '');
    const match = raw.match(/^(Li|Ri|Si|Fi|Fa|Bi|Bs|Tb|Md)([A-Z].*)$/);
    if (match) return match[1] === 'Li' ? match[2].replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() : 'sliders-horizontal';
    return raw.toLowerCase() || 'files';
  }
  static setIcon(element, value, size) {
    const name = this.name(value);
    setIcon(element, getIcon(name) ? name : 'files');
    const svg = element.querySelector('svg');
    if (svg && size) { svg.style.setProperty('width', `${size}px`); svg.style.setProperty('height', `${size}px`); }
  }
}
