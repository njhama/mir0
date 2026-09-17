// Arrows are attached to entities, so translating a selected arrow moves its endpoints.
export function movementIds(selected: string[], arrows: {id:string;from:{noteId:string};to:{noteId:string}}[]) {
  const ids = new Set(selected);
  for (const arrow of arrows) if (ids.has(arrow.id)) { ids.add(arrow.from.noteId); ids.add(arrow.to.noteId); }
  return [...ids];
}
export function moveEntities<T extends {id:string;x:number;y:number}>(entities:T[], ids:string[], dx:number, dy:number):T[] {
  const selected = new Set(ids);
  return entities.map(entity => selected.has(entity.id) ? {...entity,x:entity.x+dx,y:entity.y+dy} : entity);
}
