export const DEFAULT_SETTINGS = {
  excludePaths: [], defaultMode: 'vault', placeholderType: 'unified', placeholder: '',
  placeholder_global: '', placeholder_vault: '', placeholder_web: '',
  browserTarget: 'external', historyRetentionMode: 'forever', historyRetentionDays: 30,
  historyPageSize: 8, dropdownPageSize: 10, searchSheetBreakpoint: 768,
  vaultContentSearch: true, vaultContentSearchMaxFiles: 15, vaultContentSearchMaxResults: 10,
  searchWikiLinks: false, searchMdLinks: false, searchBookmarks: false, searchTags: true,
  searchCommands: true, searchNonMarkdown: false, searchProperties: false, extendedContext: true,
  vaultSortMode: 'relevance', limitContentResults: false, searchPresets: [], defaultPreset: '',
  activeEngineId: null, webSources: [
    {label:'GitHub',domain:'github.com'}, {label:'Reddit',domain:'reddit.com'},
    {label:'StackOverflow',domain:'stackoverflow.com'}, {label:'Scholar',domain:'scholar.google.com'},
    {label:'YouTube',domain:'youtube.com'}, {label:'Hacker News',domain:'news.ycombinator.com'}
  ],
  engines: [
    {id:'google',name:'Google',url:'https://www.google.com/search?q={q}',suggest:'https://suggestqueries.google.com/complete/search?client=firefox&q={q}',enabled:true},
    {id:'bing',name:'Bing',url:'https://www.bing.com/search?q={q}',suggest:'https://api.bing.com/qsonhs.aspx?q={q}',enabled:true},
    {id:'yahoo',name:'Yahoo',url:'https://search.yahoo.com/search?p={q}',suggest:'',enabled:false},
    {id:'duckduckgo',name:'DuckDuckGo',url:'https://duckduckgo.com/?q={q}',suggest:'https://duckduckgo.com/ac/?q={q}&type=list',enabled:false},
    {id:'perplexity',name:'Perplexity AI',url:'https://www.perplexity.ai/search?q={q}',suggest:'',enabled:false}
  ],
  expandedResultGroups: [], resultGroupState: {},
  searchIndex: {enabled:true,content:true,bigrams:true,debug:false}, debug:false
};

export const CHOICES = {
  defaultMode: {vault:'Vault 内搜索',global:'全局搜索',web:'互联网搜索'},
  placeholderType: {unified:'统一占位文本',custom:'按搜索模式设置'},
  browserTarget: {external:'外部浏览器',internal:'Obsidian 标签页','internal-window':'Obsidian 独立窗口'},
  historyRetentionMode: {forever:'永久',custom:'指定天数'},
  vaultSortMode: {relevance:'相关度','mtime-desc':'修改时间降序','mtime-asc':'修改时间升序','ctime-desc':'创建时间降序','ctime-asc':'创建时间升序','alpha-asc':'名称升序','alpha-desc':'名称降序'}
};

function http(value) { try { return ['https:','http:'].includes(new URL(value.replaceAll('{q}','test')).protocol); } catch { return false; } }
export function validateSetting(key, value) {
  if (!(key in DEFAULT_SETTINGS)) throw new Error(`未知设置：${key}`);
  if (CHOICES[key] && !(value in CHOICES[key])) throw new Error('请选择有效选项');
  const fallback=DEFAULT_SETTINGS[key];
  if (typeof fallback === 'boolean' && typeof value !== 'boolean') throw new Error('需要布尔值');
  if (typeof fallback === 'number' && (!Number.isInteger(value) || value < 1 || value > 100000)) throw new Error('请输入 1–100000 的整数');
  if (typeof fallback === 'string' && typeof value !== 'string') throw new Error('需要文本');
  if (Array.isArray(fallback) && !Array.isArray(value)) throw new Error('需要 JSON 数组');
  if (['excludePaths','expandedResultGroups'].includes(key) && !value.every(item=>typeof item==='string')) throw new Error('每项必须是文本');
  if (key==='engines') {
    const ids = new Set();
    for (const item of value) {
      if (!item || typeof item.id!=='string' || !item.id || ids.has(item.id) || typeof item.name!=='string' || !item.name || typeof item.url!=='string' || !http(item.url) || !item.url.includes('{q}') || typeof item.suggest!=='string' || (item.suggest && (!http(item.suggest) || !item.suggest.includes('{q}'))) || typeof item.enabled!=='boolean') throw new Error('引擎需要唯一 id、name、含 {q} 的 HTTP(S) url、suggest 和 enabled');
      ids.add(item.id);
    }
  }
  if (key==='searchPresets' && !value.every(item=>item && typeof item.name==='string' && item.name && ['白名单','黑名单'].includes(item.mode) && Array.isArray(item.excludeFolders) && item.excludeFolders.every(path=>typeof path==='string') && (item.icon===undefined || typeof item.icon==='string'))) throw new Error('预设需要 name、mode（白名单/黑名单）、excludeFolders 数组及可选 Lucide icon');
  if (key==='webSources' && !value.every(item=>item && typeof item.label==='string' && item.label && typeof item.domain==='string' && /^[a-z0-9.-]+(?::\d+)?(?:\/[^\s]*)?$/i.test(item.domain))) throw new Error('信息源需要 label 和不含协议的 domain');
  if (key==='activeEngineId' && value!==null && typeof value!=='string') throw new Error('引擎 ID 必须是文本或 null');
  if (['resultGroupState','searchIndex'].includes(key)) {
    if (!value || typeof value!=='object' || Array.isArray(value) || !Object.values(value).every(item=>typeof item==='boolean')) throw new Error('需要布尔值组成的 JSON 对象');
    if (key==='searchIndex' && Object.keys(value).some(key=>!['enabled','content','bigrams','debug'].includes(key))) throw new Error('未知索引选项');
  }
  return structuredClone(value);
}

export function normalizeSettings(input, onInvalid = () => {}) {
  const result=structuredClone(DEFAULT_SETTINGS);
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (input?.[key] === undefined) continue;
    try { result[key]=validateSetting(key,input[key]); } catch (error) { onInvalid(key,error); }
  }
  result.searchIndex={...DEFAULT_SETTINGS.searchIndex,...result.searchIndex};
  if (!input?.resultGroupState && Array.isArray(input?.expandedResultGroups)) result.resultGroupState=Object.fromEntries(result.expandedResultGroups.map(name=>[name,true]));
  return result;
}
