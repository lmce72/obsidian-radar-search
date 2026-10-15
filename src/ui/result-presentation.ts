import type {SearchSession} from '../types.ts';
import {availableCategories,filterResultGroups} from '../search/result-categories.ts';

const SESSION_FIELDS={_contentSearch:'vaultContentSearch',_searchTags:'searchTags',_searchWikiLinks:'searchWikiLinks',
  _searchMdLinks:'searchMdLinks',_searchBookmarks:'searchBookmarks',_searchProperties:'searchProperties',_searchCommands:'searchCommands',
  _searchNonMarkdown:'searchNonMarkdown',_extendedContext:'extendedContext',_selectedPreset:'defaultPreset',
  _limitContentResults:'limitContentResults',_vaultSortMode:'vaultSortMode',_activeEngineId:'activeEngineId'} as const;

export const withResultPresentation=Base=>class extends Base {
  getSearchSession():SearchSession {
    const settings=structuredClone(this.cfg);
    for(const [field,key] of Object.entries(SESSION_FIELDS))Reflect.set(settings,key,this[field]);
    return {query:this._input?.value.trim()||'',mode:this._mode,category:this._resultCategory,temporaryFilter:this._temporaryFilter?structuredClone(this._temporaryFilter):undefined,settings};
  }
  async applySearchSession(session:SearchSession) {
    ++this._historyVer;++this._vaultSearchVer;++this._webSearchVer;
    clearTimeout(this._debounceTimer);this._debounceTimer=null;
    this._resultToolView='results';this._toolListEditor?.dispose();
    this._temporaryFilter=session.temporaryFilter?structuredClone(session.temporaryFilter):null;
    this.cfg=structuredClone(session.settings);
    for(const [field,key] of Object.entries(SESSION_FIELDS))this[field]=this.cfg[key];
    this._groupPages.clear();this._lastGroups=null;
    this._input.value=session.query;this._syncClearBtn();
    this._selectMode(session.mode,false);
    this._resultCategory=session.category;this._resultCategoryChosen=true;
    if(session.query)await this._doSearch(session.query);
  }
  _syncSearchAction() {
    this._goBtn.style.display=this._mode==='web'?'flex':'none';
    this._goBtn.setAttribute('aria-label','搜索互联网');
  }
  _openResultsPage() {
    const session=this.getSearchSession();
    if(!session.query)return;
    this.plugin.openSearchPage(session).catch(error=>this._log('error','打开搜索页失败',error));
  }
  _renderResultCategories() {
    const el:HTMLElement=this._barLeft;
    const restoreFocus=el.contains(el.ownerDocument.activeElement);
    el.empty();el.addClass('primecore-result-tabs');el.setAttribute('role','tablist');el.setAttribute('aria-label','搜索结果分类');
    const categories=availableCategories(this.getSearchSession().settings,this._mode,this._input.value.trim());
    const groups:{title?:string;items:unknown[]}[]=this._lastGroups||[];
    const counts=new Map(categories.map(category=>[category.id,filterResultGroups(groups,category.id).reduce((n,g)=>n+g.items.length,0)]));
    if(!categories.some(c=>c.id===this._resultCategory))this._resultCategory=categories[0]?.id||'web';
    if(!this._resultCategoryChosen&&!counts.get(this._resultCategory))this._resultCategory=categories.find(c=>counts.get(c.id)>0)?.id||this._resultCategory;
    for(const category of categories) {
      const active=category.id===this._resultCategory;
      const button=el.createEl('button',{cls:'primecore-result-tab',attr:{role:'tab','aria-selected':String(active),'data-category':category.id}});
      button.tabIndex=active?0:-1;
      button.setAttribute('aria-controls',this._dropdownInner.id);
      this._setIcon(button.createSpan(),category.icon,14);button.createSpan({text:category.label});
      button.createSpan({cls:'primecore-result-tab-count',text:String(counts.get(category.id)||0)});
      this._listen(button,'mousedown',event=>event.preventDefault());
      const select=()=>{this._resultCategory=category.id;this._resultCategoryChosen=true;this._activeIdx=-1;this._renderDropdown(this._lastGroups||[]);};
      const handler=this._makeTouchHandler(event=>{event.stopPropagation();select();});
      this._listen(button,'touchstart',handler.onTouchStart,{passive:true});
      this._listen(button,'touchend',event=>{event.stopPropagation();handler.onTouchEnd(event);});
      this._listen(button,'click',event=>{event.stopPropagation();select();});
      this._listen(button,'keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();event.stopPropagation();
        const tabs=Array.from(el.querySelectorAll<HTMLButtonElement>('[role=tab]'));
        const index=tabs.indexOf(button);
        const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        tabs[next].click();this._barLeft.querySelector('[aria-selected=true]')?.focus();
      });
    }
    if(!categories.length) {el.removeAttribute('role');el.createSpan({text:'搜索结果'});}
    this._dropdownInner.setAttribute('aria-label',categories.find(c=>c.id===this._resultCategory)?.label||'搜索结果');
    if(restoreFocus)el.querySelector<HTMLButtonElement>('[aria-selected=true]')?.focus();
  }
  _visibleResultGroups(groups) {return filterResultGroups(groups,this._resultCategory);}
};
