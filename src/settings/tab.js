import { PluginSettingTab, Setting } from 'obsidian';
import { SettingsForm } from './form.js';
import { SETTINGS_GROUPS } from './fields.js';

export class SearchSettingTab extends PluginSettingTab {
  display() {
    this.containerEl.empty();
    this.form=new SettingsForm(this.plugin,this.containerEl);
    for(const [title,keys] of SETTINGS_GROUPS) {
      new Setting(this.containerEl).setName(title).setHeading();
      keys.forEach(key=>this.form.addField(key));
    }
  }
}
