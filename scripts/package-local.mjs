import './build.mjs';
import { normalizeSettings } from '../src/settings/schema.js';
const settings=JSON.parse(await Bun.file('migration-settings.json').text());
const normalized=normalizeSettings(settings,(key,error)=>{throw new Error(`${key}: ${error.message}`);});
await Bun.write('dist/data.json',JSON.stringify(normalized,null,2)+'\n');
console.log('Packaged private migrated settings in dist/data.json (Git ignored)');
