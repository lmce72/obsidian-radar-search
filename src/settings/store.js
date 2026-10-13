import { normalizeSettings, validateSetting } from './schema.js';

export class SettingsStore {
  constructor(plugin) { this.plugin=plugin; this.pending=Promise.resolve(); }
  async load() {
    let raw=await this.plugin.loadData();
    this.migrated=false;
    if (!raw) {
      const legacy='Components/Configs/config-searchBar.json';
      if (await this.plugin.app.vault.adapter.exists(legacy)) {
        raw=JSON.parse(await this.plugin.app.vault.adapter.read(legacy));
        this.migrated=true;
      }
    }
    this.settings=normalizeSettings(raw,(key,error)=>this.plugin.report('warn',`设置 ${key} 已恢复默认值`,error));
    if (!raw || this.migrated) await this.persist();
    return this.settings;
  }
  update(key,value) { this.settings[key]=validateSetting(key,value); return this.persist(); }
  persist() {
    const snapshot=structuredClone(this.settings);
    const operation=this.pending.catch(error=>this.plugin.report('error','上次设置保存失败',error)).then(()=>this.plugin.saveData(snapshot));
    this.pending=operation; return operation;
  }
}
