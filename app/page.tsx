'use client';
/* Local clipboard data URLs must render directly without an image optimization server. */
/* oxlint-disable next/no-img-element */
/* The canvas is a custom keyboard-operated application surface. SVG arrow paths use button roles because HTML buttons cannot represent their hit areas. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import { useEffect, useRef, useState } from 'react';
import { Hand, Minus, Plus, LocateFixed, Grid2X2, MoveUpRight, SquarePlus, SquareDashed, Shapes, X, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical } from 'lucide-react';
import { resizeHandles, resizeBounds, type ResizeHandle } from '@/lib/resize-outline';
import { DiagramIcon } from '@/components/diagram-icon';
import { iconCatalog } from '@/lib/icon-catalog';
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle } from '@/components/ui/popover';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { anchor, connectionPath, sides, type Side } from '@/lib/connections';
import { copyEntities, parseEntities, duplicateEntities } from '@/lib/entities';
import { loadLocalBoard, saveLocalBoard, readClipboardImage, recoveredBoard, loadPreviousBoard } from '@/lib/local-board';
type Camera = { x: number; y: number; zoom: number };
type TextBox = { id: string; x: number; y: number; text: string; color: string; fontSize: number; bold: boolean; outline?: boolean; borderStyle?: 'solid' | 'dashed' | 'dotted'; icon?: string; iconLabel?: string; textAlign?: 'left' | 'center' | 'right'; verticalAlign?: 'top' | 'middle' | 'bottom'; image?: string; width?: number; height?: number };
type Endpoint = { noteId: string; side: Side };
type Connection = { id: string; from: Endpoint; to: Endpoint };
const colors = [{ name: 'Yellow', value: '#fff0a3' }, { name: 'Pink', value: '#ffd5e5' }, { name: 'Blue', value: '#cde9ff' }, { name: 'Green', value: '#d9f1c2' }, { name: 'Purple', value: '#e5d8ff' }];
const clamp = (n: number) => Math.max(.1, Math.min(4, n));
export default function Whiteboard() {
  const surface = useRef<HTMLDivElement>(null);
  const camera = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const [view, setView] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [iconsOpen, setIconsOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState('');
  const [iconCategory, setIconCategory] = useState('All');
  const filteredIcons = iconCatalog.filter(item => (iconCategory === 'All' || item.category === iconCategory) && (item.label + ' ' + item.category + ' ' + item.id).toLowerCase().includes(iconQuery.trim().toLowerCase()));
  const resizeOutline = useRef<{ id: string; pointer: number; x: number; y: number; width: number; height: number; originX: number; originY: number; handle: ResizeHandle } | null>(null);
  const [grid, setGrid] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionDrag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [boxes, setBoxes] = useState<TextBox[]>([]);
  const [selectedId, selectOne] = useState<string | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const pasteSequence = useRef({ text: '', count: 0 });
  function setSelectedId(id: string | null) { selectOne(id); setSelectedEntities(id ? [id] : []); }
  const [editingId, setEditingId] = useState<string | null>(null);
  const noteGesture = useRef<{ id: string; pointerId: number; startX: number; startY: number; x: number; y: number; moved: boolean; wasSelected: boolean } | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageEnabled, setStorageEnabled] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Opening local board…');
  const [imageError, setImageError] = useState('');
  const saveQueue = useRef(Promise.resolve());
  const saveGeneration = useRef(0);
  const skipInitialSave = useRef(true);
  const [retrySave, setRetrySave] = useState(0);
  const unsaved = useRef(false);
  const importFile = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let cancelled = false;
    loadLocalBoard().then(board => {
      if (cancelled) return;
      if (board) {
        const valid = parseEntities(JSON.stringify(board));
        if (!valid) throw new Error('Stored board could not be read.');
        setBoxes(valid.notes); setConnections(valid.arrows);
      }
      skipInitialSave.current = !recoveredBoard; setStorageEnabled(true); setLoaded(true);
      if (recoveredBoard) setImageError('Recovered your board from an intact autosave snapshot.');
    }).catch(() => { if (!cancelled) { setLoaded(true); setSaveStatus('Saving unavailable — export a backup before closing'); } });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!storageEnabled) return;
    if (skipInitialSave.current) { skipInitialSave.current = false; queueMicrotask(() => setSaveStatus('Saved on this device')); return; }
    const generation = ++saveGeneration.current;
    unsaved.current = true;
    queueMicrotask(() => { if (generation === saveGeneration.current) setSaveStatus('Saving locally…'); });
    saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
      if (generation !== saveGeneration.current) return;
      await saveLocalBoard({ format: 'whiteboard-entities', version: 1, notes: boxes, arrows: connections });
      if (generation === saveGeneration.current) { unsaved.current = false; setSaveStatus('Saved locally · ' + new Date().toLocaleTimeString()); }
    }).catch(error => { setSaveStatus(error instanceof Error ? error.message : 'Save failed — export a backup'); });
  }, [boxes, connections, storageEnabled, retrySave]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (unsaved.current) { event.preventDefault(); } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  function exportBackup() {
    const blob = new Blob([JSON.stringify({ format: 'whiteboard-entities', version: 1, notes: boxes, arrows: connections })], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'whiteboard-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  const [connecting, setConnecting] = useState<Endpoint | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const connectionDrag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  function connect(from: Endpoint, to: Endpoint) {
    if (from.noteId !== to.noteId) setConnections(current => current.some(item => item.from.noteId === from.noteId && item.from.side === from.side && item.to.noteId === to.noteId && item.to.side === to.side) ? current : [...current, { id: crypto.randomUUID(), from, to }]);
    setConnecting(null); setCursor(null);
  }
  function updateNote(id: string, changes: Partial<TextBox>) { setBoxes(current => current.map(note => note.id === id ? { ...note, ...changes } : note)); }
  const pendingFocus = useRef<string | null>(null);
  function addBox() {
    const el = surface.current;
    if (!el) return;
    const c = camera.current;
    const id = crypto.randomUUID();
    setEditingId(null);
    setSelectedId(id);
    setBoxes(current => [...current, { id, x: (el.clientWidth / 2 - c.x) / c.zoom - 120, y: (el.clientHeight / 2 - c.y) / c.zoom - 130, text: '', color: colors[0].value, fontSize: 18, bold: false }]);
  }
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
      if (selectionDrag.current) return;
      const rect = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * unit * (e.ctrlKey ? .008 : .002)), e.clientX - rect.left, e.clientY - rect.top);
    }
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);
  function release(id: number) {
    pointers.current.delete(id); setDragging(pointers.current.size > 0);
    if (selectionDrag.current?.pointerId === id) { selectionDrag.current = null; setMarquee(null); }
  }
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
  const selected = boxes.find(note => note.id === selectedId);
  const sourceNote = connecting ? boxes.find(note => note.id === connecting.noteId) : null;
  return <main className="workspace" onCopy={e => {
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
    if (!selectedEntities.length) return;
    const data = copyEntities(boxes, connections, selectedEntities);
    if (!data.notes.length) return;
    e.preventDefault(); e.clipboardData.setData('text/plain', JSON.stringify(data));
    pasteSequence.current = { text: '', count: 0 };
  }} onPaste={e => {
    if (!loaded) { e.preventDefault(); return; }
    const files = Array.from(e.clipboardData.items).filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file);
    if (files.length) {
      e.preventDefault(); setImageError('');
      const el = surface.current!, c = camera.current;
      const x = (el.clientWidth / 2 - c.x) / c.zoom - 120, y = (el.clientHeight / 2 - c.y) / c.zoom - 130;
      void Promise.all(files.map(readClipboardImage)).then(images => {
        const entities = images.map(({ image, width, height }, index) => ({ id: crypto.randomUUID(), width, height, x: x + 120 - width / 2 + index * 32, y: y + 130 - height / 2 + index * 32, text: '', color: '#ffffff', fontSize: 18, bold: false, image }));
        setBoxes(current => [...current, ...entities]); setEditingId(null); setSelectedId(entities[0].id); surface.current?.focus();
      }).catch(error => setImageError(error instanceof Error ? error.message : 'Could not paste image.'));
      return;
    }
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
    const text = e.clipboardData.getData('text/plain'), data = parseEntities(text);
    if (!data || !data.notes.length) return;
    e.preventDefault();
    const count = pasteSequence.current.text === text ? pasteSequence.current.count + 1 : 1;
    pasteSequence.current = { text, count };
    const pasted = duplicateEntities(data, 32 * count);
    setBoxes(current => [...current, ...pasted.notes]); setConnections(current => [...current, ...pasted.arrows]);
    setEditingId(null); selectOne(pasted.notes.length === 1 ? pasted.notes[0].id : null);
    setSelectedEntities([...pasted.notes.map(note => note.id), ...pasted.arrows.map(arrow => arrow.id)]);
  }} onKeyDown={e => {
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); selectOne(null); setSelectedEntities([...boxes.map(note => note.id), ...connections.map(arrow => arrow.id)]); }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); setBoxes(current => current.filter(note => !selectedEntities.includes(note.id))); setConnections(current => current.filter(arrow => !selectedEntities.includes(arrow.id) && !selectedEntities.includes(arrow.from.noteId) && !selectedEntities.includes(arrow.to.noteId))); setSelectedId(null); }
    if (e.key === 'Escape') { selectionDrag.current = null; setMarquee(null); setSelectedId(null); setConnecting(null); setCursor(null); }
  }}>
    <div ref={surface} role="application" className={'board' + (dragging ? ' dragging' : '')} tabIndex={0} aria-label="Whiteboard. Right drag to pan. Scroll to zoom. Left drag on empty canvas to box select. Arrow keys pan, plus and minus zoom, zero resets."
      onContextMenu={e => e.preventDefault()}
      onPointerDownCapture={e => {
        if (e.button !== 2 && e.button !== 1) return;
        e.preventDefault(); e.stopPropagation();
        selectionDrag.current = null; setMarquee(null); setConnecting(null); setCursor(null);
        e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); setDragging(true);
      }}
      style={grid ? { backgroundImage: 'radial-gradient(circle, #c9ccd3 1px, transparent 1px)', backgroundSize: (24 * view.zoom * (view.zoom < .4 ? 4 : 1)) + 'px ' + (24 * view.zoom * (view.zoom < .4 ? 4 : 1)) + 'px', backgroundPosition: view.x + 'px ' + view.y + 'px' } : {}}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
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
        if (e.button !== 0) return;
        setConnecting(null); setCursor(null);
        setSelectedId(null); e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId);
        if (e.pointerType === 'touch') { pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); setDragging(true); return; }
        const rect = e.currentTarget.getBoundingClientRect(), c = camera.current;
        const x = (e.clientX - rect.left - c.x) / c.zoom, y = (e.clientY - rect.top - c.y) / c.zoom;
        selectionDrag.current = { pointerId: e.pointerId, x, y };
        setMarquee({ x, y, width: 0, height: 0 });
      }}
      onPointerMove={e => {
        const selection = selectionDrag.current;
        if (selection?.pointerId === e.pointerId) {
          const bounds = e.currentTarget.getBoundingClientRect(), c = camera.current;
          const x = (e.clientX - bounds.left - c.x) / c.zoom, y = (e.clientY - bounds.top - c.y) / c.zoom;
          const area = { x: Math.min(x, selection.x), y: Math.min(y, selection.y), width: Math.abs(x - selection.x), height: Math.abs(y - selection.y) };
          setMarquee(area);
          if (Math.hypot(area.width, area.height) * c.zoom < 4) return;
          const overlaps = (r: { x: number; y: number; width: number; height: number }) => r.x <= area.x + area.width && r.x + r.width >= area.x && r.y <= area.y + area.height && r.y + r.height >= area.y;
          const ids = boxes.filter(box => overlaps({ x: box.x, y: box.y, width: box.width ?? 240, height: box.height ?? 260 })).map(box => box.id);
          for (const path of e.currentTarget.querySelectorAll<SVGPathElement>('.connection-hit')) {
            const length = path.getTotalLength();
            for (let i = 0; i <= 64; i++) {
              const point = path.getPointAtLength(length * i / 64);
              if (overlaps({ x: point.x, y: point.y, width: 0, height: 0 })) { if (path.dataset.entityId) ids.push(path.dataset.entityId); break; }
            }
          }
          selectOne(null); setSelectedEntities(ids); return;
        }
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
        {marquee && <div className="selection-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}
        <svg className="connections" aria-label="Connections between notes">
          <defs><marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#586581" /></marker></defs>
          {connections.map(connection => {
            const from = boxes.find(note => note.id === connection.from.noteId), to = boxes.find(note => note.id === connection.to.noteId);
            if (!from || !to) return null;
            const path = connectionPath(anchor(from, connection.from.side), connection.from.side, anchor(to, connection.to.side), connection.to.side);
            return <g key={connection.id}><path d={path} className={selectedEntities.includes(connection.id) ? "connection-line selected-arrow" : "connection-line"} markerEnd="url(#arrowhead)" /><path d={path} className="connection-hit" data-entity-id={connection.id} role="button" tabIndex={0} aria-label="Select arrow" onPointerDown={e => e.stopPropagation()} onClick={() => setSelectedId(connection.id)} onKeyDown={e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); setSelectedId(connection.id); } }}><title>Click to select arrow; Delete to remove</title></path></g>;
          })}
          {connecting && sourceNote && cursor && <path d={connectionPath(anchor(sourceNote, connecting.side), connecting.side, cursor, 'left')} className="connection-line connection-preview" markerEnd="url(#arrowhead)" />}
        </svg>
        <div className="origin"><span /><span /></div><div className="canvas-label">0, 0</div>
        {[...boxes].sort((a, b) => Number(!!b.outline) - Number(!!a.outline)).map((box, index) => <section key={box.id} className={'text-box sticky-note' + (box.image || box.icon || box.outline ? ' image-entity' : '') + (box.outline ? ' outline-entity' : '') + (selectedEntities.includes(box.id) ? ' selected' : '') + (connecting ? ' connection-target' : '')} aria-label={(box.image ? 'Image ' : 'Sticky note ') + (index + 1)} style={{ left: box.x, top: box.y, background: box.image || box.icon || box.outline ? undefined : box.color, width: box.image || box.icon || box.outline ? box.width : undefined, height: box.image || box.icon || box.outline ? box.height : undefined }} onPointerDown={e => { e.stopPropagation(); setSelectedId(box.id); }} onFocus={() => setSelectedId(box.id)}>
          {sides.map(side => <button key={side} className={'connection-dot dot-' + side + (connecting?.noteId === box.id && connecting.side === side ? ' connecting' : '')} data-note-id={box.id} data-side={side} aria-label={'Connect ' + side + ' of note ' + (index + 1)} title="Drag to another dot, or click two dots to connect" onPointerDown={e => {
            if (e.button !== 0) return;
            e.stopPropagation();
            if (connecting) { connect(connecting, { noteId: box.id, side }); return; }
            setConnecting({ noteId: box.id, side }); setCursor(anchor(box, side));
            connectionDrag.current = { x: e.clientX, y: e.clientY, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }} onPointerMove={e => {
            const drag = connectionDrag.current;
            if (!drag) return;
            drag.moved ||= Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4;
            const rect = surface.current!.getBoundingClientRect(), c = camera.current;
            setCursor({ x: (e.clientX - rect.left - c.x) / c.zoom, y: (e.clientY - rect.top - c.y) / c.zoom });
          }} onPointerUp={e => {
            const drag = connectionDrag.current;
            connectionDrag.current = null;
            if (!drag?.moved) return;
            const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLButtonElement>('[data-note-id][data-side]');
            if (target && sides.includes(target.dataset.side as Side)) connect({ noteId: box.id, side }, { noteId: target.dataset.noteId!, side: target.dataset.side as Side });
            else { setConnecting(null); setCursor(null); }
          }} onPointerCancel={() => { connectionDrag.current = null; setConnecting(null); setCursor(null); }} onLostPointerCapture={() => { connectionDrag.current = null; }} onClick={e => {
            if (e.detail !== 0) return;
            if (connecting) connect(connecting, { noteId: box.id, side });
            else { setConnecting({ noteId: box.id, side }); setCursor(anchor(box, side)); }
          }} />)}
          <div className="box-header">

            <button className="box-delete" aria-label="Delete entity" title="Delete entity" onClick={() => { setBoxes(current => current.filter(item => item.id !== box.id)); setConnections(current => current.filter(item => item.from.noteId !== box.id && item.to.noteId !== box.id)); if (connecting?.noteId === box.id) { setConnecting(null); setCursor(null); } }}><X size={15} /></button>
          </div>
          {!box.image && !box.icon && !box.outline && editingId === box.id && selectedId === box.id ? <Textarea onBlur={() => setEditingId(null)} ref={el => { if (el) { el.style.height = '0px'; el.style.paddingTop = '18px'; const contentHeight = el.scrollHeight - 36; el.style.height = '260px'; const extra = Math.max(0, 224 - contentHeight); el.style.paddingTop = (18 + (box.verticalAlign === 'middle' ? extra / 2 : box.verticalAlign === 'bottom' ? extra : 0)) + 'px'; } if (el && pendingFocus.current === box.id) { pendingFocus.current = null; el.focus({ preventScroll: true }); } }} aria-label={'Text in note ' + (index + 1)} className="box-text" style={{ fontSize: box.fontSize, fontWeight: box.bold ? 700 : 400, textAlign: box.textAlign ?? 'left', justifyContent: box.image ? undefined : box.verticalAlign === 'middle' ? 'safe center' : box.verticalAlign === 'bottom' ? 'safe flex-end' : 'flex-start' }} placeholder="Write an idea…" value={box.text} onChange={e => {
            const text = e.target.value;
            setBoxes(current => current.map(item => item.id === box.id ? { ...item, text } : item));
          }} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { setEditingId(null); setConnecting(null); setCursor(null); surface.current?.focus(); } }} /> : <button className="box-text note-body" aria-label={'Note ' + (index + 1) + '. Click to select, drag to move, click again to edit.'} style={{ fontSize: box.fontSize, fontWeight: box.bold ? 700 : 400, textAlign: box.textAlign ?? 'left', justifyContent: box.image ? undefined : box.verticalAlign === 'middle' ? 'safe center' : box.verticalAlign === 'bottom' ? 'safe flex-end' : 'flex-start' }} onPointerDown={e => {
            if (e.button !== 0) return;
            e.preventDefault(); e.stopPropagation();
            noteGesture.current = { id: box.id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false, wasSelected: selectedId === box.id };
            setEditingId(null); setSelectedId(box.id);
            e.currentTarget.focus({ preventScroll: true }); e.currentTarget.setPointerCapture(e.pointerId);
          }} onPointerMove={e => {
            const drag = noteGesture.current;
            if (!drag || drag.id !== box.id || drag.pointerId !== e.pointerId) return;
            if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
            drag.moved = true;
            const dx = (e.clientX - drag.x) / camera.current.zoom, dy = (e.clientY - drag.y) / camera.current.zoom;
            drag.x = e.clientX; drag.y = e.clientY;
            setBoxes(current => current.map(note => note.id === box.id ? { ...note, x: note.x + dx, y: note.y + dy } : note));
          }} onPointerUp={e => {
            const drag = noteGesture.current;
            if (!drag || drag.pointerId !== e.pointerId) return;
            noteGesture.current = null;
            if (!box.image && !box.icon && !box.outline && !drag.moved && drag.wasSelected) { pendingFocus.current = box.id; setEditingId(box.id); }
          }} onPointerCancel={() => { noteGesture.current = null; }} onLostPointerCapture={() => { noteGesture.current = null; }} onClick={e => {
            if (e.detail !== 0) return;
            if (!box.image && !box.icon && !box.outline && selectedId === box.id) { pendingFocus.current = box.id; setEditingId(box.id); }
            else setSelectedId(box.id);
          }}>{box.outline ? <><span className="outline-border" style={{ borderStyle: box.borderStyle ?? 'dashed', borderColor: box.color }} />{['top','right','bottom','left'].map(side => <span key={side} className={'outline-edge outline-edge-' + side} />)}<span className="outline-label" style={{ color: box.color }}>{box.iconLabel ?? 'Group'}</span></> : box.icon ? <DiagramIcon id={box.icon} label={box.iconLabel} /> : box.image ? <img src={box.image} alt="Clipboard content" draggable={false} onLoad={e => { if (!box.width || !box.height) updateNote(box.id, { width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight }); }} /> : <span className="note-content">{box.text || <span className="note-placeholder">Write an idea…</span>}</span>}</button>}

          {box.outline && selectedEntities.includes(box.id) && resizeHandles.map(handle => <button key={handle} className={'outline-resize resize-' + handle} aria-label={'Resize outline ' + handle} title="Drag to resize" onPointerDown={e => {
            if(e.button !== 0) return; e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
            resizeOutline.current = { id: box.id, pointer: e.pointerId, x: e.clientX, y: e.clientY, originX: box.x, originY: box.y, width: box.width ?? 520, height: box.height ?? 360, handle };
          }} onPointerMove={e => {
            const r=resizeOutline.current; if(!r || r.pointer !== e.pointerId) return;
            updateNote(r.id, resizeBounds({x:r.originX,y:r.originY,width:r.width,height:r.height},r.handle,(e.clientX-r.x)/camera.current.zoom,(e.clientY-r.y)/camera.current.zoom));
          }} onPointerUp={() => { resizeOutline.current=null; }} onPointerCancel={() => { resizeOutline.current=null; }} onLostPointerCapture={() => { resizeOutline.current=null; }} />)}
        </section>)}
      </div>
    </div>
    {selected?.outline && <div className="outline-toolbar" style={{ left: 'clamp(176px, ' + (view.x + selected.x * view.zoom + (selected.width ?? 520) / 2 * view.zoom) + 'px, calc(100vw - 176px))', top: 'clamp(88px, ' + (view.y + selected.y * view.zoom - 136) + 'px, calc(100dvh - 150px))' }}>
      <label htmlFor="outline-label">Outline label</label><Input id="outline-label" maxLength={500} value={selected.iconLabel ?? 'Group'} onChange={e => updateNote(selected.id, { iconLabel: e.target.value })} />
      <div className="outline-options"><NativeSelect aria-label="Border style" value={selected.borderStyle ?? 'dashed'} onChange={e => updateNote(selected.id, { borderStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}><NativeSelectOption value="solid">Solid</NativeSelectOption><NativeSelectOption value="dashed">Dashed</NativeSelectOption><NativeSelectOption value="dotted">Dotted</NativeSelectOption></NativeSelect><label>Color <input type="color" aria-label="Outline color" value={selected.color} onChange={e => updateNote(selected.id, { color: e.target.value })} /></label></div>
      <p className="resize-hint">Drag a corner or edge handle to resize.</p>
    </div>}
    {selected?.icon && <div className="icon-label-toolbar" style={{ left: 'clamp(160px, ' + (view.x + selected.x * view.zoom + (selected.width ?? 120) / 2 * view.zoom) + 'px, calc(100vw - 160px))', top: 'clamp(88px, ' + (view.y + selected.y * view.zoom - 78) + 'px, calc(100dvh - 88px))' }}><label htmlFor="icon-label">Icon label</label><Input id="icon-label" maxLength={500} value={selected.iconLabel ?? iconCatalog.find(item => item.id === selected.icon)?.label ?? ''} onChange={e => updateNote(selected.id, { iconLabel: e.target.value })} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') surface.current?.focus(); }} /></div>}
    {selected && !selected.image && !selected.icon && !selected.outline && (<div className="note-format floating-format" aria-label="Sticky note formatting" style={{ left: 'clamp(192px, ' + (view.x + selected.x * view.zoom + 120 * view.zoom) + 'px, calc(100vw - 192px))', top: 'clamp(88px, ' + (view.y + selected.y * view.zoom - 106) + 'px, calc(100dvh - 72px))' }}><div className="note-colors" aria-label="Note color">{colors.map(color => <button key={color.name} aria-label={color.name + ' note'} aria-pressed={selected.color === color.value} title={color.name} className="color-swatch" style={{ background: color.value }} onClick={() => updateNote(selected.id, { color: color.value })} />)}</div><div className="text-format"><button aria-label="Decrease text size" disabled={selected.fontSize <= 12} onClick={() => updateNote(selected.id, { fontSize: selected.fontSize - 2 })}>A−</button><span>{selected.fontSize}</span><button aria-label="Increase text size" disabled={selected.fontSize >= 36} onClick={() => updateNote(selected.id, { fontSize: selected.fontSize + 2 })}>A+</button><button aria-label="Bold text" aria-pressed={selected.bold} onClick={() => updateNote(selected.id, { bold: !selected.bold })}><b>B</b></button></div><div className="alignment-format" aria-label="Text alignment">
{([{ value: 'left', Icon: AlignLeft }, { value: 'center', Icon: AlignCenter }, { value: 'right', Icon: AlignRight }] as const).map(({ value, Icon }) => <button key={value} aria-label={'Align text ' + value} title={'Align ' + value} aria-pressed={(selected.textAlign ?? 'left') === value} onClick={() => updateNote(selected.id, { textAlign: value })}><Icon size={18} /></button>)}
<span className="alignment-divider" />
{([{ value: 'top', Icon: AlignStartVertical }, { value: 'middle', Icon: AlignCenterVertical }, { value: 'bottom', Icon: AlignEndVertical }] as const).map(({ value, Icon }) => <button key={value} aria-label={'Align text vertically ' + value} title={'Vertical ' + value} aria-pressed={(selected.verticalAlign ?? 'top') === value} onClick={() => updateNote(selected.id, { verticalAlign: value })}><Icon size={18} /></button>)}
</div></div>)}
    <header className="panel title-panel"><div className="brand"><MoveUpRight size={23} strokeWidth={2.8} /></div><h1>Untitled board</h1><span className="badge">Whiteboard</span></header>
    <div className="save-panel"><output>{saveStatus}</output><div>
      <button disabled={!storageEnabled} onClick={() => setRetrySave(value => value + 1)}>Save now</button><button onClick={exportBackup} disabled={!loaded}>Export backup</button>
      <button onClick={() => importFile.current?.click()} disabled={!loaded}>Import backup</button>
      <button disabled={!storageEnabled} onClick={() => { void saveQueue.current.then(() => loadPreviousBoard()).then(board => { setBoxes(board.notes); setConnections(board.arrows); setSelectedId(null); }).catch(error => setImageError(String(error))); }}>Restore previous</button>
      <button onClick={() => { void navigator.storage?.persist?.().then(granted => setImageError(granted ? 'Persistent storage enabled. Keep exported backups too.' : 'Browser did not grant persistent storage. Keep exported backups.')).catch(() => setImageError('Persistent storage unavailable. Keep exported backups.')); }}>Protect storage</button>
    </div></div>
    <input ref={importFile} type="file" accept="application/json,.json" hidden aria-label="Import board backup" onChange={e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      void file.text().then(text => {
        const board = parseEntities(text); if (!board) throw new Error('This is not a valid board backup.');
        const imported = duplicateEntities(board, 0);
        setBoxes(current => [...current, ...imported.notes]); setConnections(current => [...current, ...imported.arrows]);
        setImageError('Backup imported alongside your existing entities.');
      }).catch(error => setImageError(String(error)));
    }} />
    {imageError && <div className="image-error" role="alert">{imageError}<button aria-label="Dismiss image error" onClick={() => setImageError('')}><X size={16} /></button></div>}
    {!loaded && <div className="board-loading">Opening local board…</div>}
    <div className="panel tools" aria-label="Canvas tools"><span className="active-tool" title="Right-drag to pan"><Hand size={21} /><span>Pan</span></span><button className="add-box" disabled={!loaded} aria-label="Add sticky note" title="Add sticky note" onClick={addBox}><SquarePlus size={21} /><span>Note</span></button><button className="add-box" disabled={!loaded} aria-label="Add labeled outline" title="Add outline" onClick={() => { const el=surface.current!, c=camera.current, id=crypto.randomUUID(); setBoxes(current => [...current,{id,x:(el.clientWidth/2-c.x)/c.zoom-260,y:(el.clientHeight/2-c.y)/c.zoom-180,width:520,height:360,text:'',color:'#64748b',fontSize:18,bold:false,outline:true,borderStyle:'dashed',iconLabel:'Group'}]); setSelectedId(id); setEditingId(null); }}><SquareDashed size={21}/><span>Outline</span></button><Popover open={iconsOpen} onOpenChange={setIconsOpen}><PopoverTrigger className="add-box" aria-label="Add architecture icon" disabled={!loaded}><Shapes size={21} /><span>Icons</span></PopoverTrigger><PopoverContent side="right" align="center" className="icon-picker"><PopoverTitle>Icon library</PopoverTitle><p className="icon-picker-caption">{iconCatalog.length} icons · available offline</p><Input aria-label="Search icons" placeholder="Search S3, database, server…" value={iconQuery} onChange={e => setIconQuery(e.target.value)} /><NativeSelect className="icon-category" aria-label="Icon category" value={iconCategory} onChange={e => setIconCategory(e.target.value)}><NativeSelectOption value="All">All categories</NativeSelectOption>{Array.from(new Set(iconCatalog.map(item => item.category))).sort().map(category => <NativeSelectOption key={category} value={category}>{category}</NativeSelectOption>)}</NativeSelect><span className="icon-picker-caption">{filteredIcons.length} results</span><div className="icon-picker-grid">{filteredIcons.map(item => <button key={item.id} aria-label={'Add ' + item.label} onClick={() => {
const el = surface.current!, c = camera.current, id = crypto.randomUUID();
setBoxes(current => [...current, { id, x: (el.clientWidth / 2 - c.x) / c.zoom - 60, y: (el.clientHeight / 2 - c.y) / c.zoom - 64, width: 120, height: 128, text: '', color: '#ffffff', fontSize: 18, bold: false, icon: item.id }]);
setEditingId(null); setSelectedId(id); setIconsOpen(false); setIconQuery('');
}}><DiagramIcon id={item.id} /></button>)}</div>{filteredIcons.length === 0 && <p>No matching icons.</p>}</PopoverContent></Popover><div className="divider" /><button aria-label="Toggle dot grid" aria-pressed={grid} title="Toggle dot grid" onClick={() => setGrid(!grid)}><Grid2X2 size={20} /></button></div>
    {connecting && <output className="connection-help">Choose a dot on another note · Esc to cancel</output>}
    <div className="hint"><span>Right-drag to pan</span><i /><span>Scroll to zoom</span><i /><span>Left-drag to select</span></div>
    <div className="panel zoom-controls" aria-label="Zoom controls"><button aria-label="Zoom out" disabled={view.zoom <= .1} onClick={() => zoomCenter(1 / 1.2)}><Minus size={18} /></button><button className="zoom-value" title="Reset zoom to 100%" onClick={() => zoomCenter(1 / camera.current.zoom)}>{Math.round(view.zoom * 100)}%</button><button aria-label="Zoom in" disabled={view.zoom >= 4} onClick={() => zoomCenter(1.2)}><Plus size={18} /></button><div className="divider" /><button aria-label="Return to origin" title="Return to origin (0)" onClick={reset}><LocateFixed size={19} /></button></div>
  </main>;
}























