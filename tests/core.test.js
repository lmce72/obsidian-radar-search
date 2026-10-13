import { test, expect, mock } from 'bun:test';
mock.module('obsidian',()=>({normalizePath:value=>value.replaceAll('\\','/')}));
const {HistoryStore}=await import('../src/history/store.js');
const {SettingsStore}=await import('../src/settings/store.js');
const {DEFAULT_SETTINGS,normalizeSettings,validateSetting}=await import('../src/settings/schema.js');
const {createSearchIndexEngine}=await import('../src/search/index-engine.js');
const {makeTouchHandler}=await import('../src/shared/touch.js');

test('configuration migration preserves every legacy key and isolates defaults',async()=>{
  const legacy={...structuredClone(DEFAULT_SETTINGS),defaultMode:'web',searchPresets:[{name:'Example',mode:'白名单',excludeFolders:['Example'],icon:'LiFiles'}],resultGroupState:{'标签匹配':true}};
  const normalized=normalizeSettings(legacy);
  for(const key of Object.keys(legacy))expect(normalized[key]).toEqual(legacy[key]);
  const copy=normalizeSettings({});copy.engines[0].enabled=false;
  expect(DEFAULT_SETTINGS.engines[0].enabled).toBe(true);
});

test('settings copy legacy once, save serially and never modify source config',async()=>{
  const snapshots=[];
  const plugin={app:{vault:{adapter:{exists:async()=>true,read:async()=>JSON.stringify({defaultMode:'web',searchIndex:{content:false}})}}},loadData:async()=>null,saveData:async data=>{await Promise.resolve();snapshots.push(data);},report:()=>{}};
  const store=new SettingsStore(plugin);await store.load();
  expect(store.migrated).toBe(true);expect(store.settings.defaultMode).toBe('web');
  expect(store.settings.searchIndex).toEqual({enabled:true,content:false,bigrams:true,debug:false});
  await Promise.all([store.update('historyPageSize',20),store.update('dropdownPageSize',30)]);
  expect(snapshots.at(-1).historyPageSize).toBe(20);expect(snapshots.at(-1).dropdownPageSize).toBe(30);
});

test('reject invalid JSON settings before replacing saved configuration',()=>{
  expect(()=>validateSetting('engines',[{id:'a',name:'A',url:'javascript:alert(1)',suggest:'',enabled:true}])).toThrow();
  expect(()=>validateSetting('historyPageSize',0)).toThrow();
  expect(()=>validateSetting('searchPresets',[{name:'a',mode:'白名单',excludeFolders:'a'}])).toThrow();
  expect(()=>validateSetting('resultGroupState',{x:'true'})).toThrow();
});

test('history preserves concurrent writes from independent search views',async()=>{
  const files=new Map();
  const adapter={exists:async p=>files.has(p),read:async p=>files.get(p),write:async(p,data)=>{await Promise.resolve();files.set(p,data);}};
  const history=new HistoryStore({app:{vault:{configDir:'.obsidian',adapter}},manifest:{id:'primecore-search'},report:()=>{}});
  await Promise.all([history.prepend('2026-10-13',{q:'one',mode:'vault',ts:1}),history.prepend('2026-10-13',{q:'two',mode:'vault',ts:2})]);
  expect((await history.read(history.path('2026-10-13'))).map(item=>item.q)).toEqual(['two','one']);
  await Promise.all([history.removeRecord(history.path('2026-10-13'),{q:'one',mode:'vault',ts:1}),history.prepend('2026-10-13',{q:'three',mode:'web',ts:3})]);
  expect((await history.read(history.path('2026-10-13'))).map(item=>item.q)).toEqual(['three','two']);
});

test('touch scroll and mismatched fingers never trigger actions',()=>{
  let actions=0;const handler=makeTouchHandler(()=>actions++);
  const start=(x,y,id=1)=>handler.onTouchStart({touches:[{clientX:x,clientY:y,identifier:id}]});
  const end=(x,y,id=1)=>handler.onTouchEnd({preventDefault(){},changedTouches:[{clientX:x,clientY:y,identifier:id}]});
  start(10,10);end(10,100);expect(actions).toBe(0);
  start(10,10);end(10,10,2);expect(actions).toBe(0);
  start(10,10);end(12,12);expect(actions).toBe(1);
});

test('bundled index finds Chinese content and isolates engine instances',async()=>{
  const docs=[{path:'alpha.md',basename:'Alpha',stat:{mtime:1}},{path:'beta.md',basename:'Beta',stat:{mtime:2}}];
  const content={'alpha.md':'中文检索与学习笔记','beta.md':'independent document'};
  const engine=createSearchIndexEngine(),other=createSearchIndexEngine();
  await engine.init({listFiles:()=>docs,fileFor:p=>docs.find(f=>f.path===p),readText:async p=>content[p],getMeta:()=>null},{enabled:true,content:true,bigrams:true});
  expect(engine.search('中文检索').results[0].path).toBe('alpha.md');
  expect(engine.search('Alpha').results[0].path).toBe('alpha.md');
  expect(other.search('Alpha').ready).toBe(false);
  engine.dispose();expect(engine.search('Alpha').ready).toBe(false);
});
