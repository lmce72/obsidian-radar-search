export const SHEET_BREAKPOINT = 768;

// 搜索选项面板的最小高度（px）：下方空间不足时的保底可视高度
// Minimum height (px) for the options panel, its floor when space below the button runs short.
export const MIN_PANEL_H = 120;

// 搜索栏 pill 内三个按钮的图标尺寸（搜索模式 / 搜索 / 搜索选项）
// Icon size (px) for the three pill buttons: search mode, search, and search options.
export const PILL_ICON_SIZE = 16;

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

