import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const result=await Bun.build({entrypoints:['src/main.js'],outdir:'dist',target:'browser',format:'cjs',external:['obsidian'],minify:false});
if(!result.success) {console.error(result.logs);process.exit(1);}
await copyFile('manifest.json','dist/manifest.json');
const svg=await readFile('assets/search-radar.svg','utf8');
const css=await readFile('styles.css','utf8');
await writeFile('dist/styles.css',css.replaceAll('__PRIMECORE_SEARCH_SVG__',`data:image/svg+xml,${encodeURIComponent(svg)}`));
console.log('Built dist/main.js, dist/manifest.json and dist/styles.css');
