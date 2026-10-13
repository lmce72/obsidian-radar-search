import { Component } from 'obsidian';

export class FloatingSearch extends Component {
  constructor(plugin) {
    super();
    this.plugin = plugin;
    this.document = plugin.app.workspace.getMostRecentLeaf()?.view.containerEl.ownerDocument || document;
  }

  async open() {
    this.backdropEl = this.document.body.createDiv({ cls: 'primecore-floating-search-backdrop' });
    this.backdropEl.setAttribute('aria-hidden', 'true');
    Object.assign(this.backdropEl.style, {
      position: 'fixed',
      inset: '0',
      backgroundColor: 'rgb(0, 0, 0)',
      opacity: '0.7',
      zIndex: '8999',
      touchAction: 'none'
    });
    this.contentEl = this.document.body.createDiv({ cls: 'primecore-floating-search' });
    Object.assign(this.contentEl.style, {
      position: 'fixed',
      top: '35%',
      left: '15%',
      width: '70%',
      zIndex: '9000'
    });
    this.load();
    try {
      const component = await this.plugin.mount(this.contentEl, this);
      if (this.plugin.floatingSearch === this) component._focusInput();
    } catch (error) {
      this.plugin.report('error', '浮动搜索框打开失败', error);
      this.close();
    }
  }

  onload() {
    this.registerDomEvent(this.backdropEl, 'pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    });
    this.registerDomEvent(this.document, 'keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }, true);
    this.registerDomEvent(this.document, 'pointerdown', event => {
      const component = this.plugin.components.get(this.contentEl)?.component;
      const layers = [this.contentEl, component?._dropdown, component?._scopeMenu,
        component?._vaultSearchPanel, component?._panelMask, component?._sourceEditor];
      if (!layers.some(element => element?.contains(event.target))) this.close();
    });
    this.register(() => {
      this.backdropEl.remove();
      this.contentEl.remove();
      if (this.plugin.floatingSearch === this) this.plugin.floatingSearch = null;
    });
  }

  close() {
    this.plugin.unmount(this.contentEl);
    this.unload();
  }
}
