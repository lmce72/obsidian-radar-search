import fs from 'node:fs';
import path from 'node:path';
const transpiler=new Bun.Transpiler({loader:'ts',target:'browser'});
let count=0;
function check(directory) {
  for(const item of fs.readdirSync(directory,{withFileTypes:true})) {
    const file=path.join(directory,item.name);
    if(item.isDirectory()) {check(file);continue;}
    if(!file.endsWith('.ts'))continue;
    const source=fs.readFileSync(file,'utf8');
    transpiler.transformSync(source);
    if(/\.innerHTML\s*=|new Function\(|window\.__|\bfetch\(/.test(source))throw Error(`Forbidden runtime dependency: ${file}`);
    count++;
  }
}
check('src');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(manifest.version!==pkg.version)throw Error('Version mismatch');
console.log(`Checked ${count} source modules and manifest`);
