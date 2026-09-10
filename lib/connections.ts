export type Side = 'top' | 'right' | 'bottom' | 'left';
export const sides: Side[] = ['top', 'right', 'bottom', 'left'];
export const NOTE_WIDTH = 240;
export const NOTE_HEIGHT = 260;
export function anchor(note: { x: number; y: number; width?: number; height?: number }, side: Side) {
  const width = note.width ?? NOTE_WIDTH, height = note.height ?? NOTE_HEIGHT;
  return { x: note.x + (side === 'left' ? 0 : side === 'right' ? width : width / 2), y: note.y + (side === 'top' ? 0 : side === 'bottom' ? height : height / 2) };
}
export function connectionPath(a: { x: number; y: number }, from: Side, b: { x: number; y: number }, to: Side) {
  const vectors = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
  const distance = Math.max(48, Math.min(180, Math.hypot(b.x - a.x, b.y - a.y) / 2));
  const p = vectors[from], q = vectors[to];
  return `M ${a.x} ${a.y} C ${a.x + p[0] * distance} ${a.y + p[1] * distance}, ${b.x + q[0] * distance} ${b.y + q[1] * distance}, ${b.x} ${b.y}`;
}
