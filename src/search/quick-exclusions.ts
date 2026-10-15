export interface ExclusionTarget {path:string;rule:string;kind:'file'|'folder';level:number}
export function exclusionTargets(path:string):ExclusionTarget[] {
  const normalized=path.replaceAll('\\','/').replace(/^\/+|\/+$/g,'');
  if(!normalized||normalized.split('/').includes('..'))return [];
  const parts=normalized.split('/');
  const targets:ExclusionTarget[]=[{path:normalized,rule:'path:'+normalized,kind:'file',level:0}];
  for(let depth=parts.length-1;depth>0;depth--) {
    const folder=parts.slice(0,depth).join('/');
    targets.push({path:folder,rule:'path:'+folder,kind:'folder',level:depth});
  }
  return targets;
}
/** Exact toggles preserve explicit descendant choices and never silently alter global rules. */
function canonical(rule:string):string {
  const value=rule.trim();
  if(value.startsWith('path:'))return 'path:'+value.slice(5).replace(/\/+$/,'');
  if(/^(glob|regex|exclude):/.test(value)||/[*?{[]/.test(value))return value;
  return 'path:'+value.replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
}
export function hasExclusion(rules:string[],rule:string):boolean {return rules.some(value=>canonical(value)===canonical(rule));}
export function toggleExclusion(rules:string[],rule:string):string[] {
  return hasExclusion(rules,rule)?rules.filter(value=>canonical(value)!==canonical(rule)):[...rules,rule];
}
