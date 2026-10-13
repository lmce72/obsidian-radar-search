import { normalizePath } from 'obsidian';

export class HistoryStore {
  constructor(plugin) {
    this.plugin=plugin;
    this.directory=normalizePath(`${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}/history`);
    this.pending=Promise.resolve();
  }
  path(date) { if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('无效历史日期'); return `${this.directory}/${date}.json`; }
  async initialize() { if (!await this.plugin.app.vault.adapter.exists(this.directory)) await this.plugin.app.vault.adapter.mkdir(this.directory); }
  enqueue(action) {
    const operation=this.pending.catch(error=>this.plugin.report('error','上次历史保存失败',error)).then(action);
    this.pending=operation;return operation;
  }
  async read(path) {
    const adapter=this.plugin.app.vault.adapter;
    if (!await adapter.exists(path)) return [];
    const data=JSON.parse(await adapter.read(path));
    if (!Array.isArray(data)) throw new Error('历史文件必须是数组');
    return data;
  }
  write(path,records) { return this.enqueue(()=>this.plugin.app.vault.adapter.write(path,JSON.stringify(records,null,2))); }
  clear() {
    return this.enqueue(async()=>{
      const adapter=this.plugin.app.vault.adapter;
      const listed=await adapter.list(this.directory);
      for(const file of listed.files) if(/^\d{4}-\d{2}-\d{2}\.json$/.test(file.split('/').pop())) await adapter.remove(file);
    });
  }
  prepend(date,record) {
    return this.enqueue(async()=>{
      const path=this.path(date);const records=await this.read(path);
      if (records[0]?.q===record.q && records[0]?.mode===record.mode && records[0]?.file===record.file) return;
      records.unshift(record);
      await this.plugin.app.vault.adapter.write(path,JSON.stringify(records,null,2));
    });
  }
  removeRecord(path,record) {
    return this.enqueue(async()=>{
      const records=await this.read(path);
      await this.plugin.app.vault.adapter.write(path,JSON.stringify(records.filter(item=>!(item.ts===record.ts && item.q===record.q && item.mode===record.mode && item.file===record.file)),null,2));
    });
  }
}
