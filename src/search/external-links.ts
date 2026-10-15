/** MetadataCache omits external links. Scan URLs without treating code examples as links. */
export function externalLinks(markdown:string):string[] {
  let fence:{character:string;length:number}|null=null;
  const lines=markdown.replace(/<!--[\s\S]*?-->/g,'').split(/\r?\n/).filter(line=>{
    const marker=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if(fence) {
      if(marker&&marker[1][0]===fence.character&&marker[1].length>=fence.length&&!marker[2].trim())fence=null;
      return false;
    }
    if(marker) {fence={character:marker[1][0],length:marker[1].length};return false;}
    return true;
  }).join('\n').replace(/(`+)[\s\S]*?\1/g,'');
  const urls=new Set<string>();
  for(const match of lines.matchAll(/https?:\/\/[^\s<>"`]+/gi)) {
    let url=match[0].replace(/\\([()[\]])/g,'$1').replace(/[.,;:!?'，。；：！？]+$/g,'');
    while(/[)\]}]$/.test(url)) {
      const close=url.at(-1),open={')':'(',']':'[','}':'{'}[close];
      if(url.split(close).length<=url.split(open).length)break;
      url=url.slice(0,-1);
    }
    try {if(new URL(url).hostname)urls.add(url);}catch { /* Ignore incomplete URL text. */ }
  }
  return [...urls];
}
