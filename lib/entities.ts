import { sides, type Side } from './connections';
export type NoteEntity = { id: string; x: number; y: number; text: string; color: string; fontSize: number; bold: boolean; outline?: boolean; borderStyle?: 'solid' | 'dashed' | 'dotted'; icon?: string; iconLabel?: string; textAlign?: 'left' | 'center' | 'right'; verticalAlign?: 'top' | 'middle' | 'bottom'; image?: string; width?: number; height?: number };
export type ArrowEntity = { id: string; from: { noteId: string; side: Side }; to: { noteId: string; side: Side } };
export type EntityClipboard = { format: 'whiteboard-entities'; version: 1; notes: NoteEntity[]; arrows: ArrowEntity[] };
export function copyEntities(notes: NoteEntity[], arrows: ArrowEntity[], selection: string[]): EntityClipboard {
  const ids = new Set(selection);
  // Include an explicitly copied arrow's endpoints so it also works in another board.
  for (const arrow of arrows) if (ids.has(arrow.id)) { ids.add(arrow.from.noteId); ids.add(arrow.to.noteId); }
  return { format: 'whiteboard-entities', version: 1, notes: notes.filter(note => ids.has(note.id)), arrows: arrows.filter(arrow => ids.has(arrow.from.noteId) && ids.has(arrow.to.noteId)) };
}
export function parseEntities(text: string): EntityClipboard | null {
  try {
    if (text.length > 80_000_000) return null;
    const data = JSON.parse(text);
    if (data?.format !== 'whiteboard-entities' || data.version !== 1 || !Array.isArray(data.notes) || !Array.isArray(data.arrows) || data.notes.length > 1000 || data.arrows.length > 5000) return null;
    const ids = new Set<string>();
    for (const note of data.notes) {
      if (!note || typeof note.id !== 'string' || ids.has(note.id) || !Number.isFinite(note.x) || !Number.isFinite(note.y) || Math.abs(note.x) > 1e8 || Math.abs(note.y) > 1e8 || typeof note.text !== 'string' || !/^#[0-9a-f]{6}$/i.test(note.color) || !Number.isFinite(note.fontSize) || note.fontSize < 12 || note.fontSize > 36 || typeof note.bold !== 'boolean') return null;
      ids.add(note.id);
      if (note.outline !== undefined && typeof note.outline !== 'boolean') return null;
      if (note.borderStyle !== undefined && !['solid', 'dashed', 'dotted'].includes(note.borderStyle)) return null;
      if (note.iconLabel !== undefined && (typeof note.iconLabel !== 'string' || note.iconLabel.length > 500)) return null;
      if (note.icon !== undefined && (typeof note.icon !== 'string' || !/^[a-z][a-z0-9-]{0,40}$/.test(note.icon))) return null;
      if (note.textAlign !== undefined && !['left', 'center', 'right'].includes(note.textAlign)) return null;
      if (note.verticalAlign !== undefined && !['top', 'middle', 'bottom'].includes(note.verticalAlign)) return null;
      if ([note.width, note.height].some(value => value !== undefined && (!Number.isFinite(value) || value <= 0 || value > 100000))) return null;
      if (note.image !== undefined && (typeof note.image !== 'string' || note.image.length > 15_000_000 || !/^data:image\/(png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/.test(note.image))) return null;
    }
    const arrowIds = new Set<string>();
    for (const arrow of data.arrows) {
      if (!arrow || typeof arrow.id !== 'string' || ids.has(arrow.id) || arrowIds.has(arrow.id) || !ids.has(arrow.from?.noteId) || !ids.has(arrow.to?.noteId) || !sides.includes(arrow.from.side) || !sides.includes(arrow.to.side)) return null;
      arrowIds.add(arrow.id);
    }
    return data;
  } catch { return null; }
}
export function duplicateEntities(data: EntityClipboard, offset: number) {
  const ids = new Map(data.notes.map(note => [note.id, crypto.randomUUID()]));
  return {
    notes: data.notes.map(note => ({ ...note, id: ids.get(note.id)!, x: note.x + offset, y: note.y + offset })),
    arrows: data.arrows.map(arrow => ({ ...arrow, id: crypto.randomUUID(), from: { ...arrow.from, noteId: ids.get(arrow.from.noteId)! }, to: { ...arrow.to, noteId: ids.get(arrow.to.noteId)! } })),
  };
}






