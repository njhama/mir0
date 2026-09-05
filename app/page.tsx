'use client';
/* The canvas is a custom keyboard-operated application surface. */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import { useEffect, useRef, useState } from 'react';
import { Hand, Minus, Plus, LocateFixed, Grid2X2, MoveUpRight } from 'lucide-react';
type Camera = { x: number; y: number; zoom: number };
const clamp = (n: number) => Math.max(.1, Math.min(4, n));
export default function Whiteboard() {
  const surface = useRef<HTMLDivElement>(null);
  const camera = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const [view, setView] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [grid, setGrid] = useState(true);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  function apply(next: Camera) { camera.current = next; setView(next); }
  function zoomAt(factor: number, x: number, y: number) {
    const c = camera.current, zoom = clamp(c.zoom * factor), ratio = zoom / c.zoom;
    apply({ x: x - (x - c.x) * ratio, y: y - (y - c.y) * ratio, zoom });
  }
  function reset() {
    const el = surface.current;
    if (el) apply({ x: el.clientWidth / 2, y: el.clientHeight / 2, zoom: 1 });
  }
  function zoomCenter(factor: number) {
    const el = surface.current;
    if (el) zoomAt(factor, el.clientWidth / 2, el.clientHeight / 2);
  }
  useEffect(() => {
    const el = surface.current!;
    reset();
    function wheel(e: WheelEvent) {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * unit * .008), e.clientX - rect.left, e.clientY - rect.top);
      } else {
        const c = camera.current;
        apply({ ...c, x: c.x - (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit, y: c.y - (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * unit });
      }
    }
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);
  function release(id: number) { pointers.current.delete(id); setDragging(pointers.current.size > 0); }
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: object, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(context.registerTool({
        name: 'reset_whiteboard_view', description: 'Return the whiteboard to its origin at 100 percent zoom.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input: unknown) {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
          reset();
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          return { ...camera.current };
        },
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* Optional browser capability. */ }
    return () => lifecycle.abort();
  }, []);
  return <main className="workspace">
    <div ref={surface} role="application" className={'board' + (dragging ? ' dragging' : '')} tabIndex={0} aria-label="Whiteboard. Drag or scroll to pan. Control plus scroll to zoom. Arrow keys pan, plus and minus zoom, zero resets."
      style={grid ? { backgroundImage: 'radial-gradient(circle, #c9ccd3 1px, transparent 1px)', backgroundSize: (24 * view.zoom * (view.zoom < .4 ? 4 : 1)) + 'px ' + (24 * view.zoom * (view.zoom < .4 ? 4 : 1)) + 'px', backgroundPosition: view.x + 'px ' + view.y + 'px' } : {}}
      onKeyDown={e => {
        if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0',' '].includes(e.key)) e.preventDefault();
        const c = camera.current, step = e.shiftKey ? 160 : 60;
        if (e.key === 'ArrowLeft') apply({ ...c, x: c.x + step });
        if (e.key === 'ArrowRight') apply({ ...c, x: c.x - step });
        if (e.key === 'ArrowUp') apply({ ...c, y: c.y + step });
        if (e.key === 'ArrowDown') apply({ ...c, y: c.y - step });
        if (e.key === '+' || e.key === '=') zoomCenter(1.2);
        if (e.key === '-') zoomCenter(1 / 1.2);
        if (e.key === '0') reset();
      }}
      onPointerDown={e => {
        if (e.button !== 0 && e.button !== 1) return;
        e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); setDragging(true);
      }}
      onPointerMove={e => {
        const points = pointers.current, before = points.get(e.pointerId);
        if (!before) return;
        const old = [...points.values()];
        points.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const next = [...points.values()], c = camera.current;
        if (points.size === 2) {
          const rect = e.currentTarget.getBoundingClientRect();
          const center = (p: typeof old) => ({ x: (p[0].x + p[1].x) / 2 - rect.left, y: (p[0].y + p[1].y) / 2 - rect.top });
          const distance = (p: typeof old) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
          const a = center(old), b = center(next), zoom = clamp(c.zoom * distance(next) / Math.max(1, distance(old))), ratio = zoom / c.zoom;
          apply({ x: b.x - (a.x - c.x) * ratio, y: b.y - (a.y - c.y) * ratio, zoom });
        } else if (points.size === 1) apply({ ...c, x: c.x + e.clientX - before.x, y: c.y + e.clientY - before.y });
      }}
      onPointerUp={e => release(e.pointerId)} onPointerCancel={e => release(e.pointerId)} onLostPointerCapture={e => release(e.pointerId)}>
      <div className="world" style={{ transform: 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.zoom + ')' }}>
        <div className="origin"><span /><span /></div><div className="canvas-label">0, 0</div>
      </div>
    </div>
    <header className="panel title-panel"><div className="brand"><MoveUpRight size={23} strokeWidth={2.8} /></div><h1>Untitled board</h1><span className="badge">Whiteboard</span></header>
    <div className="panel tools" aria-label="Canvas tools"><span className="active-tool" title="Drag to pan"><Hand size={21} /><span>Pan</span></span><div className="divider" /><button aria-label="Toggle dot grid" aria-pressed={grid} title="Toggle dot grid" onClick={() => setGrid(!grid)}><Grid2X2 size={20} /></button></div>
    <div className="hint"><span>Drag to pan</span><i /><span>Scroll to move</span><i /><span>Ctrl + scroll to zoom</span></div>
    <div className="panel zoom-controls" aria-label="Zoom controls"><button aria-label="Zoom out" disabled={view.zoom <= .1} onClick={() => zoomCenter(1 / 1.2)}><Minus size={18} /></button><button className="zoom-value" title="Reset zoom to 100%" onClick={() => zoomCenter(1 / camera.current.zoom)}>{Math.round(view.zoom * 100)}%</button><button aria-label="Zoom in" disabled={view.zoom >= 4} onClick={() => zoomCenter(1.2)}><Plus size={18} /></button><div className="divider" /><button aria-label="Return to origin" title="Return to origin (0)" onClick={reset}><LocateFixed size={19} /></button></div>
  </main>;
}
