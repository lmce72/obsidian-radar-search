import * as Obsidian from 'obsidian';
import { moment } from '../shared/moment.ts';
import { SHEET_BREAKPOINT, MIN_PANEL_H, PILL_ICON_SIZE, EXT_ICON } from '../shared/constants.ts';
import { IconRenderer } from '../shared/icons.ts';
import { makeTouchHandler } from '../shared/touch.ts';

// One cohesive behavior; shared state belongs to SearchBarComponent.
export const withLayout = Base => class extends Base {
  declare _panelMask;
  declare _bottomSheet;
  declare _vaultPanelOpen;
  declare _wrap;
  declare _pill;
  declare _scopeBtn;
  declare _inputRow;
  declare _input;
  declare _goBtn;
  declare _contentToggleBtn;
  declare _contentToggleIconEl;
  declare _contentToggleLabelEl;
  declare _contentStatusSep;
  declare _contentStatusEl;
  declare _clearBtn;
  declare _dropdown;
  declare _barLeft;
  declare _clearHistoryBtn;
  declare _cornerBtnEl;
  declare _dropdownInner;

_getSeasonRgb() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

  const color=getComputedStyle(this.container).getPropertyValue('--interactive-accent').trim();
  const probe=this.container.createSpan(); probe.style.color=color || 'var(--text-accent)';
  const resolved=getComputedStyle(probe).color;probe.remove();
  return resolved.match(/\d+(?:\.\d+)?/g)?.slice(0,3).join(', ') || '128, 128, 128';
}

_setIcon(el, name, size = 16) { el.empty(); IconRenderer.setIcon(el, name, size); }

_makeTouchHandler(action, threshold = 10) { return makeTouchHandler(action, threshold); }

_isSheetLayout() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            try {
                const bp = Number(this.cfg.searchSheetBreakpoint) || SHEET_BREAKPOINT;
                return window.innerWidth < bp;
            } catch (e) {
                this._log("error", "[SearchBar] _isSheetLayout 判定失败:", e);
                return false;
            }
        }

_buildPanelMask() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            try {
                this._panelMask = document.body.createDiv();
                this._panelMask.setAttribute("data-sb-float", "1");
                Object.assign(this._panelMask.style, {
                    position: "fixed",
                    top: "0",
                    left: "0",
                    right: "0",
                    bottom: "0",
                    zIndex: "9100",
                    // 与共享模板 ToastWindow 的移动端遮罩同值，非自造色
                    background: "rgba(0,0,0,0.5)",
                    display: "none",
                    // 拦下遮罩上的手势滚动，避免滚动穿透到背景编辑器
                    touchAction: "none",
                    WebkitTapHighlightColor: "transparent"
                });
                // 防误触模板：位移超过阈值不判定为点击
                const maskHandler = this._makeTouchHandler(() => this._dismissSheetLayers());
                this._listen(this._panelMask, "touchstart", maskHandler.onTouchStart, { passive: true });
                this._listen(this._panelMask, "touchend", maskHandler.onTouchEnd);
                // 遮罩上的触摸手势同样先收起输入法（见 _guardLayerKeyboard）
                this._guardLayerKeyboard(this._panelMask);
                // 桌面窄窗口（鼠标）兜底
                this._listen(this._panelMask, "click", () => this._dismissSheetLayers());
            } catch (e) {
                this._log("error", "[SearchBar] _buildPanelMask 失败:", e);
            }
        }

_syncMask(visible) {
            try {
                if (!this._panelMask) return;
                if (visible) {
                    this._panelMask.style.display = "block";
                    this._raiseFloat(this._panelMask);
                } else {
                    this._panelMask.style.display = "none";
                }
            } catch (e) {
                this._log("error", "[SearchBar] _syncMask 失败:", e);
            }
        }

_applyPanelPresentation() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            try {
                if (!this._vaultSearchPanel) return;
                this._bottomSheet = this._isSheetLayout();
                if (this._bottomSheet) {
                    Object.assign(this._vaultSearchPanel.style, {
                        left: "12px",
                        right: "12px",
                        top: "auto",
                        bottom: "16px",
                        width: "auto",
                        maxWidth: "none",
                        maxHeight: Math.round(window.innerHeight * 0.7) + "px",
                        borderRadius: "14px"
                    });
                } else {
                    // 桌面：显式复位底部定位残留，否则 top 与 bottom 同时生效会把面板拉高变形
                    Object.assign(this._vaultSearchPanel.style, {
                        left: "auto",
                        right: "auto",
                        top: "auto",
                        bottom: "auto",
                        width: "",
                        maxWidth: "",
                        maxHeight: "480px",
                        borderRadius: "10px"
                    });
                }
            } catch (e) {
                this._log("error", "[SearchBar] _applyPanelPresentation 失败:", e);
            }
        }

_applyScopeMenuPresentation() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            try {
                if (!this._scopeMenu) return;
                this._bottomSheet = this._isSheetLayout();
                if (this._bottomSheet) {
                    Object.assign(this._scopeMenu.style, {
                        left: "12px",
                        right: "12px",
                        top: "auto",
                        bottom: "16px",
                        width: "auto",
                        minWidth: "0",
                        maxHeight: Math.round(window.innerHeight * 0.7) + "px",
                        borderRadius: "14px"
                    });
                } else {
                    Object.assign(this._scopeMenu.style, {
                        left: "auto",
                        right: "auto",
                        top: "auto",
                        bottom: "auto",
                        width: "",
                        minWidth: "160px",
                        maxHeight: "",
                        borderRadius: "10px"
                    });
                }
            } catch (e) {
                this._log("error", "[SearchBar] _applyScopeMenuPresentation 失败:", e);
            }
        }

_closePanel(opts = undefined) {
            try {
                if (!this._vaultPanelOpen) return;
                this._vaultPanelOpen = false;
                if (this._vaultSearchPanel) this._vaultSearchPanel.style.display = "none";
                this._applyPanelBtnStyle(false);
                // 遮罩仅由仍在展开的浮层持有
                if (!this._isScopeMenuOpen()) this._syncMask(false);
                // 底部卡片下：面板内改动会即时重跑搜索，收起后把结果下拉还给用户
                // 桌面锚定形态不适用（否则点击外部关闭会立刻把下拉弹回来）
                const restore = !opts || opts.restoreDropdown !== false;
                if (restore && this._bottomSheet && this._input && this._input.value.trim()) this._showDropdown();
            } catch (e) {
                this._log("error", "[SearchBar] _closePanel 失败:", e);
            }
        }

_closeScopeMenu() {
            try {
                if (!this._scopeMenu) return;
                this._scopeMenu.style.display = "none";
                if (!this._vaultPanelOpen) this._syncMask(false);
            } catch (e) {
                this._log("error", "[SearchBar] _closeScopeMenu 失败:", e);
            }
        }

_isScopeMenuOpen() {
            return !!(this._scopeMenu && this._scopeMenu.style.display !== "none");
        }

_dismissSheetLayers() {
            this._closeScopeMenu();
            this._closePanel();
        }

_isPanelVisible() {
            return !!(this._vaultSearchPanel && this._vaultSearchPanel.style.display !== "none");
        }

_isVaultStale(ver) {
            return this._disposed || ver !== this._vaultSearchVer || this._mode === "web";
        }

_isWebStale(ver) {
            return this._disposed || ver !== this._webSearchVer || this._mode !== "web";
        }

_modeConfig() {
            // unified 模式：统一字段 > 默认；custom 模式：per-mode 字段 > 默认
            const ph = (mode, def) => {
                if (this.cfg.placeholderType === "custom") {
                    return this.cfg["placeholder_" + mode] || def;
                }
                return this.cfg.placeholder || def;
            };
            return {
                global: { icon: "compass", placeholder: ph("global", "全局搜索...") },
                vault:  { icon: "vault",   placeholder: ph("vault",  "Vault 内搜索...") },
                web:    { icon: "globe",   placeholder: ph("web",    "Search for instance.") }
            };
        }

_buildShell(rgb) {
            const PILL_H = 48;
            const BTN_SIZE = 40;

            this._wrap = this.container.createDiv();
            Object.assign(this._wrap.style, {
                position: "relative",
                width: "100%",
                minHeight: PILL_H + "px",
                margin: "8px 0",
                fontFamily: "inherit"
            });

            // 外层 flex 容器，无边框无背景
            // 移动端允许换行，避免按钮重叠
            this._pill = this._wrap.createDiv();
            Object.assign(this._pill.style, {
                display: "flex",
                alignItems: "center",
                minHeight: PILL_H + "px",
                height: "auto",
                background: "transparent",
                border: "none",
                padding: "0",
                gap: "4px",
                boxSizing: "border-box",
                flexWrap: "wrap"
            });

            // 左侧圆形模式按钮
            this._scopeBtn = createEl("button");
            Object.assign(this._scopeBtn.style, {
                flexShrink: "0",
                width: BTN_SIZE + "px",
                height: BTN_SIZE + "px",
                borderRadius: "50%",
                border: `1.5px solid rgba(${rgb}, 0.4)`,
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: `rgb(${rgb})`,
                padding: "0",
                transition: "background 0.15s",
                touchAction: "manipulation"
            });
            const scopeIconEl = this._scopeBtn.createSpan();
            Object.assign(scopeIconEl.style, { display: "inline-flex", alignItems: "center" });
            // 用当前模式对应图标（初始为 global → compass）
            this._setIcon(scopeIconEl, this._modeConfig()[this._mode].icon, PILL_ICON_SIZE);
            this._pill.appendChild(this._scopeBtn);

            // 输入行容器：输入框 + 搜索按钮 + 清除按钮作为一个整体参与换行。
            // flex-basis 260px 意味着：桌面端宽度足够时与按钮同排并撑满剩余空间；
            // 窄屏（手机）放不下时整行换到第二行并占满该行 —— 即「输入框太窄就另起一行」。
            // Input row: the input, search button and clear button wrap as one unit. The 260px basis
            // keeps them on the same line as the buttons when there is room, and moves the whole row to
            // a second line (filling it) on narrow screens.
            this._inputRow = this._pill.createDiv();
            Object.assign(this._inputRow.style, {
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flex: "1 1 260px",
                minWidth: "0"
            });

            // 输入框：本身是带圆角的"搜索框"，4px margin 与两侧按钮隔开
            this._input = createEl("input", { type: "text" });
            Object.assign(this._input.style, {
                flex: "1",
                height: (PILL_H - 8) + "px",   // 比 pill 稍矮，视觉对称
                margin: "0",
                padding: "0 14px",
                borderRadius: "999px",
                border: "1.5px solid var(--background-modifier-border)",
                background: "var(--background-secondary)",
                color: "`rgb(${rgb})`",
                fontSize: "14px",
                fontFamily: "inherit",
                outline: "none",
                minWidth: "0",
                transition: "border-color 0.2s",
                boxSizing: "border-box"
            });
            this._input.placeholder = this._modeConfig()[this._mode].placeholder;
            this._inputRow.appendChild(this._input);

            // 右侧圆形搜索按钮
            this._goBtn = createEl("button");
            Object.assign(this._goBtn.style, {
                flexShrink: "0",
                width: BTN_SIZE + "px",
                height: BTN_SIZE + "px",
                borderRadius: "50%",
                border: `1.5px solid rgba(${rgb}, 0.4)`,
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: `rgb(${rgb})`,
                padding: "0",
                transition: "background 0.15s",
                touchAction: "manipulation"
            });
            const goIconEl = this._goBtn.createSpan();
            Object.assign(goIconEl.style, { display: "inline-flex", alignItems: "center" });
            this._setIcon(goIconEl, "search", PILL_ICON_SIZE);

            // 搜索选项按钮（矩形圆角，图标+文字，点击打开选项面板）
            this._contentToggleBtn = createEl("button");
            Object.assign(this._contentToggleBtn.style, {
                flexShrink: "0",
                height: BTN_SIZE + "px",
                width: "auto",
                minWidth: BTN_SIZE + "px",
                border: `1.5px solid rgba(${rgb}, 0.25)`,
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "0 12px",
                fontSize: "12px",
                whiteSpace: "nowrap",
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
                touchAction: "manipulation"
            });
            // 用 setProperty("important") 覆盖主题对 button 的 border-radius !important 规则
            this._contentToggleBtn.style.setProperty("border-radius", "100px", "important");
            const contentToggleIconEl = this._contentToggleBtn.createSpan();
            Object.assign(contentToggleIconEl.style, { display: "inline-flex", alignItems: "center", pointerEvents: "none" });
            this._setIcon(contentToggleIconEl, "radar", PILL_ICON_SIZE);
            this._contentToggleIconEl = contentToggleIconEl;  // 供预设图标更新使用
            const contentToggleLabelEl = this._contentToggleBtn.createSpan({ text: "搜索选项" });
            Object.assign(contentToggleLabelEl.style, { pointerEvents: "none", lineHeight: "1" });
            this._contentToggleLabelEl = contentToggleLabelEl;  // 保留引用供预设名更新
            // 状态图标容器：预设（图标+文字）之后，仅图标显示已开启的专项搜索，见 _refreshContentToggleStatus
            // 分隔符：左侧（预设名/搜索选项）与右侧状态图标之间的竖线，仅在右侧有图标时显示
            // 高度略低于状态图标（16px）以显轻量
            this._contentStatusSep = this._contentToggleBtn.createSpan();
            Object.assign(this._contentStatusSep.style, {
                display: "none", width: "1px", height: "14px", flexShrink: "0",
                background: "var(--background-modifier-border)", margin: "0 1px", pointerEvents: "none"
            });
            this._contentStatusEl = this._contentToggleBtn.createSpan();
            Object.assign(this._contentStatusEl.style, {
                display: "inline-flex", alignItems: "center", gap: "3px",
                pointerEvents: "none", marginLeft: "2px"
            });

            // 插入 input 左侧（scopeBtn 右侧）
            // 选项按钮插到「输入行」之前（DOM 顺序：模式 / 选项 / [输入 搜索 清除]）
            this._pill.insertBefore(this._contentToggleBtn, this._inputRow);
            this._contentToggleBtn.setAttribute('aria-label','搜索选项');
            this._inputRow.appendChild(this._goBtn);

            // 清除按钮：goBtn 右侧，有内容时出现，点击清空搜索词
            this._clearBtn = this._inputRow.createEl("button");
            Object.assign(this._clearBtn.style, {
                flexShrink: "0",
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                width: BTN_SIZE + "px",
                height: BTN_SIZE + "px",
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                color: `rgba(${rgb}, 0.55)`,
                cursor: "pointer",
                padding: "0",
                touchAction: "manipulation",
                transition: "color 0.15s, background 0.15s"
            });
            this._clearBtn.setAttribute("aria-label", "清除搜索词");
            const clearIconEl = this._clearBtn.createSpan();
            Object.assign(clearIconEl.style, { display: "inline-flex", alignItems: "center", pointerEvents: "none" });
            this._setIcon(clearIconEl, "x", 15);
            [this._scopeBtn, this._goBtn, this._contentToggleBtn, this._clearBtn]
                .forEach(button => this._setSearchButtonBackground(button));

            // 聚焦与失焦只更新边框，背景始终使用同一主题变量。
            // Focus changes only the border; the input keeps its theme background.
            this._listen(this._input, "focus", () => this._syncInputBorder());
            this._listen(this._input, "blur", () => this._syncInputBorder());

            // 按钮背景跟随主题变量，悬停使用次级背景。
            // Theme variables keep resting and hover backgrounds in sync with the current theme.
            [this._scopeBtn, this._goBtn].forEach(btn => {
                this._listen(btn, "mouseenter", () => {
                    this._setSearchButtonBackground(btn, true);
                });
                this._listen(btn, "mouseleave", () => {
                    this._setSearchButtonBackground(btn);
                });
            });
        }

_buildDropdown() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            // 挂到 body，脱离 overflow 裁剪链；data-sb-float 用于下次渲染时批量清除
            this._dropdown = (this.presentation==='page'?this._wrap:document.body).createDiv({cls:'primecore-results'});
            if(this.presentation!=='page')this._dropdown.setAttribute('data-sb-float','1');
            Object.assign(this._dropdown.style, {
                position: "fixed", zIndex: "9100",
                background: "var(--background-primary)",
                border: "1px solid var(--background-modifier-border)",
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                display: "none", overflow: "hidden", minWidth: "240px"
            });
            if(this.presentation==='page') {
                this._wrap.addClass('primecore-search-page');this._dropdown.addClass('primecore-results-inline');
                Object.assign(this._dropdown.style,{position:'relative',zIndex:'auto',boxShadow:'none',minWidth:'0'});
            }
            this._listen(this._dropdown, "pointerdown", () => {if(this.presentation!=='page')this._raiseFloat(this._dropdown);}, { passive: true });
            // 结果/历史下拉内的触摸手势先收起输入法（见 _guardLayerKeyboard）
            this._guardLayerKeyboard(this._dropdown);
            // 通用顶栏（占位布局，不随内容滚动）——左右两区：
            //   左区 = 上下文：结果视图显示「搜索图标 + 搜索结果」，历史视图显示历史控件（图标+日期导航+显示所有）
            //   右区 = 操作按钮：清除历史 / 在 Obsidian 打开 / 全部展开收起
            // Universal top bar (occupies layout space; does not scroll with the content). Left = context,
            // right = actions. The left side is rebuilt on every render by _prepBar().
            const _dropTopBar = this._dropdown.createDiv({cls:'primecore-results-toolbar'});
            Object.assign(_dropTopBar.style, {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                // 左右 14px 与下方列表行（7px 14px）对齐，视觉上同一条竖线
                padding: "5px 14px",
                flexShrink: "0",
                flexWrap: "nowrap",
                // 窄屏放不下时水平滚动（原先左区 overflow:hidden 会把日期导航裁掉）
                overflowX: "auto",
                background: "var(--background-primary)",
                borderBottom: "1px solid var(--background-modifier-border)"
            });
            // 左区（上下文，渲染时重建）；不收缩，让顶栏整体溢出并可横向滚动
            const _barLeft = _dropTopBar.createDiv();
            Object.assign(_barLeft.style, {
                display: "flex", alignItems: "center", gap: "6px",
                minWidth: "0", flex: "0 0 auto"
            });
            this._barLeft = _barLeft;
            // 右区（操作按钮，常驻节点，仅切换显隐）
            const _dropCornerBtnRow = _dropTopBar.createDiv();
            Object.assign(_dropCornerBtnRow.style, {
                display: "flex", alignItems: "center", gap: "4px", flexShrink: "0"
            });

            this._buildResultTools(_dropCornerBtnRow);

            // 清除当前页历史按钮
            const _clearHistoryBtn = _dropCornerBtnRow.createEl("button");
            Object.assign(_clearHistoryBtn.style, {
                width: "24px", height: "24px", borderRadius: "6px", border: "none",
                background: "transparent", cursor: "pointer", padding: "0",
                display: "none", alignItems: "center", justifyContent: "center",
                transition: "background 0.1s", color: "var(--text-muted)"
            });
            const _clearHistoryIconSpan = _clearHistoryBtn.createSpan();
            Object.assign(_clearHistoryIconSpan.style, { display: "inline-flex", alignItems: "center", pointerEvents: "none" });
            this._setIcon(_clearHistoryIconSpan, "trash-2", 13);
            _clearHistoryBtn.title = "清除当前页历史记录";
            this._listen(_clearHistoryBtn, "mouseenter", () => { _clearHistoryBtn.style.background = "var(--background-modifier-hover)"; });
            this._listen(_clearHistoryBtn, "mouseleave", () => { _clearHistoryBtn.style.background = "transparent"; });
            this._clearHistoryBtn = _clearHistoryBtn;

            // Obsidian 搜索按钮
            const _cornerBtnEl = _dropCornerBtnRow.createEl("button");
            Object.assign(_cornerBtnEl.style, {
                width: "24px", height: "24px", borderRadius: "6px", border: "none",
                background: "transparent", cursor: "pointer", padding: "0",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.1s", color: "var(--text-muted)"
            });
            const _cornerIconSpan = _cornerBtnEl.createSpan();
            Object.assign(_cornerIconSpan.style, { display: "inline-flex", alignItems: "center", pointerEvents: "none" });
            this._setIcon(_cornerIconSpan, "maximize-2", 13);
            _cornerBtnEl.addClass('primecore-hover-action');
            _cornerBtnEl.createSpan({cls:'primecore-action-label',text:'在搜索页打开'});
            _cornerBtnEl.addClass("primecore-open-results-page");
            _cornerBtnEl.style.width="auto";
            _cornerBtnEl.style.gap="4px";
            _cornerBtnEl.title = "在搜索页打开";
            _cornerBtnEl.setAttribute("aria-label","在搜索页打开");
            this._listen(_cornerBtnEl, "mouseenter", () => { _cornerBtnEl.style.background = "var(--background-modifier-hover)"; });
            this._listen(_cornerBtnEl, "mouseleave", () => { _cornerBtnEl.style.background = "transparent"; });
            const cornerBtnHandler = this._makeTouchHandler((e) => { e.stopPropagation(); this._openResultsPage(); });
            this._listen(_cornerBtnEl, "touchstart", cornerBtnHandler.onTouchStart, { passive: true });
            this._listen(_cornerBtnEl, "touchend", (e) => { e.stopPropagation(); cornerBtnHandler.onTouchEnd(e); });
            this._listen(_cornerBtnEl, "click", (e) => { e.stopPropagation(); this._openResultsPage(); });
            this._cornerBtnEl = _cornerBtnEl;

            // 内部可滚动容器
            this._dropdownInner = this._dropdown.createDiv({attr:{id:'primecore-results-'+crypto.randomUUID()}});
            Object.assign(this._dropdownInner.style, { overflowY: this.presentation==='page'?'visible':'auto', maxHeight: this.presentation==='page'?'none':'400px' });
        }
};
