export const resizeHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
export type ResizeHandle = typeof resizeHandles[number];
export function resizeBounds(start: { x: number; y: number; width: number; height: number }, handle: ResizeHandle, dx: number, dy: number) {
  const width = Math.min(100000, Math.max(100, start.width + (handle.includes('w') ? -dx : handle.includes('e') ? dx : 0)));
  const height = Math.min(100000, Math.max(80, start.height + (handle.includes('n') ? -dy : handle.includes('s') ? dy : 0)));
  return { x: start.x + (handle.includes('w') ? start.width - width : 0), y: start.y + (handle.includes('n') ? start.height - height : 0), width, height };
}
