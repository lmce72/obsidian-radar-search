import { Setting, TextComponent, DropdownComponent, ToggleComponent, ButtonComponent, TFolder } from 'obsidian';
import { IconRenderer } from '../shared/icons.js';
import { CollectionDraft, booleanFields } from './models.js';
import { SettingsDialog } from './dialogs.js';

// Shared draft/save/reset behavior for every structured model.
// 所有结构化模型统一使用草稿、保存与还原交互。
class ModelEditor {
  constructor(tab,key,parent) {
    this.tab=tab;this.key=key;
    this.root=parent.createDiv({cls:'primecore-settings-model'});this.root.dataset.settingsModel=key;
    this.body=this.root.createDiv();
    this.status=this.root.createDiv({cls:'setting-item-description'});this.status.setAttribute('role','status');
    const actions=new Setting(this.root).setName('');
    actions.addButton(button=>{this.saveButton=button;button.setButtonText('保存修改').setCta().setDisabled(true).onClick(()=>this.commit());});
    actions.addButton(button=>{this.resetButton=button;button.setButtonText('还原').setDisabled(true).onClick(()=>{this.reset();this.render();this.setDirty(false);});});
    this.dirty=false;
  }
  setDirty(dirty=true) {
    this.dirty=dirty;this.saveButton.setDisabled(!dirty);this.resetButton.setDisabled(!dirty);
    this.status.setText(dirty?'有未保存的修改，点击“保存修改”应用。':'');
  }
  async commit() {
    this.saveButton.setDisabled(true);this.resetButton.setDisabled(true);
    try {
      if(await this.tab.saveChanges(this.changes())) {
        this.reset();this.render();this.setDirty(false);this.status.setText('已保存');this.tab.refreshChoices();
      } else this.setDirty();
    } catch(error) {this.setDirty();this.status.setText(error.message);}
  }
}
export class StringListEditor {
  constructor(parent,{value,onChange,placeholder='例如：Projects/Archive',options,folders=[]}) {
    this.value=structuredClone(value);this.onChange=onChange;this.placeholder=placeholder;this.options=options;this.folders=folders;
    this.root=parent.createDiv();this.render();
  }
  render() {
    this.root.empty();const listId=`primecore-paths-${crypto.randomUUID()}`;
    if(!this.options&&this.folders.length) {
      const list=this.root.createEl('datalist',{attr:{id:listId}});
      this.folders.forEach(folder=>list.createEl('option',{attr:{value:folder}}));
    }
    this.value.forEach((value,index)=>{
      const row=new Setting(this.root).setName(`第 ${index+1} 项`);
      const change=next=>{this.value[index]=next;this.onChange([...this.value]);};
      if(this.options)row.addDropdown(control=>{
        control.addOptions(this.options);if(!(value in this.options))control.addOption(value,value);control.setValue(value).onChange(change);
      });
      else row.addText(control=>{
        control.setValue(value).setPlaceholder(this.placeholder).onChange(change);
        control.inputEl.setAttribute('aria-label',`第 ${index+1} 项路径`);
        if(this.folders.length)control.inputEl.setAttribute('list',listId);
      });
      row.addButton(button=>button.setButtonText('删除').onClick(()=>{this.value.splice(index,1);this.onChange([...this.value]);this.render();}));
    });
    if(!this.value.length)this.root.createDiv({text:'尚无条目，点击下方按钮添加。',cls:'setting-item-description'});
    new Setting(this.root).setName('').addButton(button=>button.setButtonText('添加一项').onClick(()=>{
      this.value.push(this.options?Object.keys(this.options).find(key=>!this.value.includes(key))||Object.keys(this.options)[0]:'');
      this.onChange([...this.value]);this.render();
      const inputs=this.root.querySelectorAll('input');inputs[inputs.length-1]?.focus();
    }));
  }
}
export class CollectionEditor extends ModelEditor {
  constructor(tab,key,parent) {super(tab,key,parent);this.reset();this.render();}
  reset() {this.draft=new CollectionDraft(this.key,this.tab.plugin.settings[this.key]);}
  changes() {return this.draft.changes(this.tab.plugin.settings);}
  folders() {return this.tab.app.vault.getAllLoadedFiles().filter(file=>file instanceof TFolder&&file.path!=='/').map(folder=>folder.path);}
  render() {
    this.body.empty();const spec=this.draft.spec;
    if(spec.strings) {
      new StringListEditor(this.body,{value:this.draft.rows.map(row=>row.value),placeholder:spec.placeholder,options:spec.options,folders:spec.options?[]:this.folders(),onChange:value=>{this.draft.rows=value.map(item=>({original:null,value:item}));this.setDirty();}});return;
    }
    const scroll=this.body.createDiv();scroll.style.overflowX='auto';
    const table=scroll.createEl('table');table.style.width='100%';
    const head=table.createEl('thead').createEl('tr');
    spec.fields.forEach(field=>head.createEl('th',{text:field.label,attr:{scope:'col'}}));head.createEl('th',{text:'操作',attr:{scope:'col'}});
    const body=table.createEl('tbody');
    this.draft.rows.forEach((row,index)=>{
      const tr=body.createEl('tr');spec.fields.forEach(field=>this.renderCell(tr.createEl('td'),field,row,index));
      new ButtonComponent(tr.createEl('td')).setButtonText('删除').onClick(()=>{this.draft.remove(row);this.setDirty();this.render();});
    });
    if(!this.draft.rows.length)this.body.createDiv({text:`尚无${spec.singular}，点击下方按钮添加。`,cls:'setting-item-description'});
    new Setting(this.body).setName('').addButton(button=>button.setButtonText(`添加${spec.singular}`).onClick(()=>{
      this.draft.add();this.setDirty();this.render();this.body.querySelector('tbody tr:last-child input')?.focus();
    }));
  }
  renderCell(cell,field,row,index) {
    const change=value=>{row.value[field.key]=value;this.setDirty();};
    const label=`${this.draft.spec.singular} ${index+1}：${field.label}`;
    if(field.type==='fields') {
      new ButtonComponent(cell).setButtonText('编辑').onClick(()=>{
        const draft={value:structuredClone(row.value)};
        const dialog=new SettingsDialog(this.tab.plugin,{
          title:`${row.value.name||this.draft.spec.singular} · ${field.label}`,
          render:parent=>field.fields.forEach(nested=>{
            const setting=new Setting(parent).setName(nested.label);
            this.renderScalar(setting.controlEl,nested,draft.value[nested.key],value=>{draft.value[nested.key]=value;},label+'：'+nested.label);
          }),
          apply:()=>{field.fields.forEach(nested=>{row.value[nested.key]=draft.value[nested.key];});this.setDirty();}
        });dialog.open();
      });return;
    }
    if(field.type==='toggle') {
      const control=new ToggleComponent(cell).setValue(row.value[field.key]).onChange(change);control.toggleEl.setAttribute('aria-label',label);return;
    }
    if(field.type==='select') {
      const control=new DropdownComponent(cell).addOptions(field.options).setValue(row.value[field.key]).onChange(change);control.selectEl.setAttribute('aria-label',label);return;
    }
    if(field.type==='paths') {
      const button=new ButtonComponent(cell).setButtonText(`编辑路径（${row.value[field.key].length}）`);
      button.onClick(()=>{
        let draft=structuredClone(row.value[field.key]);
        const dialog=new SettingsDialog(this.tab.plugin,{
          title:`${row.value.name||'搜索预设'} · 路径`,
          render:parent=>new StringListEditor(parent,{value:draft,folders:this.folders(),onChange:value=>{draft=value;}}),
          apply:()=>{
            const paths=draft.map(path=>path.trim());
            if(paths.some(path=>!path))throw new Error('请填写路径或删除空行。');
            if(new Set(paths).size!==paths.length)throw new Error('路径重复，请合并或删除。');
            change(paths);button.setButtonText(`编辑路径（${paths.length}）`);
          }
        });dialog.open();
      });return;
    }
    this.renderScalar(cell,field,row.value[field.key],change,label);
  }
  renderScalar(cell,field,value,change,label) {
    let preview;
    const control=new TextComponent(cell).setValue(value||'').setPlaceholder(field.placeholder).onChange(next=>{change(next);if(preview)IconRenderer.setIcon(preview,next,16);});
    control.inputEl.setAttribute('aria-label',label);control.inputEl.title=field.placeholder;
    control.inputEl.style.minWidth=field.key==='url'||field.key==='suggest'?'220px':'120px';
    if(field.key==='url'||field.key==='suggest')control.inputEl.type='url';
    if(field.type==='icon') {preview=cell.createSpan();IconRenderer.setIcon(preview,value,16);}
  }
}
export class BooleanModelEditor extends ModelEditor {
  constructor(tab,key,parent) {super(tab,key,parent);this.reset();this.render();}
  reset() {
    this.fields=booleanFields(this.key,this.tab.plugin.settings[this.key]);this.value={...this.tab.plugin.settings[this.key]};
    this.fields.forEach(field=>{if(this.value[field.key]===undefined)this.value[field.key]=field.default;});
  }
  changes() {
    return {[this.key]:structuredClone(this.value)};
  }
  render() {
    this.body.empty();this.fields.forEach(field=>new Setting(this.body).setName(field.label).setDesc(field.description).addToggle(control=>control.setValue(this.value[field.key]).onChange(value=>{this.value[field.key]=value;this.setDirty();})));
  }
}
