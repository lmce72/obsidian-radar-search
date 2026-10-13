import { PluginSettingTab, Setting, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, CHOICES } from './schema.js';
import { MODEL_SPECS } from './models.js';
import { CollectionEditor, BooleanModelEditor } from './editors.js';

const LABELS = {
  excludePaths:'排除路径',defaultMode:'默认搜索模式',placeholderType:'占位文本模式',placeholder:'统一占位文本',
  placeholder_global:'全局搜索占位文本',placeholder_vault:'Vault 搜索占位文本',placeholder_web:'互联网搜索占位文本',
  browserTarget:'浏览器打开位置',historyRetentionMode:'历史显示范围',historyRetentionDays:'历史显示天数',
  historyPageSize:'历史每页数量',dropdownPageSize:'结果每页数量',searchSheetBreakpoint:'底部卡片断点（像素）',
  vaultContentSearch:'搜索正文',vaultContentSearchMaxFiles:'旧版最大文件数（兼容）',vaultContentSearchMaxResults:'正文结果上限',
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
  ['历史与索引',['historyRetentionMode','historyRetentionDays','historyPageSize','searchIndex','debug']],
  ['旧版兼容选项',['vaultContentSearchMaxFiles','expandedResultGroups']]
];
const DESCRIPTIONS = {
  placeholder:'统一占位文本模式下显示；留空使用默认提示。',
  placeholder_global:'按模式设置时显示；留空使用默认提示。',
  placeholder_vault:'按模式设置时显示；留空使用默认提示。',
  placeholder_web:'按模式设置时显示；留空使用默认提示。',
  searchSheetBreakpoint:'视口窄于该宽度时，搜索选项使用底部卡片。',
  excludePaths:'逐项填写仓库内路径，可选择现有文件夹；空列表表示不排除路径。',
  searchPresets:'白名单仅搜索所选路径，黑名单排除所选路径。路径可展开编辑；图标填写 Lucide 名称。',
  defaultPreset:'默认使用的预设；修改名称或删除预设时会自动更新。',
  activeEngineId:'选择一个引擎，或同时使用所有已启用引擎。',
  historyRetentionMode:'指定天数仅限制历史显示范围，不自动删除记录。',
  engines:'搜索网址用 {q} 表示关键词。建议词接口可留空；启用建议词会把输入发送给该接口。标识已自动生成，一般无需修改。',
  webSources:'设置名称和域名，用于限定互联网搜索的信息来源。域名不含 https://。',
  resultGroupState:'逐项设置搜索结果分组是否默认展开。',
  searchIndex:'用下方开关配置全文索引，修改后点击保存。',
  vaultContentSearchMaxFiles:'仅保留旧配置，原搜索实现没有读取此项。',
  expandedResultGroups:'兼容早期配置，保存后同步上方分组展开状态；通常只需修改上方开关。',
  debug:'排查问题时允许输出开发者日志；错误也会显示通知。'
};
const PLACEHOLDERS = {
  placeholder:'例如：搜索笔记、命令或网页…',placeholder_global:'例如：搜索整个知识库…',
  placeholder_vault:'例如：输入文件名、标签或正文关键词…',placeholder_web:'例如：搜索互联网…'
};
export class SearchSettingTab extends PluginSettingTab {
  display() {
    this.containerEl.empty();this.choiceControls=new Map();this.editors=new Map();
    for(const [title,keys] of GROUPS) {
      new Setting(this.containerEl).setName(title).setHeading();
      for(const key of keys)this.addField(key);
    }
  }
  async saveChanges(changes) {
    try {await this.plugin.updateSettings(changes,true);return true;}
    catch(error) {new Notice(`设置未保存：${error.message}`);return false;}
  }
  async save(key,value) {return this.saveChanges({[key]:value});}
  refreshRelatedEditors(key) {
    const related={resultGroupState:'expandedResultGroups',expandedResultGroups:'resultGroupState'}[key];
    const editor=this.editors.get(related);
    if(!editor)return;
    if(editor.dirty)editor.status.setText('关联设置已更新；此处仍有未保存修改，点击“还原”可载入最新值。');
    else {editor.reset();editor.render();editor.setDirty(false);}
  }
  refreshChoices() {
    for(const [key,control] of this.choiceControls) {
      control.selectEl.empty();control.addOption('',key==='defaultPreset'?'不使用预设':'所有已启用引擎');
      const rows=key==='defaultPreset'?this.plugin.settings.searchPresets:this.plugin.settings.engines;
      rows.forEach(row=>control.addOption(key==='defaultPreset'?row.name:row.id,row.name));
      control.setValue(this.plugin.settings[key]||'');
    }
  }
  addField(key) {
    const value=this.plugin.settings[key];const row=new Setting(this.containerEl).setName(LABELS[key]).setDesc(DESCRIPTIONS[key]||'');
    if(MODEL_SPECS[key]) {this.editors.set(key,new CollectionEditor(this,key,this.containerEl));return;}
    if(['resultGroupState','searchIndex'].includes(key)) {this.editors.set(key,new BooleanModelEditor(this,key,this.containerEl));return;}
    if(typeof DEFAULT_SETTINGS[key]==='boolean') {row.addToggle(control=>control.setValue(value).onChange(next=>this.save(key,next)));return;}
    if(CHOICES[key]) {row.addDropdown(control=>control.addOptions(CHOICES[key]).setValue(value).onChange(next=>this.save(key,next)));return;}
    if(['defaultPreset','activeEngineId'].includes(key)) {
      row.addDropdown(control=>{
        this.choiceControls.set(key,control);this.refreshChoices();control.onChange(next=>this.save(key,next||(key==='activeEngineId'?null:'')));
      });return;
    }
    row.addText(control=>{
      control.setValue(String(value)).setPlaceholder(PLACEHOLDERS[key]||String(DEFAULT_SETTINGS[key]));control.inputEl.setAttribute('aria-label',LABELS[key]);
      if(typeof value==='number') {control.inputEl.type='number';control.inputEl.min='1';control.inputEl.step='1';}
      control.inputEl.addEventListener('change',()=>this.save(key,typeof value==='number'?Number(control.getValue()):control.getValue()));
    });
  }
}
