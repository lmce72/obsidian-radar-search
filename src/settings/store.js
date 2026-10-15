import { normalizeSettings, validateSetting } from './schema.js';

export class SettingsStore {
  constructor(plugin) { this.plugin=plugin; this.pending=Promise.resolve(); }
  async load() {
    const raw=await this.plugin.loadData();
    this.settings=normalizeSettings(raw,(key,error)=>this.plugin.report('warn',`设置 ${key} 已恢复默认值`,error));
    if (JSON.stringify(raw)!==JSON.stringify(this.settings)) await this.persist();
    return this.settings;
  }
  update(key,value) { return this.updateMany({[key]:value}); }
  updateMany(changes) {
    const validated=Object.fromEntries(Object.entries(changes).map(([key,value])=>[key,validateSetting(key,value)]));
    Object.assign(this.settings,validated);return this.persist();
  }
  persist() {
    const snapshot=structuredClone(this.settings);
    const operation=this.pending.catch(error=>this.plugin.report('error','上次设置保存失败',error)).then(()=>this.plugin.saveData(snapshot));
    this.pending=operation; return operation;
  }
}
