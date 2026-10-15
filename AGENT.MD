# Radar Search development rules

- Source, build scripts and tests use TypeScript. Keep the Obsidian runtime external to the bundle.
- Before publishing, run `bun install --frozen-lockfile`, `bun run check`, `bun test --timeout 5000`, and `bun run build`.
- Use native Obsidian UI and icon APIs; keep the plugin independent of Iconize and external vault scripts.
- Do not commit personal settings, history, credentials, absolute local paths or generated release assets.
- Preserve the existing `primecore-search` plugin ID so installed settings and command shortcuts continue working; the public brand is **Radar Search**.

## Releases

- **Release version numbers and Git tags must never have a `v` prefix.** Use `1.0.0`, not `v1.0.0`.
- Keep `package.json`, `manifest.json` and `versions.json` consistent.
- Run `bun run release:check <version>` before tagging. The tag must exactly equal `manifest.json.version`.
- Update `RELEASE_NOTES.md`, then publish `dist/main.js`, `dist/manifest.json` and `dist/styles.css` as GitHub Release assets.
- Never include `data.json` or search history in a release.

## Type boundaries

- Keep settings, persistence, navigation and search/index contracts explicitly typed in `src/types.ts` and `src/search/types.ts`.
- Use `unknown` at untrusted boundaries and validate input before saving. Do not bypass checking with `@ts-nocheck`, `@ts-ignore` or `as any`.
- Dynamic UI behaviors are composed through one constructor boundary in `src/ui/search-bar.ts`; retain the common `Component` lifecycle contract when editing mixins.
