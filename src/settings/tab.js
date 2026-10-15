import { PluginSettingTab, Setting } from 'obsidian';
import { SettingsForm } from './form.js';
import { SETTINGS_GROUPS } from './fields.js';
import { SettingsNavigation } from './navigation.js';
import { renderSettingTitle } from './controls.js';

export class SearchSettingTab extends PluginSettingTab {
  display() {
    this.containerEl.empty();
    this.navigation=new SettingsNavigation(this.containerEl);
    this.navigation.push({title:'设置',showHeader:false,render:parent=>{
      this.form=new SettingsForm(this.plugin,parent,this.navigation);
      for(const [title,keys] of SETTINGS_GROUPS) {
        const heading=new Setting(parent).setName(title).setHeading();
        heading.settingEl.addClass('primecore-settings-section');
        renderSettingTitle(heading.nameEl,title);
        keys.forEach(key=>this.form.addField(key));
      }
    }});
  }
}
