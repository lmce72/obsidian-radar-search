import { Modal, Setting } from 'obsidian';

// Shared modal lifecycle for settings forms and isolated table-cell drafts.
// 设置表单与表格单元草稿共用弹窗生命周期。
export class SettingsDialog extends Modal {
  constructor(plugin,{title,render,apply,confirmText=apply?'应用':'完成'}) {
    super(plugin.app);
    this.plugin=plugin;this.title=title;this.renderBody=render;this.apply=apply;this.confirmText=confirmText;
  }
  onOpen() {
    this.plugin.settingsDialogs.add(this);
    this.setTitle(this.title);
    this.bodyEl=this.contentEl.createDiv();
    this.renderBody(this.bodyEl);
    this.status=this.contentEl.createDiv({cls:'setting-item-description',attr:{role:'status'}});
    const actions=new Setting(this.contentEl).setName('');
    if(this.apply)actions.addButton(button=>button.setButtonText('取消').onClick(()=>this.close()));
    actions.addButton(button=>{this.confirmButton=button;button.setButtonText(this.confirmText).setCta().onClick(()=>this.confirm());});
  }
  async confirm() {
    this.confirmButton.setDisabled(true);
    try {if(this.apply)await this.apply();this.close();}
    catch(error) {this.status.setText(error.message);this.confirmButton.setDisabled(false);}
  }
  onClose() {this.plugin.settingsDialogs.delete(this);this.contentEl.empty();}
}
