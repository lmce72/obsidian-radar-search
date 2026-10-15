import * as Obsidian from 'obsidian';
import { moment } from '../shared/moment.ts';
import { SHEET_BREAKPOINT, MIN_PANEL_H, PILL_ICON_SIZE, COLLAPSIBLE_GROUPS, DEFAULT_EXPANDED_GROUPS, GROUP_ICON, EXT_ICON } from '../shared/constants.ts';
import { IconRenderer } from '../shared/icons.ts';
import { makeTouchHandler } from '../shared/touch.ts';

// One cohesive behavior; shared state belongs to SearchBarComponent.
export const withNavigation = Base => class extends Base {
  declare _vaultSortMode;
  declare _mode;
  declare _activeIdx;
  declare _itemEls;
  declare _rafId;
  declare _bottomSheet;

async _saveCfgKey(key, value) {
    try { await this.plugin.updateSetting(key, value, false); this.cfg[key] = value; }
    catch (error) { this._log('error', '设置保存失败', error); }
}

_sortFiles(files, mode) {
            const s = [...files];
            const cmp = {
                "alpha-asc":  (a, b) => a.basename.localeCompare(b.basename),
                "alpha-desc": (a, b) => b.basename.localeCompare(a.basename),
                "mtime-desc": (a, b) => (b.stat?.mtime || 0) - (a.stat?.mtime || 0),
                "mtime-asc":  (a, b) => (a.stat?.mtime || 0) - (b.stat?.mtime || 0),
                "ctime-desc": (a, b) => (b.stat?.ctime || 0) - (a.stat?.ctime || 0),
                "ctime-asc":  (a, b) => (a.stat?.ctime || 0) - (b.stat?.ctime || 0),
            };
            // 「相关度」的排序由索引引擎给出（引擎路径根本不调用本方法）。走到这里说明引擎
            // 尚未就绪或已关闭，此时按最近编辑兜底，好过保留 vault 枚举顺序。
            // Relevance ordering comes from the index engine, which never calls this method. Reaching
            // here means the engine is not ready or is off, so fall back to recency rather than
            // leaving the vault's enumeration order.
            if (mode === "relevance") return s.sort(cmp["mtime-desc"]);
            return s.sort(cmp[mode] || cmp["mtime-desc"]);
        }

_getBookmarksInstance() {
            try {
                const viaInternal = this.app.internalPlugins?.plugins?.["bookmarks"];
                if (viaInternal && viaInternal.instance && Array.isArray(viaInternal.instance.items)) {
                    return viaInternal.instance;
                }
                const viaPlugins = this.app.plugins?.plugins?.["bookmarks"];
                if (viaPlugins && viaPlugins.instance && Array.isArray(viaPlugins.instance.items)) {
                    return viaPlugins.instance;
                }
                return null;
            } catch (e) {
                this._log("error", "[SearchBar] 获取书签实例失败:", e);
                return null;
            }
        }

_flattenBookmarks(items) {
            const result = [];
            const walk = (list) => {
                if (!Array.isArray(list)) return;
                for (const item of list) {
                    result.push(item);
                    if (item.items) walk(item.items);
                }
            };
            walk(items);
            return result;
        }

_buildSortSelect(q) {
            const SORT_LABELS = {
                // 「相关度」为默认：索引引擎的 BM25 排序。引擎未就绪时 _sortFiles 按最近编辑兜底。
                // Relevance is the default — the engine's BM25 ordering; _sortFiles falls back to
                // recency while the index is not ready.
                "relevance":  "相关度",
                "mtime-desc": "最近编辑",
                "mtime-asc":  "最早编辑",
                "alpha-asc":  "名称 A→Z",
                "alpha-desc": "名称 Z→A",
                "ctime-desc": "最近创建",
                "ctime-asc":  "最早创建",
            };
            const sel = createEl("select");
            Object.assign(sel.style, {
                fontSize: "11px",
                border: "1px solid var(--background-modifier-border)",
                borderRadius: "100px",
                background: "var(--background-secondary)",
                color: "var(--text-muted)",
                padding: "1px 3px",
                cursor: "pointer",
                maxWidth: "90px"
            });
            for (const [val, label] of Object.entries(SORT_LABELS)) {
                const opt = sel.createEl("option", { value: val, text: label });
                opt.value = val;
                if (val === this._vaultSortMode) opt.selected = true;
            }
            this._listen(sel, "mousedown", (e) => e.stopPropagation());
            this._listen(sel, "change", (e) => {
                this._vaultSortMode = e.target.value;
                this._saveCfgKey("vaultSortMode", this._vaultSortMode);
                if (q) this._doSearch(q);
            });
            return sel;
        }

_selectMode(mode,runSearch=true) {
            if(this._mode!==mode)this._resultCategory='all';
            this._mode = mode;
            this._syncSearchAction();
            const mcfg = this._modeConfig()[mode];
            const iconWrap = this._scopeBtn.querySelector("span");
            if (iconWrap) this._setIcon(iconWrap, mcfg.icon, PILL_ICON_SIZE);
            this._input.placeholder = mcfg.placeholder;
            this._closeScopeMenu();
            // 面板随模式刷新（vault/web/global 显示不同内容）
            if (this._vaultSearchPanel) {
                if (this._vaultPanelOpen) {
                    this._refreshPanelForMode(mode);
                }
                this._applyPanelBtnStyle(this._vaultPanelOpen);
            }
            this._hideDropdown();
            if (runSearch && this._input.value.trim()) this._doSearch(this._input.value.trim());
            // 切模式不该在触摸设备上弹出输入法（原先无条件 focus，手机上一按模式键就弹键盘）
            if(runSearch)this._focusInput();

            // ── 需求2：Pill 按钮标签随模式更新 ─────────────────────────────
            if (!this._contentToggleLabelEl) return;
            try {
                if (mode === "web") {
                    const activeEng = (this.cfg.engines || []).find(e => e.id === this._activeEngineId);
                    this._contentToggleLabelEl.textContent = activeEng ? activeEng.name : "搜索选项";
                    this._setIcon(this._contentToggleIconEl, "globe", PILL_ICON_SIZE);
                } else {
                    this._contentToggleLabelEl.textContent = this._selectedPreset || "搜索选项";
                    const preset = (this.cfg.searchPresets || []).find(p => p.name === this._selectedPreset);
                    this._setIcon(this._contentToggleIconEl, preset?.icon || "sliders-horizontal", PILL_ICON_SIZE);
                }
            } catch (e) {
                this._log("error", "[SearchBar] _selectMode 标签刷新失败:", e);
            }
            // 模式切换后按钮状态图标随之更新（web 模式不显示专项搜索状态）
            this._refreshContentToggleStatus();
        }

_showDropdown() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            if (this._vaultPanelOpen || this._isScopeMenuOpen()) {
                // 输入框聚焦 = 用户在搜索 → 收起面板与菜单，让位给结果下拉
                // 否则（如面板内拨动开关触发的重渲染）保持面板展开，仅不显示下拉，避免面板被自己关掉
                if (document.activeElement !== this._input) return;
                this._closeScopeMenu();
                this._closePanel({ restoreDropdown: false });
            }
            this._dropdown.style.display = "block";
            if(this.presentation!=='page') {this._raiseFloat(this._dropdown);this._startReposition();}
        }

_hideDropdown() {
            if(this.presentation==='page'&&this._resultKind==='results'&&this._input.value.trim())return;
            this._dropdown.style.display = "none";
            this._activeIdx = -1;
            this._itemEls = [];
            // 面板和 scopeMenu 均关闭时才停止 rAF 循环
            // 底部卡片形态下面板不需要跟随重定位，不参与循环存续判定
            const panelNeedsTrack = this._isPanelVisible() && !this._bottomSheet;
            if (!this._isScopeMenuOpen() && !panelNeedsTrack) this._stopReposition();
        }

_raiseFloat(el) {
            if (!el) return;
            el.style.zIndex = String(9100 + (++this._zCounter));
        }

_syncClearBtn() {
            if (!this._clearBtn) return;
            const hasValue = this._input.value.length > 0;
            this._clearBtn.style.display = hasValue ? "inline-flex" : "none";
        }

_startReposition() {
            if (this._rafId) return;
            const loop = () => {
                // 底部卡片形态下面板与菜单不参与锚定跟踪
                const panelNeedsTrack = this._isPanelVisible() && !this._bottomSheet;
                const menuNeedsTrack  = this._isScopeMenuOpen() && !this._bottomSheet;
                if ((this.presentation!=='page' && this._dropdown.style.display !== "none") ||
                    menuNeedsTrack ||
                    panelNeedsTrack) {
                    this._repositionFloats();
                    this._rafId = this._frame(loop);
                } else {
                    this._rafId = null;
                }
            };
            this._rafId = this._frame(loop);
        }

_stopReposition() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
        }

_repositionFloats() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            // 每次定位前重算形态：拖动窗口跨过断点时立即分流（底部卡片不参与锚定）
            this._bottomSheet = this._isSheetLayout();
            const rect   = this._input.getBoundingClientRect();
            const GAP    = 6;
            const MARGIN = 8;
            const vw     = window.innerWidth;
            const vh     = window.innerHeight;

            // ── 搜索结果下拉 ──────────────────────────────────────────────────
            const dropTop   = rect.bottom + GAP;
            const dropWidth = Math.max(Math.min(rect.width, vw - MARGIN * 2), 240);
            const dropLeft  = Math.max(MARGIN, Math.min(rect.left, vw - dropWidth - MARGIN));
            // 移动端：下方剩余高度不足时动态缩减 maxHeight
            const availBelow = vh - dropTop - MARGIN;
            if(this.presentation!=='page') {
            this._dropdownInner.style.maxHeight = Math.max(120, Math.min(400, availBelow)) + "px";
            Object.assign(this._dropdown.style, {
                top:   dropTop + "px",
                left:  dropLeft + "px",
                width: dropWidth + "px"
            });

            }

            // ── 模式切换菜单（底部卡片形态下由 _applyScopeMenuPresentation 定格，不锚定）──
            if (this._isScopeMenuOpen() && !this._bottomSheet) {
                const bR    = this._scopeBtn.getBoundingClientRect();
                const mW    = this._scopeMenu.offsetWidth  || 160;
                const mH    = this._scopeMenu.offsetHeight || 100;
                const sLeft = Math.max(MARGIN, Math.min(bR.left, vw - mW - MARGIN));
                const sBelowTop = bR.bottom + GAP;
                // 下方放不下时翻转到上方
                const sTop = (sBelowTop + mH < vh - MARGIN)
                    ? sBelowTop
                    : Math.max(MARGIN, bR.top - GAP - mH);
                Object.assign(this._scopeMenu.style, {
                    top:  sTop + "px",
                    left: sLeft + "px"
                });
            }

            // ── 搜索选项面板（底部卡片形态下由 _applyPanelPresentation 定格，不锚定）──
            if (this._isPanelVisible() && !this._bottomSheet) {
                const bR        = this._contentToggleBtn.getBoundingClientRect();
                const pW        = Math.min(this._vaultSearchPanel.offsetWidth || 240, vw - MARGIN * 2);
                const pBelowTop = bR.bottom + GAP;
                // 左缘对齐 btn 左缘（原为右对齐 btn 右缘），两端都不超出视口
                const pLeft     = Math.max(MARGIN, Math.min(bR.left, vw - pW - MARGIN));
                // 始终锚定在按钮下方（与桌面端一致）：下方空间不足时压缩面板高度并内部滚动，
                // 不再整块翻转到按钮上方（平板等矮视口下翻转会让面板跑到按钮上面）。
                // 仅当下方连 MIN_PANEL_H 都放不下时，才把面板上移到刚好完整可见的最小位移，
                // 避免 fixed 元素被视口裁掉后底部条目无法滚动到。
                const availBelow = vh - pBelowTop - MARGIN;
                const pTop = availBelow >= MIN_PANEL_H
                    ? pBelowTop
                    : Math.max(MARGIN, vh - MARGIN - MIN_PANEL_H);
                this._vaultSearchPanel.style.maxHeight = Math.max(MIN_PANEL_H, Math.min(480, vh - pTop - MARGIN)) + "px";
                Object.assign(this._vaultSearchPanel.style, {
                    top:      pTop + "px",
                    left:     pLeft + "px",
                    right:    "auto",
                    maxWidth: (vw - MARGIN * 2) + "px"
                });
            }
        }

_prepBar(kind) {
            try {
                const el = this._barLeft;
                if (!el) return;
                const isHistory = kind === "history";
                if(isHistory)el.empty();
                this._resultKind=kind;
                // 右区按钮显隐：清除历史只在历史视图；在 Obsidian 打开只在结果视图（历史视图里没有查询词）
                if (this._clearHistoryBtn) this._clearHistoryBtn.style.display = "none";
                if (this._cornerBtnEl) this._cornerBtnEl.style.display = isHistory || this.presentation==='page' ? "none" : "flex";
                if(isHistory) {el.removeClass('primecore-result-tabs');el.removeAttribute('role');el.removeAttribute('aria-label');this._dropdownInner.removeAttribute('role');}
                else this._dropdownInner.setAttribute('role','tabpanel');
                if (isHistory) {
                    if (this._toggleAllBtn) this._toggleAllBtn.style.display = "none";
                    return;
                }
                this._renderResultCategories();
                return;
            } catch (e) {
                this._log("error", "[SearchBar] 顶栏上下文切换失败:", e);
            }
        }
};
