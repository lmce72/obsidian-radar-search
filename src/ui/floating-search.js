import { Component } from 'obsidian';

export class FloatingSearch extends Component {
  constructor(plugin) {
    super();
    this.plugin = plugin;
    this.document = plugin.app.workspace.getMostRecentLeaf()?.view.containerEl.ownerDocument || document;
  }

  async open() {
    this.backdropEl = this.document.body.createDiv({ cls: 'modal-container mod-dim primecore-floating-search-backdrop' });
    this.backdropEl.setAttribute('aria-hidden', 'true');
    Object.assign(this.backdropEl.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '8999',
      touchAction: 'none'
    });
    // Reuse the command palette's backdrop CSS, including theme overrides.
    // 复用命令面板遮罩样式，包含主题对颜色、透明度和模糊效果的覆盖。
    this.backdropBackgroundEl = this.backdropEl.createDiv({ cls: 'modal-bg' });
    this.backdropBackgroundEl.style.opacity = '0.85';
    this.contentEl = this.document.body.createDiv({ cls: 'primecore-floating-search' });
    Object.assign(this.contentEl.style, {
      position: 'fixed',
      top: '30%',
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
