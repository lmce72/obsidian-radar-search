import { validateSetting } from './schema.js';
import { COLLAPSIBLE_GROUPS, DEFAULT_EXPANDED_GROUPS } from '../shared/constants.js';

export const MODEL_SPECS = {
  engines: {
    singular:'引擎',create:()=>({id:`engine-${crypto.randomUUID().slice(0,8)}`,name:'',url:'',suggest:'',enabled:true}),
    fields:[
      {key:'name',label:'名称',placeholder:'例如：Google'},
      {key:'url',label:'搜索网址',placeholder:'https://www.google.com/search?q={q}'},
      {key:'enabled',label:'启用',type:'toggle'},
      {key:'advanced',label:'更多选项',type:'fields',fields:[
        {key:'id',label:'标识',placeholder:'自动生成，一般无需修改'},
        {key:'suggest',label:'建议词接口',placeholder:'选填，留空关闭建议词'}
      ]}
    ]
  },
  webSources: {
    singular:'信息源',create:()=>({label:'',domain:''}),
    fields:[{key:'label',label:'名称',placeholder:'例如：GitHub'},{key:'domain',label:'域名',placeholder:'例如：github.com，不含 https://'}]
  },
  searchPresets: {
    singular:'预设',create:()=>({name:'',mode:'黑名单',excludeFolders:[],icon:'sliders-horizontal'}),
    fields:[
      {key:'name',label:'名称',placeholder:'例如：工作笔记'},
      {key:'mode',label:'筛选方式',type:'select',options:{'白名单':'仅搜索所选路径','黑名单':'排除所选路径'}},
      {key:'excludeFolders',label:'路径',type:'paths'},
      {key:'icon',label:'图标',type:'icon',placeholder:'例如：folder、book-open'}
    ]
  },
  excludePaths:{singular:'路径',strings:true,placeholder:'例如：Projects/Archive（仓库内路径）',create:()=>''}
};
export const INDEX_FIELDS = [
  {key:'enabled',label:'启用搜索索引',description:'在后台建立索引，减少逐次扫描文件。',default:true},
  {key:'content',label:'索引笔记正文',description:'将 Markdown 正文纳入全文索引。',default:true},
  {key:'bigrams',label:'中文双字索引',description:'改善中文和其他 CJK 文字的搜索召回。',default:true},
  {key:'debug',label:'索引调试日志',description:'排查索引问题时开启。',default:false}
];
export function booleanFields(key,value) {
  if(key==='searchIndex')return INDEX_FIELDS;
  return [...new Set([...COLLAPSIBLE_GROUPS,...Object.keys(value)])].map(name=>({key:name,label:name,description:'开启后默认展开这个结果分组。',default:DEFAULT_EXPANDED_GROUPS.has(name)}));
}
// Stable row identities preserve default selections through edits.
// 稳定行标识保留重命名或删除前后的默认选择对应关系。
export class CollectionDraft {
  constructor(key,value) {this.key=key;this.spec=MODEL_SPECS[key];this.reset(value);}
  reset(value) {this.rows=structuredClone(value).map(item=>({original:structuredClone(item),value:item}));}
  add() {const row={original:null,value:this.spec.create()};this.rows.push(row);return row;}
  remove(row) {this.rows=this.rows.filter(item=>item!==row);}
  collect() {
    const value=this.rows.map(({value})=>{
      if(this.spec.strings)return value.trim();
      const clone=structuredClone(value);
      for(const field of this.spec.fields.flatMap(field=>field.fields||[field]))if(typeof clone[field.key]==='string')clone[field.key]=clone[field.key].trim();
      if(clone.excludeFolders)clone.excludeFolders=clone.excludeFolders.map(path=>path.trim());
      return clone;
    });
    if(this.spec.strings) {
      if(value.some(item=>!item))throw new Error('请填写每行内容，或删除空行。');
      if(new Set(value).size!==value.length)throw new Error('列表中有重复条目，请合并或删除。');
    }
    if(this.key==='searchPresets') {
      if(new Set(value.map(item=>item.name)).size!==value.length)throw new Error('预设名称不能重复。');
      if(value.some(item=>item.excludeFolders.some(path=>!path.trim())))throw new Error('预设路径不能为空，请填写路径或删除空行。');
      if(value.some(item=>item.mode==='白名单'&&!item.excludeFolders.length))throw new Error('仅搜索所选路径的预设，需要至少添加一个路径。');
    }
    if(this.key==='engines')value.forEach((item,index)=>{
      if(!item.name)throw new Error(`第 ${index+1} 个引擎：请填写名称。`);
      if(!item.url.includes('{q}'))throw new Error(`第 ${index+1} 个引擎：搜索网址需包含 {q}，用它表示输入的关键词。`);
    });
    if(this.key==='webSources')value.forEach((item,index)=>{
      if(!item.label)throw new Error(`第 ${index+1} 个信息源：请填写名称。`);
      if(!item.domain||item.domain.includes('://'))throw new Error(`第 ${index+1} 个信息源：填写域名（例如 github.com），不要包含 https://。`);
    });
    return validateSetting(this.key,value);
  }
  changes(settings) {
    const value=this.collect();const changes={[this.key]:value};
    if(this.key==='searchPresets'&&settings.defaultPreset) {
      const index=this.rows.findIndex(row=>row.original?.name===settings.defaultPreset);
      changes.defaultPreset=index<0?'':value[index].name;
    }
    if(this.key==='engines'&&settings.activeEngineId) {
      const index=this.rows.findIndex(row=>row.original?.id===settings.activeEngineId);
      changes.activeEngineId=index<0?null:value[index].id;
    }
    return changes;
  }
}
