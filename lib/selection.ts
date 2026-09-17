export type SelectionRect = { x:number; y:number; width:number; height:number };
export function overlapsRect(a:SelectionRect,b:SelectionRect) {
  return a.x <= b.x+b.width && a.x+a.width >= b.x && a.y <= b.y+b.height && a.y+a.height >= b.y;
}
// An empty area inside a large frame must not select the surrounding frame.
export function touchesEntityBorder(area:SelectionRect,entity:SelectionRect) {
  return overlapsRect(area,{...entity,height:0}) ||
    overlapsRect(area,{...entity,y:entity.y+entity.height,height:0}) ||
    overlapsRect(area,{...entity,width:0}) ||
    overlapsRect(area,{...entity,x:entity.x+entity.width,width:0});
}
export function clickSelection(current:string[], id:string, additive:boolean) {
  return current.includes(id) ? current : additive ? [...current,id] : [id];
}
