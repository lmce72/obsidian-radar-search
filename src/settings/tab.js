import { PluginSettingTab, Setting } from 'obsidian';
import { SettingsForm } from './form.js';
import { SETTINGS_GROUPS } from './fields.js';
import { SettingsNavigation } from './navigation.js';

export class SearchSettingTab extends PluginSettingTab {
  display() {
    this.containerEl.empty();
    this.navigation=new SettingsNavigation(this.containerEl);
    this.navigation.push({title:'设置',render:parent=>{
      this.form=new SettingsForm(this.plugin,parent,this.navigation);
      for(const [title,keys] of SETTINGS_GROUPS) {
        new Setting(parent).setName(title).setHeading();
        keys.forEach(key=>this.form.addField(key));
      }
    }});
  }
}
