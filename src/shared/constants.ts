export const SHEET_BREAKPOINT = 768;

// 搜索选项面板的最小高度（px）：下方空间不足时的保底可视高度
// Minimum height (px) for the options panel, its floor when space below the button runs short.
export const MIN_PANEL_H = 120;

// 搜索栏 pill 内三个按钮的图标尺寸（搜索模式 / 搜索 / 搜索选项）
// Icon size (px) for the three pill buttons: search mode, search, and search options.
export const PILL_ICON_SIZE = 16;

// 搜索结果里可收起的分组（含主文件组）；展开状态记忆在配置 resultGroupState（标题 → 是否展开）中
// 名称必须与 _searchVault / _searchGlobal 里 push 的 title 一致
// Collapsible result groups (the main file group included). Expanded state is persisted in the
// `resultGroupState` config key as { title: boolean }. Names must match the pushed group titles.
export const COLLAPSIBLE_GROUPS = new Set(["Vault 文件", "内容匹配", "命令匹配", "隐藏命令", "属性匹配", "标签匹配", "书签匹配", "内链匹配", "外链匹配"]);

// 未在配置中记录过的分组，默认是否展开：主文件组默认展开（否则搜索结果默认全被藏起来），专项分组默认收起
// Default expanded state for groups with no recorded state: the main file group stays open (otherwise a
// search would hide its primary results), special-search groups start collapsed.
export const DEFAULT_EXPANDED_GROUPS = new Set(["Vault 文件"]);

// 分组标题使用 Obsidian 原生 Lucide 图标。
// Collapsible group titles use Obsidian's native Lucide icons.
export const GROUP_ICON = {
    "Vault 文件": "files",
    "内容匹配": "file-search",
    "命令匹配": "command",
    "隐藏命令": "eye-off",
    "属性匹配": "braces",
    "标签匹配": "tag",
    "书签匹配": "bookmark",
    "内链匹配": "brackets",
    "外链匹配": "external-link"
};

// 非 markdown 文件的扩展名 → Obsidian 原生 Lucide 图标名。
// 未列出的扩展名一律回落 files
// Extension → Lucide icon name for non-markdown files. Every name below was verified against the
// built-in Lucide set; unlisted extensions fall back to `files`.
export const EXT_ICON = {
    json: "file-json",
    js: "file-code", mjs: "file-code", cjs: "file-code", ts: "file-code", tsx: "file-code", jsx: "file-code",
    css: "file-code", html: "file-code", py: "file-code", sh: "file-code", yml: "file-code", yaml: "file-code",
    txt: "file-text", pdf: "file-text", canvas: "layout-template",
    png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", bmp: "image", avif: "image",
    mp3: "file-audio", wav: "file-audio", m4a: "file-audio", ogg: "file-audio", flac: "file-audio",
    mp4: "file-video", mov: "file-video", mkv: "file-video", webm: "file-video", avi: "file-video",
    zip: "file-archive", rar: "file-archive", "7z": "file-archive", gz: "file-archive", tar: "file-archive",
    ttf: "file-type", otf: "file-type", woff: "file-type", woff2: "file-type", ttc: "file-type",
    base: "file-question", excalidraw: "file-question"
};

