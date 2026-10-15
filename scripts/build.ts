import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const result=await Bun.build({entrypoints:['src/main.ts'],outdir:'dist',target:'browser',format:'cjs',external:['obsidian'],minify:false});
if(!result.success) {console.error(result.logs);process.exit(1);}
const notice=await readFile('THIRD_PARTY_NOTICES.md','utf8');
const banner=`/*! ${notice} */\n`;
await writeFile('dist/main.js',banner+await readFile('dist/main.js','utf8'));
await copyFile('manifest.json','dist/manifest.json');
const svg=await readFile('assets/search-radar.svg','utf8');
const css=await readFile('styles.css','utf8');
await writeFile('dist/styles.css',banner+css.replaceAll('__PRIMECORE_SEARCH_SVG__',`data:image/svg+xml,${encodeURIComponent(svg)}`));
console.log('Built dist/main.js, dist/manifest.json and dist/styles.css');
