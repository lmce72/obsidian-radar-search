# PrimeCore Search

将 PrimeCore 搜索栏拆分成可独立构建的 Obsidian 插件。提供 Vault、全局及互联网搜索，正文索引、中文 bigram 检索、命令、属性、标签、书签、链接、搜索预设和历史分页。

## 使用

1. 执行 `bun run build`。
2. 将 `dist/main.js`、`dist/manifest.json` 复制到目标仓库的 `.obsidian/plugins/primecore-search/`。仓库使用自定义配置目录时，以该目录为准。
3. 在 Obsidian 的第三方插件中启用 **PrimeCore Search**。
4. 从命令面板选择 **打开浮动搜索框** 或 **打开搜索页**，两者为独立命令，也可以分别绑定快捷键。点击搜索 Ribbon 按钮默认打开浮动搜索框。相关选项均位于 **设置 → PrimeCore Search**。

浮动搜索框直接挂载搜索栏容器，宽度为视口的 70%，水平居中，顶部位于视口高度的 30% 处。后方遮罩复用 Obsidian 命令面板的 `modal-container mod-dim` 和 `modal-bg` 样式，颜色采用原生 `--background-modifier-cover`，透明度及效果由 Obsidian 和当前主题控制；搜索栏本身保持原有不透明度。搜索模式、搜索、搜索选项和清除按钮的背景使用 `--background-primary`，悬停背景使用 `--background-secondary`，随主题自动变化。打开后直接聚焦输入框，按 Esc 或点击遮罩关闭。搜索页在独立标签页打开，再次执行命令时激活已有搜索页并聚焦输入框。两种入口共享设置、历史与索引，同时打开时各自保留搜索栏状态。

输入框背景始终使用 `--background-secondary`。聚焦时边框使用 `--interactive-accent`，失焦时使用 `--background-modifier-border`；焦点切换只改变边框颜色。

笔记内嵌入口，无需 Dataview：

````markdown
```primecore-search
```
````

此代码块在阅读视图或 Live Preview 渲染代码块时显示搜索栏。原 DataviewJS 入口仍可继续使用；将需要迁移的笔记代码块替换成上面的入口。

## 配置迁移

首次启用且没有插件 `data.json` 时，检查当前仓库的 `Components/Configs/config-searchBar.json`，将所有已知选项复制到插件自身 `data.json`。之后所有修改仅通过插件 `loadData/saveData` 保存。原配置不会被写回。

旧配置中的搜索预设、排除路径、占位文本、引擎与信息源、默认预设、分页、排序、分组状态、专项搜索及索引开关均支持迁移。缺省选项补全默认值。旧版 `expandedResultGroups` 会转换为分组状态。无效配置项恢复默认并可在开启开发者日志后查看原因。

本次迁移的原始配置单独放在本地 `migration-settings.json`，Git 忽略此文件。执行 `bun run package:local` 可将它作为 `dist/data.json` 一并打包。不要将含个人路径或设置的 `data.json` 提交到公开仓库。

配置页不需要编辑 JSON。搜索引擎、信息源和预设采用可增删的表格；预设路径展开为列表，并提供现有文件夹建议。引擎标识自动生成，建议词接口放在“更多选项”中。排除路径使用逐项列表，分组和索引使用开关。所有复杂结构均采用“修改 → 保存修改 / 还原”的统一交互，空行、重复项和无效网址会阻止保存，并给出提示。

各文本输入提供示例占位提示。预设重命名、引擎标识修改或删除时，默认选择同步更新；相关模型一次保存。分组展开设置与旧版分组列表保持同步。新增组件编辑器使用 Obsidian 原生控件，表格可在窄屏横向滚动，不依赖 EmbedUI 运行时。

`vaultContentSearchMaxFiles` 为原配置的兼容字段，原搜索实现没有使用它，插件同样只保留其值。历史天数限制控制显示范围，不自动删除记录；“永久”模式查询所有日期，不再限制为一年。

## 独立性与数据

插件不依赖 Dataview、EmbedUI、Iconize 或仓库中的动态脚本。索引引擎打包到插件，实例按插件隔离；图标使用 Obsidian 自带 Lucide，不支持的旧 Iconize 图标回落为原生图标。颜色继承 Obsidian 当前主题的强调色，不读取 PrimeCore 的季节主题配置。原有底部卡片与防滚动误触交互保留。

搜索历史保存在配置目录下的 `plugins/primecore-search/history/`，与旧历史分离。本插件不自动读取或删除原 `Components/History/SearchHistory`。索引仅保存在内存，按需后台建立；关闭最后一个搜索实例时释放索引和监听器。多视图历史写入及插件设置写入均使用串行队列，避免覆盖。

插件无遥测，不读取仓库外文件。**全局与互联网搜索会通过 Obsidian `requestUrl` 向已启用的建议词接口发送输入文本**，并在执行互联网搜索时打开相应 URL；如不希望发送输入，可关闭相关引擎或将其 `suggest` 清空。内置浏览器需启用 Obsidian Web viewer，否则回落外部浏览器。命令和书签查询沿用 Obsidian 内部注册表，未来 Obsidian 版本变更可能影响这些接口。

## 开发

需要 Bun 1.3+，构建无额外 npm 依赖，Obsidian API 由宿主提供。

```sh
bun run check
bun test --timeout 5000
bun run build
```

| 目录 | 职责 |
| --- | --- |
| `src/main.js` | 插件生命周期、命令、视图、Markdown 内嵌与实例管理 |
| `src/settings/` | 默认值、校验、旧配置迁移、持久化与设置页 |
| `src/search/` | Vault / 全局 / Web 查询、元数据、摘要与索引引擎 |
| `src/history/` | 历史展示与并发安全存储 |
| `src/ui/` | 搜索栏、浮层、选项、分页、事件与响应式布局 |
| `src/shared/` | 常量、原生图标与触摸手势 |

原组件的 109 个方法按职责分成 14 个行为 mixin。`SearchBarComponent` 通过明确的 mixin 清单组合行为并持有 UI 状态，继承 Obsidian `Component` 管理资源。各模块直接维护，不在构建时读取原仓库或重新提取代码。

`tests/core.test.js` 覆盖设置迁移与校验、串行持久化、多实例历史写入、防滚动误触、中文全文索引和引擎隔离。
