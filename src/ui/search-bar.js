import { Component } from 'obsidian';
import { withLayout } from '../ui/layout.js';
import { withPanel } from '../ui/options-panel.js';
import { withWebOptions } from '../ui/web-options.js';
import { withNavigation } from '../ui/navigation.js';
import { withResults } from '../ui/results.js';
import { withSnippets } from '../search/snippets.js';
import { withIndexIntegration } from '../search/index-integration.js';
import { withVaultSearch } from '../search/vault-search.js';
import { withGlobalSearch } from '../search/global-search.js';
import { withWebSearch } from '../search/web-search.js';
import { withInteractions } from '../ui/interactions.js';
import { withMetadataSearch } from '../search/metadata-search.js';
import { withHistory } from '../history/history-behavior.js';
import { withEvents } from '../ui/events.js';
const Behavior = [withLayout, withPanel, withWebOptions, withNavigation, withResults, withSnippets, withIndexIntegration, withVaultSearch, withGlobalSearch, withWebSearch, withInteractions, withMetadataSearch, withHistory, withEvents].reduce((Base, mixin) => mixin(Base), Component);
export class SearchBarComponent extends Behavior {
constructor(plugin, container) {
            super();
            const appInst = plugin.app;
            const cfg = structuredClone(plugin.settings);
            this.plugin = plugin;
            this._disposed = false;
            this._timers = new Set();
            this._frames = new Set();
            
            this.container = container;
            this.app = appInst;
            this.cfg = cfg;

            // 搜索模式：global | vault | web，从配置读取默认值
            this._mode = cfg.defaultMode || "global";
            // 当前高亮项索引
            this._activeIdx = -1;
            // 下拉中的所有 item 元素引用
            this._itemEls = [];
            // web 搜索 AbortController 列表（每次输入前 abort 上一批）
            this._abortCtrls = [];
            // 防抖计时器
            this._debounceTimer = null;
            // 历史下拉版本计数器（取消竞态：focus 触发的 _showHistory 被输入打断时丢弃结果）
            this._historyVer = 0;
            // vault/global 内容搜索版本计数器（与 _webSearchVer 模式相同）
            this._vaultSearchVer = 0;
            // 内容搜索内存开关（初始从 cfg 读取，面板内 toggle 实时翻转）
            this._contentSearch = !!cfg.vaultContentSearch;
            // pill 上搜索选项按钮 DOM 引用
            this._contentToggleBtn = null;
            // 搜索选项气泡面板 DOM 引用
            this._vaultSearchPanel = null;
            // 底部卡片遮罩 DOM 引用（面板与模式菜单共用）
            this._panelMask = null;
            // 是否收到过真实触摸事件（粘性标志，见 _isTouchDevice）
            this._sawTouchInput = false;
            // 索引引擎引用计数与增量刷新监听（见 _setupIndexEngine / _teardownIndexFlush）
            this._engineRetained = false;
            this._cleanedUp = false;
            this._indexFlushBound = false;
            this._indexFlushTimer = null;
            this._indexBlurHandler = null;
            this._indexVisHandler = null;
            // 当前是否处于底部卡片布局（每次呈现前由 _isSheetLayout 重算）
            this._bottomSheet = false;
            // 面板开关状态
            this._vaultPanelOpen = false;
            // 排序模式
            this._vaultSortMode = cfg.vaultSortMode || "mtime-desc";
            // 专项搜索开关（命令为默认开启：配置缺省视为 true，可用面板开关关闭）
            this._searchWikiLinks = !!cfg.searchWikiLinks;
            this._searchMdLinks   = !!cfg.searchMdLinks;
            this._searchBookmarks = !!cfg.searchBookmarks;
            this._searchTags      = !!cfg.searchTags;
            this._searchCommands  = cfg.searchCommands !== false;
            // 非 markdown 文件搜索：默认关闭（配置缺省视为 false）
            this._searchNonMarkdown = !!cfg.searchNonMarkdown;
            // YAML 属性（frontmatter）搜索：默认关闭（新增匹配源不改变既有结果集）
            this._searchProperties = !!cfg.searchProperties;
            this._extendedContext = !!cfg.extendedContext;
            // 当前选中预设名
            this._selectedPreset  = cfg.defaultPreset || "";
            // 是否限制内容匹配结果数量（false=不限制，依赖分页；true=按数字框截断）
            this._limitContentResults = typeof cfg.limitContentResults === "boolean" ? cfg.limitContentResults : false;
            // 浮层窗口焦点计数器：每次激活浮层时递增，模拟窗口管理器 z-index 优先级
            this._zCounter = 0;

            // 历史记录分页状态
            this._historyPage     = 1;
            this._historyPageSize = Number(cfg.historyPageSize) || 8;
            // 显示所有历史记录开关（不分日期）
            this._showAllHistory  = false;

            // 下拉分组分页状态（Map: groupKey → currentPage）
            this._groupPages      = new Map();
            // 分组展开状态（标题 → 是否展开）与最近一次分组快照（供展开/收起后重渲染）
            // 兼容早期只存「已展开专项分组数组」的 expandedResultGroups 键
            this._groupState = (cfg.resultGroupState && typeof cfg.resultGroupState === "object" && !Array.isArray(cfg.resultGroupState))
                ? Object.assign({}, cfg.resultGroupState)
                : (Array.isArray(cfg.expandedResultGroups)
                    ? Object.fromEntries(cfg.expandedResultGroups.map(t => [t, true]))
                    : {});
            this._lastGroups = null;
            this._dropdownPageSize = Number(cfg.dropdownPageSize) || 10;

            // DOM 引用
            this._wrap = null;
            this._pill = null;
            this._scopeBtn = null;
            this._input = null;
            this._goBtn = null;
            this._dropdown = null;
            this._dropdownInner = null;
            this._scopeMenu = null;
            // 清除按钮（输入框右侧，有内容时显示）
            this._clearBtn = null;
            // 连续坐标跟踪 rAF id
            this._rafId = null;

            // ── 互联网搜索扩展状态 ────────────────────────────────────────────
            // 当前选中引擎 id（null = 使用所有已启用引擎）
            this._activeEngineId  = cfg.activeEngineId || null;
            // 信息源编辑模式开关
            this._webEditMode     = false;
            // 信息源 chip 行 DOM 引用（编辑模式重渲染用）
            this._webSourceRowEl  = null;
            // 信息源编辑按钮 DOM 引用
            this._sourceEditBtnEl = null;
            // engineId → chipEl（用于刷新引擎高亮）
            this._engineChipEls   = new Map();
            // 搜索引擎选择器 chip 容器 DOM 引用（供 _refreshEngineChips 使用）
            this._engineRowEl     = null;
        }
  _log(level, ...args) { this.plugin.report(level, ...args); }
  _setSearchButtonBackground(button, hovering = false) {
    button.style.background = hovering ? 'var(--background-secondary)' : 'var(--background-primary)';
  }
  _syncInputBorder() {
    const focused = this.container.ownerDocument.activeElement === this._input;
    this._input.style.borderColor = focused ? 'var(--interactive-accent)' : 'var(--background-modifier-border)';
  }
  _listen(target, event, handler, options) {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

    target.addEventListener(event, handler, options);
    if (target === window || target === document || event === 'scroll') this.register(() => target.removeEventListener(event, handler, options));
  }
  _later(callback, delay = 0) {
    const id = setTimeout(() => { this._timers.delete(id); if (!this._disposed) callback(); }, delay);
    this._timers.add(id); return id;
  }
  _frame(callback) {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

    const id = requestAnimationFrame(time => { this._frames.delete(id); if (!this._disposed) callback(time); });
    this._frames.add(id); return id;
  }
  onload() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

    this.register(() => {
      this._disposed = true; ++this._historyVer; ++this._vaultSearchVer; ++this._webSearchVer;
      clearTimeout(this._debounceTimer);
      this._timers.forEach(clearTimeout); this._timers.clear();
      this._frames.forEach(cancelAnimationFrame); this._frames.clear();
      this._abortCtrls.forEach(controller => controller.abort());
      this._sourceEditor?.remove();
      [this._dropdown, this._scopeMenu, this._vaultSearchPanel, this._panelMask].forEach(element => element?.remove());
      this._teardownIndexFlush();
      this._wrap?.remove();
    });
  }
}
