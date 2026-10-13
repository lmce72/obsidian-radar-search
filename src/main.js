import { Plugin, ItemView, MarkdownRenderChild, Notice } from 'obsidian';
import { SearchBarComponent } from './ui/search-bar.js';
import { FloatingSearch } from './ui/floating-search.js';
import { createSearchIndexEngine } from './search/index-engine.js';
import { SettingsStore } from './settings/store.js';
import { SearchSettingTab } from './settings/tab.js';
import { HistoryStore } from './history/store.js';

const VIEW_TYPE='primecore-search';
class SearchView extends ItemView {
  constructor(leaf,plugin) { super(leaf);this.plugin=plugin; }
  getViewType() {return VIEW_TYPE;}
  getDisplayText() {return 'PrimeCore 搜索';}
  getIcon() {return 'search';}
  async onOpen() {this.contentEl.empty();await this.plugin.mount(this.contentEl,this);}
  async onClose() {this.plugin.unmount(this.contentEl);}
}

export default class PrimeCoreSearchPlugin extends Plugin {
  async onload() {
    this.components=new Map();
    this._stopping=false;
    this._refreshQueue=Promise.resolve();
    this.store=new SettingsStore(this);
    this.settings=await this.store.load();
    this.indexEngine=createSearchIndexEngine();
    this.history=new HistoryStore(this);
    await this.history.initialize();
    this.addSettingTab(new SearchSettingTab(this.app,this));
    this.registerView(VIEW_TYPE,leaf=>new SearchView(leaf,this));
    this.addRibbonIcon('search','打开浮动搜索框',()=>this.openFloatingSearch());
    this.addCommand({id:'open-floating-search',name:'打开浮动搜索框',callback:()=>this.openFloatingSearch()});
    this.addCommand({id:'open-search-page',name:'打开搜索页',callback:()=>this.openSearchPage()});
    this.addCommand({id:'rebuild-index',name:'重建搜索索引',callback:()=>this.refreshComponents()});
    this.registerMarkdownCodeBlockProcessor('primecore-search',async(_source,el,ctx)=>{
      const owner=new MarkdownRenderChild(el);ctx.addChild(owner);await this.mount(el,owner);
    });
    if (this.store.migrated) new Notice('已复制原搜索栏配置到 PrimeCore 搜索插件设置');
  }
  report(level,...args) {
    if (this.settings?.debug) console[level]('[PrimeCore Search]',...args);
    if (level==='error') new Notice(`PrimeCore 搜索：${String(args[0])}`);
  }
  async updateSetting(key,value,refresh=false) {
    await this.store.update(key,value);
    if (refresh) await this.refreshComponents();
  }
  async mount(container,owner) {
    this.unmount(container);
    const component=new SearchBarComponent(this,container);
    const record={component,owner};
    this.components.set(container,record);
    component.register(()=>{if(this.components.get(container)===record)this.components.delete(container);});
    owner.addChild(component);
    await component.render();
    return component;
  }
  unmount(container) {
    const record=this.components.get(container);
    if (!record) return;
    record.owner.removeChild(record.component);
    this.components.delete(container);
  }
  async refreshComponents() {
    const operation=this._refreshQueue.catch(error=>this.report('error','上次刷新失败',error)).then(()=>this.rebuildMountedComponents());
    this._refreshQueue=operation;return operation;
  }
  async rebuildMountedComponents() {
    if(this._stopping)return;
    const mounted=[...this.components.entries()];
    mounted.forEach(([container])=>this.unmount(container));
    this.indexEngine.dispose();
    for (const [container,{owner}] of mounted) if(!this._stopping && container.isConnected) await this.mount(container,owner);
  }
  openFloatingSearch() {
    if(this.floatingSearch) {this.components.get(this.floatingSearch.contentEl)?.component._focusInput();return;}
    this.floatingSearch=new FloatingSearch(this);
    this.floatingSearch.open();
  }
  async openSearchPage() {
    let leaf=this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {leaf=this.app.workspace.getLeaf('tab');await leaf.setViewState({type:VIEW_TYPE,active:true});}
    await this.app.workspace.revealLeaf(leaf);
    this.components.get(leaf.view.contentEl)?.component._focusInput();
  }
  onunload() {
    this._stopping=true;
    this.floatingSearch?.close();
    for (const container of [...this.components.keys()]) this.unmount(container);
    this.indexEngine?.dispose();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
}
