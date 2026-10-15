export interface ViewportBounds {left:number;top:number;width:number;height:number}
export interface AnchorBounds {left:number;top:number;bottom:number;width:number}
export function viewportBounds(win:Window):ViewportBounds {
  const visual=win.visualViewport;
  return {left:visual?.offsetLeft||0,top:visual?.offsetTop||0,width:visual?.width||win.innerWidth,height:visual?.height||win.innerHeight};
}
/** All sizes use the anchor document's CSS pixels, including zoom/keyboard viewport offsets. */
export function floatingGeometry(anchor:AnchorBounds,viewport:ViewportBounds,desiredWidth:number,naturalHeight:number,limit=480) {
  const margin=Math.min(8,viewport.width/4,viewport.height/4),gap=6;
  const leftEdge=viewport.left+margin,rightEdge=viewport.left+viewport.width-margin;
  const topEdge=viewport.top+margin,bottomEdge=viewport.top+viewport.height-margin;
  const width=Math.max(0,Math.min(desiredWidth,rightEdge-leftEdge));
  const left=Math.max(leftEdge,Math.min(anchor.left,rightEdge-width));
  const below=Math.max(0,bottomEdge-Math.max(topEdge,anchor.bottom+gap));
  const above=Math.max(0,Math.min(bottomEdge,anchor.top-gap)-topEdge);
  const upwards=below<Math.min(160,naturalHeight)&&above>below;
  const budget=Math.max(0,Math.min(limit,upwards?above:below));
  const height=Math.min(Math.max(0,naturalHeight),budget);
  const maxHeight=upwards?height:budget;
  const top=upwards?Math.max(topEdge,Math.min(bottomEdge,anchor.top-gap)-height):Math.min(bottomEdge,Math.max(topEdge,anchor.bottom+gap));
  return {left,top,width,maxHeight,upwards};
}
export function positionFloatingElement(el:HTMLElement,anchor:AnchorBounds,desiredWidth:number,naturalHeight:number,limit=480) {
  const geometry=floatingGeometry(anchor,viewportBounds(el.ownerDocument.defaultView),desiredWidth,naturalHeight,limit);
  el.setCssStyles({left:geometry.left+'px',top:geometry.top+'px',width:geometry.width+'px',maxHeight:geometry.maxHeight+'px',minWidth:'0',boxSizing:'border-box'});
  return geometry;
}
