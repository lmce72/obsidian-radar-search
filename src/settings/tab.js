import { PluginSettingTab, Setting, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, CHOICES, validateSetting } from './schema.js';

const LABELS = {
  excludePaths:'排除路径', defaultMode:'默认搜索模式', placeholderType:'占位文本模式', placeholder:'统一占位文本',
  placeholder_global:'全局搜索占位文本',placeholder_vault:'Vault 搜索占位文本',placeholder_web:'互联网搜索占位文本',
  browserTarget:'浏览器打开位置',historyRetentionMode:'历史显示范围',historyRetentionDays:'历史显示天数',
  historyPageSize:'历史每页数量',dropdownPageSize:'结果每页数量',searchSheetBreakpoint:'底部卡片断点（像素）',
  vaultContentSearch:'搜索正文',vaultContentSearchMaxFiles:'旧版最大文件数（保留兼容）',vaultContentSearchMaxResults:'正文结果上限',
  searchWikiLinks:'搜索内链',searchMdLinks:'搜索外链',searchBookmarks:'搜索书签',searchTags:'搜索标签',
  searchCommands:'搜索命令',searchNonMarkdown:'搜索非 Markdown 文件',searchProperties:'搜索 YAML 属性',
  extendedContext:'扩展正文上下文',vaultSortMode:'结果排序',limitContentResults:'限制正文结果数量',
  searchPresets:'搜索预设',defaultPreset:'默认预设',activeEngineId:'当前搜索引擎',webSources:'互联网信息源',
  engines:'搜索引擎',expandedResultGroups:'旧版展开分组（兼容）',resultGroupState:'结果分组展开状态',searchIndex:'索引选项',debug:'开发者日志'
};
const GROUPS = [
  ['搜索栏',['defaultMode','placeholderType','placeholder','placeholder_global','placeholder_vault','placeholder_web','searchSheetBreakpoint']],
  ['Vault 搜索',['vaultContentSearch','vaultContentSearchMaxResults','limitContentResults','vaultSortMode','dropdownPageSize','extendedContext','searchNonMarkdown','searchWikiLinks','searchMdLinks','searchBookmarks','searchTags','searchCommands','searchProperties','excludePaths','searchPresets','defaultPreset','resultGroupState']],
  ['互联网搜索',['browserTarget','engines','activeEngineId','webSources']],
  ['历史与索引',['historyRetentionMode','historyRetentionDays','historyPageSize','searchIndex','debug','vaultContentSearchMaxFiles','expandedResultGroups']]
];
const DESCRIPTIONS = {
  historyRetentionMode:'指定天数仅限制历史显示范围，不自动删除记录。',
  engines:'JSON 数组：id、name、url（含 {q}）、suggest（可为空）、enabled。互联网建议词会把输入发送给已启用引擎。',
  searchPresets:'JSON 数组：name、mode（白名单/黑名单）、excludeFolders、icon（Lucide 图标名）。',
  webSources:'JSON 数组：label、domain（不含 https://）。',
  resultGroupState:'JSON 对象：分组标题 → true（展开）或 false（收起）。',
  searchIndex:'JSON 对象：enabled、content、bigrams、debug，值为 true/false。',
  vaultContentSearchMaxFiles:'原配置已保存此项；原搜索实现没有读取它。',
  debug:'允许输出开发者日志；错误也会显示通知。'
};

export class SearchSettingTab extends PluginSettingTab {
  display() {
    this.containerEl.empty();
    for (const [title,keys] of GROUPS) {
      new Setting(this.containerEl).setName(title).setHeading();
      for (const key of keys) this.addField(key);
    }
  }
  async save(key,value) {
    try { await this.plugin.updateSetting(key,value,true); return true; }
    catch (error) { new Notice(`设置未保存：${error.message}`); return false; }
  }
  addField(key) {
    const value=this.plugin.settings[key];
    const row=new Setting(this.containerEl).setName(LABELS[key]).setDesc(DESCRIPTIONS[key] || '');
    if (typeof DEFAULT_SETTINGS[key]==='boolean') {
      row.addToggle(toggle=>toggle.setValue(value).onChange(next=>this.save(key,next)));return;
    }
    if (CHOICES[key]) {
      row.addDropdown(dropdown=>dropdown.addOptions(CHOICES[key]).setValue(value).onChange(next=>this.save(key,next)));return;
    }
    if (['defaultPreset','activeEngineId'].includes(key)) {
      const options=key==='defaultPreset' ? this.plugin.settings.searchPresets.map(item=>[item.name,item.name]) : this.plugin.settings.engines.map(item=>[item.id,item.name]);
      row.addDropdown(dropdown=>{dropdown.addOption('','全部 / 无预设');options.forEach(([id,label])=>dropdown.addOption(id,label));dropdown.setValue(value || '').onChange(next=>this.save(key,next || (key==='activeEngineId'?null:'')));});return;
    }
    if (Array.isArray(value) || typeof value==='object') {
      let editor;
      row.addTextArea(area=>{editor=area;area.setValue(JSON.stringify(value,null,2));area.inputEl.rows=6;area.inputEl.cols=40;});
      row.addButton(button=>button.setButtonText('保存').onClick(async()=>{
        try {
          const parsed=validateSetting(key,JSON.parse(editor.getValue()));
          if (await this.save(key,parsed)) {new Notice('设置已保存');this.display();}
        } catch (error) {new Notice(`JSON 无效：${error.message}`);}
      }));return;
    }
    row.addText(text=>{
      text.setValue(String(value));
      if (typeof value==='number') {text.inputEl.type='number';text.inputEl.min='1';}
      text.inputEl.addEventListener('change',()=>this.save(key,typeof value==='number'?Number(text.getValue()):text.getValue()));
    });
  }
}
