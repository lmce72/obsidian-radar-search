# 1.3.3

- 将直接 DOM 样式赋值迁移到 setCssStyles 和 CSS 类；大胶囊圆角优先级保留，现有交互与样式保持一致。
- 最低 Obsidian 版本调整为 1.7.2，与当前依赖的异步 revealLeaf API 一致。
- 卸载时不再主动分离工作区页面，保留页面所属侧栏及 leaf 身份，重新启用后恢复原位置。
- 将官方 no-static-styles-assignment、no-unsupported-api、detach-leaves 检查加入本地 check 与 CI。

需 Obsidian 1.7.2+。将附件 main.js、manifest.json、styles.css 放入 primecore-search 插件目录并重新启用，保留 data.json 和 history。

验证：上述三条官方 lint 规则零错误、零警告；TypeScript 检查、38 项测试（308 个断言）、Bun 构建通过。独立测试 Vault 验证了侧栏页面禁用/启用后恢复同一 leaf 与原侧栏位置，以及历史、分页、选中高亮、选项面板、菜单边界和清理。完整记录见 VALIDATION.md。

网络行为与此前一致：全局和互联网建议词功能会向已启用的建议词接口发送输入；过滤规则完全在本地执行。无遥测。
