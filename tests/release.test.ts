import {readFileSync} from 'node:fs';
import {test,expect} from 'bun:test';
test('release policy accepts the manifest version and rejects a v prefix',()=>{
  const version=JSON.parse(readFileSync('manifest.json','utf8')).version;
  const valid=Bun.spawnSync(['bun','scripts/release-check.ts',version]);
  const prefixed=Bun.spawnSync(['bun','scripts/release-check.ts',`v${version}`]);
  expect(valid.exitCode).toBe(0);
  expect(prefixed.exitCode).not.toBe(0);
});
