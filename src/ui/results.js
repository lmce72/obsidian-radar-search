import * as Obsidian from 'obsidian';
import { moment } from 'obsidian';
import { SHEET_BREAKPOINT, MIN_PANEL_H, PILL_ICON_SIZE, COLLAPSIBLE_GROUPS, DEFAULT_EXPANDED_GROUPS, GROUP_ICON, EXT_ICON } from '../shared/constants.js';
import { IconRenderer } from '../shared/icons.js';
import { makeTouchHandler } from '../shared/touch.js';

// One cohesive behavior; shared state belongs to SearchBarComponent.
export const withResults = Base => class extends Base {
_mkPagerBar(parent, opts) {
            try {
                const o = opts || {};
                const bar = parent.createDiv();
                Object.assign(bar.style, {
                    position: o.sticky === false ? "static" : "sticky",
                    bottom: "0",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    // 窄屏（移动端）放不下时水平滚动，而不是把右侧的翻页按钮裁掉
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    background: "var(--background-primary)",
                    borderTop: "1px solid var(--background-modifier-border)"
                });

                // 每页条数（数字框 + 确认）
                const sizeInput = createEl("input", { type: "number" });
                Object.assign(sizeInput.style, {
                    width: "52px", height: "26px", borderRadius: "100px",
                    border: "1px solid var(--background-modifier-border)",
                    background: "var(--background-secondary)", color: "var(--text-normal)",
                    fontSize: "12px", textAlign: "center", outline: "none",
                    padding: "0 6px", boxSizing: "border-box"
                });
                sizeInput.value = String(o.pageSize);
                sizeInput.min = "1";
                // 阻止 mousedown/touchstart 冒泡，防止下拉被关闭
                this._listen(sizeInput, "mousedown", (e) => e.stopPropagation());
                this._listen(sizeInput, "touchstart", (e) => e.stopPropagation(), { passive: true });

                const checkBtn = createEl("button");
                Object.assign(checkBtn.style, {
                    width: "26px", height: "26px", borderRadius: "100px", border: "none",
                    background: "var(--interactive-accent)", color: "var(--text-on-accent)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0", flexShrink: "0", transition: "opacity 0.12s", touchAction: "manipulation"
                });
                const checkIconSpan = checkBtn.createSpan();
                Object.assign(checkIconSpan.style, { display: "inline-flex", alignItems: "center", pointerEvents: "none" });
                this._setIcon(checkIconSpan, "check", 13);
                this._listen(checkBtn, "mouseenter", () => { checkBtn.style.opacity = "0.85"; });
                this._listen(checkBtn, "mouseleave", () => { checkBtn.style.opacity = "1"; });
                const _applySize = (e) => {
                    const n = Math.max(1, parseInt(sizeInput.value, 10) || o.pageSize || 8);
                    sizeInput.value = String(n);
                    if (o.onSize) o.onSize(n);
                };
                this._listen(checkBtn, "mousedown", (e) => { e.stopPropagation(); e.preventDefault(); });
                const checkHandler = this._makeTouchHandler((e) => { e.stopPropagation(); e.preventDefault(); _applySize(e); });
                this._listen(checkBtn, "touchstart", checkHandler.onTouchStart, { passive: true });
                this._listen(checkBtn, "touchend", (e) => { e.stopPropagation(); checkHandler.onTouchEnd(e); });
                this._listen(checkBtn, "click", (e) => { e.stopPropagation(); e.preventDefault(); _applySize(e); });

                // 页码信息
                const infoEl = bar.createSpan({ text: `第 ${o.page} / ${o.totalPages} 页` });
                Object.assign(infoEl.style, {
                    fontSize: "11px", color: "var(--text-muted)",
                    flexGrow: "1", textAlign: "center", whiteSpace: "nowrap"
                });

                // 上一页 / 下一页（复用 _mkNavBtn 圆形按钮）
                const prevBtn = this._mkNavBtn("chevron-left");
                const nextBtn = this._mkNavBtn("chevron-right");
                prevBtn.disabled = o.page <= 1;
                nextBtn.disabled = o.page >= o.totalPages;
                prevBtn.style.opacity = prevBtn.disabled ? "0.3" : "1";
                nextBtn.style.opacity = nextBtn.disabled ? "0.3" : "1";
                prevBtn.style.cursor = prevBtn.disabled ? "default" : "pointer";
                nextBtn.style.cursor = nextBtn.disabled ? "default" : "pointer";
                // stopPropagation 必不可少：翻页会重建下拉内容，节点在处理中脱离文档时，
                // 文档级「点击外部关闭」会误判为外部点击而收起下拉
                const prevHandler = this._makeTouchHandler((e) => { e.stopPropagation(); e.preventDefault(); if (!prevBtn.disabled && o.onPrev) o.onPrev(); });
                this._listen(prevBtn, "touchstart", prevHandler.onTouchStart, { passive: true });
                this._listen(prevBtn, "touchend", (e) => { e.stopPropagation(); prevHandler.onTouchEnd(e); });
                this._listen(prevBtn, "click", (e) => { e.stopPropagation(); e.preventDefault(); if (!prevBtn.disabled && o.onPrev) o.onPrev(); });
                const nextHandler = this._makeTouchHandler((e) => { e.stopPropagation(); e.preventDefault(); if (!nextBtn.disabled && o.onNext) o.onNext(); });
                this._listen(nextBtn, "touchstart", nextHandler.onTouchStart, { passive: true });
                this._listen(nextBtn, "touchend", (e) => { e.stopPropagation(); nextHandler.onTouchEnd(e); });
                this._listen(nextBtn, "click", (e) => { e.stopPropagation(); e.preventDefault(); if (!nextBtn.disabled && o.onNext) o.onNext(); });

                bar.appendChild(sizeInput);
                bar.appendChild(checkBtn);
                bar.appendChild(infoEl);
                bar.appendChild(prevBtn);
                bar.appendChild(nextBtn);
                return bar;
            } catch (e) {
                this._log("error", "[SearchBar] 构建分页栏失败:", e);
                return null;
            }
        }

_isGroupExpanded(title) {
            if (Object.prototype.hasOwnProperty.call(this._groupState, title)) return !!this._groupState[title];
            return DEFAULT_EXPANDED_GROUPS.has(title);
        }

_collapsibleTitlesInResults() {
            return [...new Set((this._lastGroups || [])
                .map(g => g.title)
                .filter(t => t && COLLAPSIBLE_GROUPS.has(t)))];
        }

_toggleResultGroup(title) {
            try {
                if (!title || !COLLAPSIBLE_GROUPS.has(title)) return;
                this._groupState[title] = !this._isGroupExpanded(title);
                this._saveCfgKey("resultGroupState", this._groupState);
                if (this._lastGroups) this._renderDropdown(this._lastGroups);
            } catch (e) {
                this._log("error", "[SearchBar] 切换分组展开状态失败:", e);
            }
        }

_toggleAllResultGroups() {
            try {
                const titles = this._collapsibleTitlesInResults();
                if (titles.length === 0) return;
                const expandAll = !titles.every(t => this._isGroupExpanded(t));
                for (const t of titles) this._groupState[t] = expandAll;
                this._saveCfgKey("resultGroupState", this._groupState);
                if (this._lastGroups) this._renderDropdown(this._lastGroups);
            } catch (e) {
                this._log("error", "[SearchBar] 全部展开/收起失败:", e);
            }
        }

_refreshToggleAllBtn() {
            try {
                if (!this._toggleAllBtn || !this._toggleAllIconSpan) return;
                const titles = this._collapsibleTitlesInResults();
                if (titles.length === 0) { this._toggleAllBtn.style.display = "none"; return; }
                const allExpanded = titles.every(t => this._isGroupExpanded(t));
                this._toggleAllBtn.style.display = "flex";
                this._toggleAllBtn.title = allExpanded ? "全部收起" : "全部展开";
                this._setIcon(this._toggleAllIconSpan, allExpanded ? "fold-vertical" : "unfold-vertical", 13);
            } catch (e) {
                this._log("error", "[SearchBar] 刷新全部展开/收起按钮失败:", e);
            }
        }

_renderDropdown(groups) {
            this._dropdownInner.empty();
            this._itemEls = [];

            const allItems = groups.flatMap(g => g.items);
            if (allItems.length === 0) {
                this._hideDropdown();
                return;
            }

            // 超过 1 个分组时显示标题行
            const showTitles = groups.length > 1 || (groups.length === 1 && groups[0].title);

            // 记录本次分组，供展开/收起切换后原样重渲染
            this._lastGroups = groups;
            // 顶栏切到「结果」上下文
            this._prepBar("results");

            for (let gi = 0; gi < groups.length; gi++) {
                const group    = groups[gi];
                const groupKey = group.title || String(gi);
                const pageSize = this._dropdownPageSize;
                const totalGroupPages = Math.max(1, Math.ceil(group.items.length / pageSize));
                if (!this._groupPages.has(groupKey)) this._groupPages.set(groupKey, 1);
                const groupPage   = Math.min(this._groupPages.get(groupKey), totalGroupPages);
                this._groupPages.set(groupKey, groupPage);
                const slicedItems = group.items.slice((groupPage - 1) * pageSize, groupPage * pageSize);

                // 可折叠分组：标题可点击折叠；收起时跳过条目与分页行
                const collapsible = !!(group.title && COLLAPSIBLE_GROUPS.has(group.title));
                const expanded    = !collapsible || this._isGroupExpanded(group.title);

                if (showTitles && group.title) {
                    const titleEl = this._dropdownInner.createDiv();
                    Object.assign(titleEl.style, {
                        padding: "6px 14px 3px",
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        borderTop: this._itemEls.length > 0 ? "1px solid var(--background-modifier-border)" : "none",
                        marginTop: this._itemEls.length > 0 ? "4px" : "0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    });
                    // 左侧：箭头（可折叠时）+ 分组图标 + 标题（+ 收起时的条数徽标）
                    const leftEl = titleEl.createSpan();
                    Object.assign(leftEl.style, { display: "flex", alignItems: "center", gap: "5px", minWidth: "0" });
                    if (collapsible) {
                        const chevEl = leftEl.createSpan();
                        Object.assign(chevEl.style, {
                            display: "inline-flex", alignItems: "center", flexShrink: "0",
                            transition: "transform 0.15s", transform: expanded ? "rotate(90deg)" : ""
                        });
                        this._setIcon(chevEl, "chevron-right", 11);
                    }
                    if (collapsible && GROUP_ICON[group.title]) {
                        const giEl = leftEl.createSpan();
                        Object.assign(giEl.style, { display: "inline-flex", alignItems: "center", flexShrink: "0" });
                        this._setIcon(giEl, GROUP_ICON[group.title], 12);
                    }
                    leftEl.createSpan({ text: group.title });
                    if (collapsible && !expanded) {
                        const badgeEl = leftEl.createSpan({ text: String(group.items.length) });
                        Object.assign(badgeEl.style, {
                            flexShrink: "0", fontSize: "10px", padding: "0 5px", lineHeight: "15px",
                            borderRadius: "8px", background: "var(--background-modifier-border)"
                        });
                    }
                    // 右侧可选控件（如排序选择器）
                    if (group.sortEl) titleEl.appendChild(group.sortEl);

                    if (collapsible) {
                        // 必须 stopPropagation：切换会重建下拉内容，节点在处理器执行中脱离文档时
                        // 文档级「点击外部关闭」会误判为外部点击而收起下拉
                        const toggleHandler = this._makeTouchHandler((e) => { e.stopPropagation(); this._toggleResultGroup(group.title); });
                        this._listen(titleEl, "touchstart", toggleHandler.onTouchStart, { passive: true });
                        this._listen(titleEl, "touchend", (e) => { e.stopPropagation(); toggleHandler.onTouchEnd(e); });
                        this._listen(titleEl, "click", (e) => { e.stopPropagation(); this._toggleResultGroup(group.title); });
                        titleEl.style.cursor = "pointer";
                        this._listen(titleEl, "mouseenter", () => { titleEl.style.color = "var(--text-normal)"; });
                        this._listen(titleEl, "mouseleave", () => { titleEl.style.color = "var(--text-muted)"; });
                    }
                }

                if (!expanded) continue;

                for (const item of slicedItems) {
                    const idx    = this._itemEls.length;
                    const itemEl = this._dropdownInner.createDiv();

                    if (item.hits) {
                        // ── 可折叠内容命中组 ───────────────────────────────────
                        const headerRow = itemEl.createDiv();
                        Object.assign(headerRow.style, {
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "7px 14px", minHeight: "36px", userSelect: "none", cursor: "pointer"
                        });
                        // 文件类型图标（内容匹配组：两行标题 + 下方可展开的内容块）
                        if (item.icon) {
                            const fileIconEl = headerRow.createSpan();
                            Object.assign(fileIconEl.style, {
                                display: "inline-flex", alignItems: "center", flexShrink: "0",
                                color: "var(--text-muted)", width: "16px"
                            });
                            this._setIcon(fileIconEl, item.icon, 13);
                        }
                        const chevronEl = headerRow.createSpan();
                        this._setIcon(chevronEl, "chevron-right", 12);
                        Object.assign(chevronEl.style, {
                            flexShrink: "0", color: "var(--text-muted)",
                            transition: "transform 0.15s", display: "flex", alignItems: "center"
                        });
                        // 与其它条目一致：上行文件名、下行路径；下方仍保留可展开的内容块
                        const contentColEl = headerRow.createDiv();
                        Object.assign(contentColEl.style, {
                            display: "flex", flexDirection: "column", flex: "1 1 0%", minWidth: "0"
                        });
                        const labelEl = contentColEl.createSpan();
                        Object.assign(labelEl.style, {
                            fontSize: "13px", color: "var(--text-normal)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                        });
                        this._highlightText(labelEl, item.label, item.terms);
                        if (item.sub) {
                            const dirEl = contentColEl.createSpan({ text: item.sub });
                            Object.assign(dirEl.style, {
                                fontSize: "11px", color: "var(--text-faint)", marginTop: "1px",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                            });
                            dirEl.title = item.sub;
                        }
                        const badgeEl = headerRow.createSpan({ text: `${item.hits.length}` });
                        Object.assign(badgeEl.style, {
                            flexShrink: "0", fontSize: "10px", padding: "1px 5px",
                            borderRadius: "8px", background: "var(--background-modifier-border)", color: "var(--text-muted)"
                        });
                        const hitsContainer = itemEl.createDiv();
                        Object.assign(hitsContainer.style, {
                            // 左内边距对齐标题列起点：header 左 14 + 图标 16 + 间距 6 + chevron 12 + 间距 6
                            display: "none", flexDirection: "column", gap: "2px", padding: "0 14px 6px 54px"
                        });
                        for (const snippet of item.hits) {
                            const snippetEl = hitsContainer.createDiv();
                            Object.assign(snippetEl.style, {
                                fontSize: "11px", color: "var(--text-faint)", padding: "3px 6px",
                                borderRadius: "4px", lineHeight: "1.4", cursor: "pointer", transition: "background 0.1s"
                            });
                            this._listen(snippetEl, "mouseenter", () => { snippetEl.style.background = "var(--background-modifier-hover)"; });
                            this._listen(snippetEl, "mouseleave", () => { snippetEl.style.background = "transparent"; });
                            this._highlightText(snippetEl, snippet, item.terms);
                            this._listen(snippetEl, "mousedown", e => e.preventDefault());
                            const snippetHandler = this._makeTouchHandler((e) => { e.stopPropagation(); item.action(); this._hideDropdown(); });
                            this._listen(snippetEl, "touchstart", snippetHandler.onTouchStart, { passive: true });
                            this._listen(snippetEl, "touchend", (e) => { e.stopPropagation(); snippetHandler.onTouchEnd(e); });
                            this._listen(snippetEl, "click", e => { e.stopPropagation(); item.action(); this._hideDropdown(); });
                        }
                        let _expanded = false;
                        const _toggle = e => { e.stopPropagation(); _expanded = !_expanded; hitsContainer.style.display = _expanded ? "flex" : "none"; chevronEl.style.transform = _expanded ? "rotate(90deg)" : ""; };
                        this._listen(headerRow, "mouseenter", () => this._setActive(idx));
                        this._listen(headerRow, "mouseleave", () => this._clearActive(idx));
                        this._listen(headerRow, "mousedown", e => e.preventDefault());
                        const headerToggleHandler = this._makeTouchHandler(_toggle);
                        this._listen(headerRow, "touchstart", headerToggleHandler.onTouchStart, { passive: true });
                        this._listen(headerRow, "touchend", headerToggleHandler.onTouchEnd);
                        this._listen(headerRow, "click", _toggle);
                        this._listen(itemEl, "mousedown", e => e.preventDefault());
                        const itemHandler = this._makeTouchHandler(() => { item.action(); this._hideDropdown(); });
                        this._listen(itemEl, "touchstart", itemHandler.onTouchStart, { passive: true });
                        this._listen(itemEl, "touchend", itemHandler.onTouchEnd);
                        this._listen(itemEl, "click", () => { item.action(); this._hideDropdown(); });
                    } else if (item.twoLine) {
                        // ── 双行条目（命令面板等）：前置图标 + 主标题 + 副标题 + 可选行尾按钮 ──
                        Object.assign(itemEl.style, {
                            display: "flex", flexDirection: "row", alignItems: "center", gap: "8px",
                            padding: "7px 14px", cursor: "pointer",
                            transition: "background 0.1s", minHeight: "36px", background: "transparent"
                        });
                        if (item.icon) {
                            const iconWrapEl = itemEl.createSpan();
                            Object.assign(iconWrapEl.style, {
                                display: "inline-flex", alignItems: "center", flexShrink: "0",
                                color: "var(--text-muted)", width: "16px"
                            });
                            this._setIcon(iconWrapEl, item.icon, 13);
                        }
                        const contentEl = itemEl.createDiv();
                        Object.assign(contentEl.style, {
                            display: "flex", flexDirection: "column", flex: "1 1 0%", minWidth: "0"
                        });
                        const labelEl = contentEl.createSpan();
                        Object.assign(labelEl.style, {
                            fontSize: "13px", color: "var(--text-normal)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                        });
                        if (item.terms) { this._highlightText(labelEl, item.label, item.terms); } else { labelEl.appendText(item.label); }
                        if (item.sub) {
                            const subEl = contentEl.createSpan();
                            Object.assign(subEl.style, {
                                fontSize: "11px", color: "var(--text-faint)", marginTop: "1px",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                            });
                            subEl.appendText(item.sub);
                            subEl.title = item.sub;
                        }
                        if (item.trailing && item.trailing.onClick) this._mkTrailingBtn(itemEl, item);
                        this._listen(itemEl, "mouseenter", () => this._setActive(idx));
                        this._listen(itemEl, "mouseleave", () => this._clearActive(idx));
                        this._listen(itemEl, "mousedown", e => e.preventDefault());
                        const twoLineHandler = this._makeTouchHandler(() => { item.action(); this._hideDropdown(); });
                        this._listen(itemEl, "touchstart", twoLineHandler.onTouchStart, { passive: true });
                        this._listen(itemEl, "touchend", twoLineHandler.onTouchEnd);
                        this._listen(itemEl, "click", () => { item.action(); this._hideDropdown(); });
                    } else if (item.isNativeSearch) {
                        // ── Obsidian 原生搜索兜底 ──────────────────────────────
                        Object.assign(itemEl.style, {
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "6px 14px", minHeight: "32px",
                            borderTop: "1px solid var(--background-modifier-border)"
                        });
                        const iconSpan = itemEl.createSpan();
                        Object.assign(iconSpan.style, { display: "inline-flex", alignItems: "center", flexShrink: "0", color: "var(--text-muted)" });
                        this._setIcon(iconSpan, "search", 13);
                        const lbl = itemEl.createSpan({ text: item.label });
                        Object.assign(lbl.style, { fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" });
                        this._listen(itemEl, "mouseenter", () => { itemEl.style.background = "var(--background-modifier-hover)"; });
                        this._listen(itemEl, "mouseleave", () => { itemEl.style.background = "transparent"; });
                        this._listen(itemEl, "mousedown", e => e.preventDefault());
                        const nativeSearchHandler = this._makeTouchHandler(() => { item.action(); this._hideDropdown(); });
                        this._listen(itemEl, "touchstart", nativeSearchHandler.onTouchStart, { passive: true });
                        this._listen(itemEl, "touchend", nativeSearchHandler.onTouchEnd);
                        this._listen(itemEl, "click", () => { item.action(); this._hideDropdown(); });
                    } else {
                        // ── 普通 item ──────────────────────────────────────────
                        Object.assign(itemEl.style, {
                            display: "flex", alignItems: "center",
                            justifyContent: "space-between",
                            padding: "7px 14px", minHeight: "36px"
                        });
                        const labelEl = itemEl.createSpan();
                        Object.assign(labelEl.style, {
                            fontSize: "13px", color: "var(--text-normal)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            flex: "1", minWidth: "0"
                        });
                        if (item.terms) { this._highlightText(labelEl, item.label, item.terms); } else { labelEl.appendText(item.label); }
                        if (item.sub) {
                            const subEl = itemEl.createSpan();
                            Object.assign(subEl.style, {
                                fontSize: "11px", color: "var(--text-faint)",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                flexShrink: "0", marginLeft: "8px", maxWidth: "45%", textAlign: "right"
                            });
                            subEl.appendText(item.sub);
                            subEl.title = item.sub;   // 截断时悬停可看全文
                        }
                        if (item.trailing && item.trailing.onClick) this._mkTrailingBtn(itemEl, item);
                        this._listen(itemEl, "mouseenter", () => this._setActive(idx));
                        this._listen(itemEl, "mouseleave", () => this._clearActive(idx));
                        this._listen(itemEl, "mousedown", e => e.preventDefault());
                        const normalItemHandler = this._makeTouchHandler(() => { item.action(); this._hideDropdown(); });
                        this._listen(itemEl, "touchstart", normalItemHandler.onTouchStart, { passive: true });
                        this._listen(itemEl, "touchend", normalItemHandler.onTouchEnd);
                        this._listen(itemEl, "click", () => { item.action(); this._hideDropdown(); });
                    }

                    this._itemEls.push(itemEl);
                }

                // ── 分组分页栏（与历史视图共用 _mkPagerBar）────────────────────
                // 注意：多个分组各有分页栏时不能都 sticky，否则会在同一滚动容器底部互相叠压，
                // 故分组内联展示（样式与历史分页栏一致），仅历史视图用 sticky。
                if (totalGroupPages > 1) {
                    const _goGroupPage = (newPage) => { this._groupPages.set(groupKey, newPage); this._renderDropdown(groups); };
                    this._mkPagerBar(this._dropdownInner, {
                        page: groupPage,
                        totalPages: totalGroupPages,
                        pageSize,
                        sticky: false,
                        onSize: (n) => { this._dropdownPageSize = n; this._renderDropdown(groups); },
                        onPrev: () => _goGroupPage(groupPage - 1),
                        onNext: () => _goGroupPage(groupPage + 1)
                    });
                }
            }

            this._refreshToggleAllBtn();
            this._showDropdown();
        }

_setActive(idx) {
            this._clearActiveAll();
            this._activeIdx = idx;
            if (this._itemEls[idx]) {
                this._itemEls[idx].style.background = "var(--background-modifier-hover)";
            }
        }

_clearActive(idx) {
            if (this._activeIdx === idx) this._activeIdx = -1;
            if (this._itemEls[idx]) this._itemEls[idx].style.background = "transparent";
        }

_clearActiveAll() {
            this._itemEls.forEach(el => { el.style.background = "transparent"; });
            this._activeIdx = -1;
        }

_handleKey(e) {
            if (this._dropdown.style.display === "none") {
                if (e.key === "Enter") { e.preventDefault(); this._executeSearch(); }
                return;
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                const next = (this._activeIdx + 1) % this._itemEls.length;
                this._setActive(next);
                this._itemEls[next]?.scrollIntoView({ block: "nearest" });
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const prev = this._activeIdx <= 0 ? this._itemEls.length - 1 : this._activeIdx - 1;
                this._setActive(prev);
                this._itemEls[prev]?.scrollIntoView({ block: "nearest" });
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (this._activeIdx >= 0 && this._itemEls[this._activeIdx]) {
                    this._itemEls[this._activeIdx].click();
                } else {
                    this._executeSearch();
                }
            } else if (e.key === "Escape") {
                this._hideDropdown();
            }
        }
};
