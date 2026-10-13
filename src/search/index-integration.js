import * as Obsidian from 'obsidian';
import { moment } from 'obsidian';
import { SHEET_BREAKPOINT, MIN_PANEL_H, PILL_ICON_SIZE, COLLAPSIBLE_GROUPS, DEFAULT_EXPANDED_GROUPS, GROUP_ICON, EXT_ICON } from '../shared/constants.js';
import { IconRenderer } from '../shared/icons.js';
import { makeTouchHandler } from '../shared/touch.js';

// One cohesive behavior; shared state belongs to SearchBarComponent.
export const withIndexIntegration = Base => class extends Base {
_indexEngine() {
            const eng = this.plugin.indexEngine;
            if (!eng) return null;
            const cfg = (this.cfg && this.cfg.searchIndex) || {};
            if (cfg.enabled === false) return null;
            return eng;
        }

_excludedPredicate() {
            let excluded = this.cfg.excludePaths || [];
            let presetMode = "黑名单";
            if (this._selectedPreset) {
                const preset = (this.cfg.searchPresets || []).find(p => p.name === this._selectedPreset);
                if (preset?.excludeFolders?.length) {
                    excluded = preset.excludeFolders;
                    presetMode = preset.mode || "黑名单";
                }
            }
            const pathOf = (x) => (typeof x === "string" ? x : (x && x.path) || "");
            if (presetMode === "白名单") return (x) => excluded.length > 0 && !excluded.some(p => pathOf(x).startsWith(p));
            return (x) => excluded.some(p => pathOf(x).startsWith(p));
        }

_indexQuery(q) {
            const eng = this._indexEngine();
            if (!eng || eng.state !== "ready") return null;
            try {
                const res = eng.search(q, { limit: 80 });
                if (!res || !res.ready) return null;
                const isExcluded = this._excludedPredicate();
                const results = res.results.filter(r =>
                    (this._searchNonMarkdown || /\.md$/i.test(r.path)) && !isExcluded(r.path));
                return { ready: true, results, fallback: !!res.fallback, queryMs: res.queryMs, total: results.length };
            } catch (e) {
                this._log("error", "[SearchBar] 索引查询失败，本次回落旧路径:", e);
                return null;
            }
        }

_itemsFromEngineHits(rows, terms) {
            const out = [];
            for (const r of rows) {
                const f = this.app.vault.getAbstractFileByPath(r.path);
                if (!f) continue;
                out.push({
                    label: this._fileLabel(f),
                    sub: f.parent?.path || "/",
                    terms,
                    twoLine: true,
                    icon: this._fileIconName(f),
                    action: () => this._openVaultResult(f.path, this._fileLabel(f))
                });
            }
            return out;
        }

async _contentItemsFromEngine(rows, terms, ctxLen, ver) {
            const out = [];
            for (const r of rows) {
                if (this._isVaultStale(ver)) return out;
                const f = this.app.vault.getAbstractFileByPath(r.path);
                if (!f) continue;
                try {
                    const text = await this.app.vault.cachedRead(f);
                    out.push({
                        label: this._fileLabel(f),
                        sub: f.parent?.path || "/",
                        terms,
                        hits: this._extractAllSnippets(text, terms, ctxLen),
                        icon: this._fileIconName(f),
                        action: () => this._openVaultResult(f.path, this._fileLabel(f))
                    });
                } catch (e) {
                    this._log("warn", `[SearchBar] 摘要读取失败 (${r.path}):`, e);
                }
            }
            return out;
        }

_setupIndexEngine() {
            const eng = this._indexEngine();
            if (!eng) return;
            try {
                eng.setConfig(Object.assign({ debug: false }, (this.cfg && this.cfg.searchIndex) || {}));
                eng.attachApp(this.app);
                // 构建期让路：用户正在输入时不做索引工作（打字永远优先）
                eng.setPauseHook(() => [...this.plugin.components.values()].some(({component}) => !component._disposed && component._isComposingQuery()));
                eng.retain();
                this._engineRetained = true;
                const adapter = {
                    // 建全库索引（含非 md 的名字），非 md 的正文不读 —— 与旧路径「非 md 只按文件名」一致
                    listFiles: () => this.app.vault.getFiles(),
                    fileFor: (p) => this.app.vault.getAbstractFileByPath(p),
                    readText: (p) => {
                        const f = this.app.vault.getAbstractFileByPath(p);
                        if (!f) return Promise.resolve("");
                        return f.extension === "md" ? this.app.vault.cachedRead(f) : Promise.resolve("");
                    },
                    getMeta: (p) => {
                        const f = this.app.vault.getAbstractFileByPath(p);
                        return f ? this.app.metadataCache.getFileCache(f) : null;
                    }
                };
                // init 幂等：已建好的索引不会被重复构建，多实例共享同一个引擎
                eng.init(adapter, (this.cfg && this.cfg.searchIndex) || {})
                   .catch(e => this._log("error", "[SearchBar] 索引构建失败，搜索回落旧路径:", e));
                this._bindIndexFlush(eng);
            } catch (e) {
                this._log("error", "[SearchBar] 索引引擎接入失败，搜索回落旧路径:", e);
            }
        }

_isComposingQuery() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            try {
                return !!(this._debounceTimer || (this._input && document.activeElement === this._input));
            } catch (e) {
                return false;
            }
        }

_bindIndexFlush(eng) {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            if (this._indexFlushBound) return;
            this._indexFlushBound = true;
            const flush = () => {
                // 兜底：深层重渲染不一定触发观察器，顺手确认组件还在文档里
                // Safety net: a deep re-render may not trip the observers, so verify liveness here.
                try { if (this._wrap && !this._wrap.isConnected) { if (this._cleanup) this._cleanup(); return; } } catch (e) { /* ignore */ }
                try { eng.flushReindex().catch(e => this._log("warn", "Index refresh failed", e)); } catch (e) { this._log("warn", "Index refresh failed", e); }
            };
            this._indexBlurHandler = flush;
            this._indexVisHandler = () => { try { if (document.visibilityState === "hidden") flush(); } catch (e) { /* ignore */ } };
            this._listen(window, "blur", this._indexBlurHandler);
            this._listen(document, "visibilitychange", this._indexVisHandler);
            this._indexFlushTimer = setInterval(flush, 10000);
        }

_teardownIndexFlush() {
            const document = this.container.ownerDocument;
            const window = document.defaultView;
            const getComputedStyle = window.getComputedStyle.bind(window);
            const requestAnimationFrame = window.requestAnimationFrame.bind(window);
            const cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

            if (this._indexBlurHandler) window.removeEventListener("blur", this._indexBlurHandler);
            if (this._indexVisHandler) document.removeEventListener("visibilitychange", this._indexVisHandler);
            if (this._indexFlushTimer) clearInterval(this._indexFlushTimer);
            this._indexFlushTimer = null;
            this._indexFlushBound = false;
        }
};
