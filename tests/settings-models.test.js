import {test,expect} from 'bun:test';
import {CollectionDraft,booleanFields} from '../src/settings/models.js';
import {DEFAULT_SETTINGS} from '../src/settings/schema.js';
import {SettingsStore} from '../src/settings/store.js';

test('rename selected preset preserves its default reference and nested paths',()=>{
  const settings=structuredClone(DEFAULT_SETTINGS);
  settings.searchPresets=[{name:'Work',mode:'白名单',excludeFolders:['Projects'],icon:'folder'}];settings.defaultPreset='Work';
  const draft=new CollectionDraft('searchPresets',settings.searchPresets);draft.rows[0].value.name=' Research ';
  const changes=draft.changes(settings);
  expect(changes.defaultPreset).toBe('Research');expect(changes.searchPresets[0].excludeFolders).toEqual(['Projects']);
  expect(settings.searchPresets[0].name).toBe('Work');
  draft.remove(draft.rows[0]);expect(draft.changes(settings).defaultPreset).toBe('');
});
test('editing an engine ID updates selection; deleting it restores all-engine selection',()=>{
  const settings=structuredClone(DEFAULT_SETTINGS);settings.activeEngineId='google';
  const draft=new CollectionDraft('engines',settings.engines);draft.rows[0].value.id='google-work';
  expect(draft.changes(settings).activeEngineId).toBe('google-work');
  draft.remove(draft.rows[0]);expect(draft.changes(settings).activeEngineId).toBeNull();
});
test('invalid rows are blocked and draft changes never mutate saved settings',()=>{
  const settings=structuredClone(DEFAULT_SETTINGS);
  const sources=new CollectionDraft('webSources',settings.webSources);
  const row=sources.add();row.value.label='Docs';row.value.domain='https://example.com';
  expect(()=>sources.collect()).toThrow('不要包含 https://');
  sources.remove(row);expect(sources.collect()).toEqual(settings.webSources);
  const paths=new CollectionDraft('excludePaths',['Archive']);paths.add();expect(()=>paths.collect()).toThrow('删除空行');
  paths.rows[1].value='Archive';expect(()=>paths.collect()).toThrow('重复');
});
test('group editor includes default groups and preserves custom keys',()=>{
  const fields=booleanFields('resultGroupState',{'Custom group':true});
  expect(fields.some(field=>field.key==='Vault 文件'&&field.default)).toBe(true);
  expect(fields.some(field=>field.key==='Custom group')).toBe(true);
  const settings=structuredClone(DEFAULT_SETTINGS);
  const draft=new CollectionDraft('expandedResultGroups',['标签匹配']);
  expect(draft.changes(settings).resultGroupState['标签匹配']).toBe(true);
  expect(draft.changes(settings).resultGroupState['Vault 文件']).toBe(false);
});
test('batch validates every field before mutating and persists related values together',async()=>{
  const saved=[];const store=new SettingsStore({saveData:async value=>saved.push(value),report:()=>{}});store.settings=structuredClone(DEFAULT_SETTINGS);
  expect(()=>store.updateMany({defaultPreset:'New',historyPageSize:0})).toThrow();expect(store.settings.defaultPreset).toBe('');
  await store.updateMany({searchPresets:[{name:'New',mode:'黑名单',excludeFolders:[]}],defaultPreset:'New'});
  expect(saved).toHaveLength(1);expect(saved[0].searchPresets[0].name).toBe(saved[0].defaultPreset);
});
