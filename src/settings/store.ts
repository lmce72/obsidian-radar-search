import { normalizeSettings, validateSetting } from './schema.ts';
import type {PersistenceHost,SearchSettings,SettingsPatch} from '../types.ts';

export class SettingsStore {
  declare plugin:PersistenceHost;
  declare pending:Promise<unknown>;
  declare settings:SearchSettings;

  constructor(plugin:PersistenceHost) { this.plugin=plugin; this.pending=Promise.resolve(); }
  async load() {
    const raw=await this.plugin.loadData();
    this.settings=normalizeSettings(raw,(key,error)=>this.plugin.report('warn',`设置 ${key} 已恢复默认值`,error));
    if (JSON.stringify(raw)!==JSON.stringify(this.settings)) await this.persist();
    return this.settings;
  }
  update<K extends keyof SearchSettings>(key:K,value:SearchSettings[K]) { return this.updateMany({[key]:value}); }
  updateMany(changes:SettingsPatch) {
    const validated=Object.fromEntries(Object.entries(changes).map(([key,value])=>[key,validateSetting(key,value)]));
    const operation=this.pending.catch(error=>this.plugin.report('error','上次设置保存失败',error)).then(async()=>{
      const snapshot={...structuredClone(this.settings),...validated};
      await this.plugin.saveData(snapshot);
      Object.assign(this.settings,validated);
    });
    this.pending=operation;return operation;
  }
  persist() {
    const snapshot=structuredClone(this.settings);
    const operation=this.pending.catch(error=>this.plugin.report('error','上次设置保存失败',error)).then(()=>this.plugin.saveData(snapshot));
    this.pending=operation; return operation;
  }
}
