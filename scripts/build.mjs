import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const result=await Bun.build({entrypoints:['src/main.js'],outdir:'dist',target:'browser',format:'cjs',external:['obsidian'],minify:false});
if(!result.success) {console.error(result.logs);process.exit(1);}
await copyFile('manifest.json','dist/manifest.json');
console.log('Built dist/main.js and dist/manifest.json');
