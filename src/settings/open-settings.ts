import type {App} from 'obsidian';

/** Obsidian's settings navigator is not part of the public App type. Validate the boundary. */
export function openPluginSettings(app:App,pluginId:string) {
  const settings:unknown=Reflect.get(app,'setting');
  if(!settings||typeof settings!=='object'||!('open' in settings)||typeof settings.open!=='function'||!('openTabById' in settings)||typeof settings.openTabById!=='function') {
    throw new Error('当前 Obsidian 无法打开插件设置，请从设置中的社区插件列表进入。');
  }
  settings.open();settings.openTabById(pluginId);
}
