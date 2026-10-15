# PrimeCore Search

将 PrimeCore 搜索栏拆分成可独立构建的 Obsidian 插件。提供 Vault、全局及互联网搜索，正文索引、中文 bigram 检索、命令、属性、标签、书签、链接、搜索预设和历史分页。

## 使用

1. 执行 `bun run build`。
2. 将 `dist/main.js`、`dist/manifest.json`、`dist/styles.css` 复制到目标仓库的 `.obsidian/plugins/primecore-search/`。仓库使用自定义配置目录时，以该目录为准。
3. 在 Obsidian 的第三方插件中启用 **PrimeCore Search**。
4. 从命令面板选择 **打开浮动搜索框** 或 **打开搜索页**，两者为独立命令，也可以分别绑定快捷键。点击搜索 Ribbon 按钮默认打开浮动搜索框。相关选项均位于 **设置 → PrimeCore Search**。

浮动搜索框直接挂载搜索栏容器，宽度为视口的 70%，水平居中，顶部位于视口高度的 30% 处。后方遮罩复用 Obsidian 命令面板的 `modal-container mod-dim` 和 `modal-bg` 样式，颜色采用原生 `--background-modifier-cover`，透明度及效果由 Obsidian 和当前主题控制；搜索栏本身保持原有不透明度。搜索模式、搜索、搜索选项和清除按钮的背景使用 `--background-primary`，悬停背景使用 `--background-secondary`，随主题自动变化。打开后直接聚焦输入框，按 Esc 或点击遮罩关闭。搜索页在独立标签页打开，再次执行命令时激活已有搜索页并聚焦输入框。两种入口共享设置、历史与索引，同时打开时各自保留搜索栏状态。

输入框背景始终使用 `--background-secondary`。聚焦时边框使用 `--interactive-accent`，失焦时使用 `--background-modifier-border`；焦点切换只改变边框颜色。

笔记内嵌入口，无需 Dataview：

````markdown
```primecore-search
```
````

此代码块在阅读视图或 Live Preview 渲染代码块时显示搜索栏。

## 设置

设置仅从插件自身 `data.json` 读取，通过 Obsidian `loadData/saveData` 保存。首次安装使用默认值，不读取外部脚本配置。加载时补全默认值、剔除未知字段，不再转换过时的数据格式。

主设置页包含 21 项设置。Vault 搜索中的正文、专项搜索、内容上限、排序、上下文和默认预设共 13 项，统一由“搜索选项 → 配置搜索选项”按钮进入设置子视图，修改后自动保存。搜索栏中的搜索选项与设置子视图操作相同的插件配置。

排除路径和分组展开状态通过“配置”按钮进入子视图。所有子视图顶栏提供“返回”，返回时恢复父视图的滚动位置、焦点和未保存草稿。

配置页不需要编辑 JSON。搜索引擎、信息源和预设采用可增删的表格；预设路径和引擎的更多选项通过按钮进入子视图，不在表格中展开，也不打开 Modal。条目子视图使用独立草稿，直接返回不改动条目，点击“应用”后返回所属表格，仍需保存表格。排除路径使用逐项列表，分组和索引使用开关。复杂结构统一支持“保存修改 / 还原”；空行、重复项和无效网址会阻止保存。

表格、列表和开关编辑器均在内容上方设置操作顶栏，添加、保存、还原等按钮放在同一行，窄屏自动换行。配置、编辑、删除、返回和应用按钮也统一使用“图标 + 标签”的横向样式，背景透明。

分组标题、编辑顶栏和子视图标题均在左侧显示对应图标。主视图省略重复的“设置”总标题，分组标题采用统一的紧凑样式；表格名称与说明直接显示在顶栏和内容区上方。

各文本输入提供示例占位提示。预设重命名、引擎标识修改或删除时，默认选择同步更新，相关模型一次保存。编辑器使用 Obsidian 原生控件，表格可在窄屏横向滚动，不依赖 EmbedUI 运行时。

历史天数限制控制显示范围，不自动删除记录；“永久”模式查询所有日期。

## 独立性与数据

插件不依赖 Dataview、EmbedUI、Iconize 或仓库中的动态脚本。索引引擎打包到插件，实例按插件隔离。普通图标通过 Obsidian 原生 Lucide API 渲染，预设图标填写 `folder`、`lightbulb` 等原生名称，不解析第三方图标前缀。颜色继承当前 Obsidian 主题，支持底部卡片与防滚动误触交互。

插件标志将放大镜镜片替换为雷达，由 `assets/search-radar.svg` 统一定义，通过 Obsidian `addIcon/setIcon` 用于 Ribbon、搜索页和搜索图标。构建时同时将 SVG 嵌入 `dist/styles.css`，可用 `.primecore-search-logo` 类显示随 `currentColor` 变化的图标，不需要安装图标插件。

搜索历史保存在配置目录下的 `plugins/primecore-search/history/`。索引仅保存在内存，按需后台建立；关闭最后一个搜索实例时释放索引和监听器。多视图历史写入及插件设置写入均使用串行队列，避免覆盖。

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
| `src/settings/` | 默认值、校验、持久化、表格、顶栏与设置页内导航 |
| `src/search/` | Vault / 全局 / Web 查询、元数据、摘要与索引引擎 |
| `src/history/` | 历史展示与并发安全存储 |
| `src/ui/` | 搜索栏、浮层、选项、分页、事件与响应式布局 |
| `src/shared/` | 常量、原生图标与触摸手势 |

搜索组件按职责拆分为行为 mixin。`SearchBarComponent` 组合行为并持有 UI 状态，继承 Obsidian `Component` 管理资源。设置主视图与子视图共用 `SettingsForm`，`SettingsNavigation` 管理视图栈，`ActionToolbar` 统一操作布局。各模块直接维护，构建不读取原仓库或重新提取代码。

测试覆盖当前配置校验、废弃字段清理、设置可达性、默认选择同步、串行持久化、多实例历史写入、防滚动误触、中文全文索引和引擎隔离。
