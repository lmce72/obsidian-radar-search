import { Setting, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, CHOICES } from './schema.js';
import { MODEL_SPECS } from './models.js';
import { CollectionEditor, BooleanModelEditor } from './editors.js';
import { SettingsDialog } from './dialogs.js';
import { LABELS, DESCRIPTIONS, PLACEHOLDERS, VAULT_OPTION_KEYS } from './fields.js';

export class SettingsForm {
  constructor(plugin,container) {
    this.plugin=plugin;this.app=plugin.app;this.containerEl=container;
    this.choiceControls=new Map();this.editors=new Map();
  }
  async saveChanges(changes) {
    try {await this.plugin.updateSettings(changes,true);return true;}
    catch(error) {new Notice(`设置未保存：${error.message}`);return false;}
  }
  async save(key,value) {return this.saveChanges({[key]:value});}
  refreshChoices() {
    for(const [key,control] of this.choiceControls) {
      control.selectEl.empty();control.addOption('',key==='defaultPreset'?'不使用预设':'所有已启用引擎');
      const rows=key==='defaultPreset'?this.plugin.settings.searchPresets:this.plugin.settings.engines;
      rows.forEach(row=>control.addOption(key==='defaultPreset'?row.name:row.id,row.name));
      control.setValue(this.plugin.settings[key]||'');
    }
  }
  addField(key) {
    const row=new Setting(this.containerEl).setName(LABELS[key]).setDesc(DESCRIPTIONS[key]||'');
    if(key==='vaultOptions') {
      row.addButton(button=>button.setButtonText('配置搜索选项').onClick(()=>{
        const dialog=new SettingsDialog(this.plugin,{title:'Vault 搜索选项',render:parent=>{
          dialog.form=new SettingsForm(this.plugin,parent);VAULT_OPTION_KEYS.forEach(option=>dialog.form.addField(option));
        }});dialog.open();
      }));return;
    }
    const value=this.plugin.settings[key];
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
