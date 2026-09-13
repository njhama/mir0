'use client';
// Drag targets supplement the keyboard- and touch-accessible status select on every card.
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions */
import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Trash2, X, Circle, CircleDashed, CircleCheck, PauseCircle, CalendarDays } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { changeTodo, loadTodos, taskStatus, dueInfo, isTodayTask, type ChecklistItem, type Todo, type TodoChange, type TodoStatus } from '@/lib/local-todos';

const columns: { status: TodoStatus; label: string; hint: string; icon: typeof Circle }[] = [
  { status: 'todo', label: 'To do', hint: 'Ready for your next task', icon: Circle },
  { status: 'in-progress', label: 'In progress', hint: 'Move a task here when you start', icon: CircleDashed },
  { status: 'blocked', label: 'Waiting / Blocked', hint: 'Waiting on something? Park it here', icon: PauseCircle },
  { status: 'done', label: 'Done', hint: 'Finished tasks land here', icon: CircleCheck },
];

export function TodoList() {
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<TodoStatus>('todo');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [stepDraft, setStepDraft] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);
  const knownTags = [...new Set(['routing', 'infra', 'bug', 'review', ...tasks.flatMap(task => task.tags ?? []), ...tags])].sort();
  function addTag() { const tag = tagDraft.trim().toLowerCase(); if (tag && tags.length < 20 && !tags.includes(tag)) setTags([...tags, tag]); setTagDraft(''); }
  function addStep() { if (stepDraft.trim() && checklist.length < 100) { setChecklist([...checklist, { id: crypto.randomUUID(), title: stepDraft.trim(), completed: false }]); setStepDraft(''); } }
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(timer); }, []);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<TodoStatus | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (!pending.current) loadTodos().then(data => { if (active && !pending.current) { setTasks(data); setReady(true); setError(''); } }).catch(() => { if (active) setError('Could not load tasks. Reload to retry.'); }); };
    const guard = (event: BeforeUnloadEvent) => { if (pending.current) event.preventDefault(); };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('beforeunload', guard);
    return () => { active = false; window.removeEventListener('focus', refresh); window.removeEventListener('beforeunload', guard); };
  }, []);
  async function save(change: TodoChange) {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError('');
    try { setTasks(await changeTodo(change)); return true; }
    catch { setError('Could not save this change. Please try again.'); return false; }
    finally { pending.current = false; setBusy(false); }
  }
  function openDetails(task: Todo) {
    setEditing(task.id); setDraft(task.title); setDescription(task.description ?? ''); setDueDate(task.dueDate ?? ''); setStatus(taskStatus(task)); setPriority(task.priority ?? 'medium'); setTags(task.tags ?? []); setChecklist(task.checklist ?? []); setTagDraft(''); setStepDraft('');
  }
  const remaining = tasks.filter(task => taskStatus(task) !== 'done').length;
  return <main className="todo-page"><section className="todo-container task-board-container">
    <div className="todo-heading"><div><p className="todo-eyebrow">PROJECT / TASKS</p><h1>Task board</h1><p>{remaining} {remaining === 1 ? 'task' : 'tasks'} open · Drag to move. Click to view details.</p></div></div>
    <form className="todo-add" onSubmit={async event => { event.preventDefault(); if (!title.trim()) return; if (await save({ type: 'add', task: { id: crypto.randomUUID(), title, completed: false, status: 'todo', priority: 'medium', dueDate: todayOnly ? [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-') : '', createdAt: Date.now() } })) setTitle(''); }}>
      <Input aria-label="New task" placeholder="What needs to get done?" value={title} onChange={event => setTitle(event.target.value)} maxLength={500} disabled={!ready || busy} />
      <button className="todo-primary" disabled={!ready || busy || !title.trim()}><Plus size={18} />Add task</button>
    </form>
    {error && <p className="todo-error" role="alert">{error}</p>}
    <div className="task-view-filters"><button aria-pressed={!todayOnly} onClick={() => setTodayOnly(false)}>All tasks</button><button aria-pressed={todayOnly} onClick={() => setTodayOnly(true)}><CalendarDays size={14} />Today <span>{tasks.filter(task => isTodayTask(task, now)).length}</span></button>{todayOnly && <span className="task-filter-hint">Due today and overdue · unfinished tasks</span>}</div>
    <div className="task-board">{columns.map(column => {
      const cards = tasks.filter(task => taskStatus(task) === column.status && (!todayOnly || isTodayTask(task, now))).sort((a, b) => b.createdAt - a.createdAt);
      return <section key={column.status} aria-labelledby={`column-${column.status}`} className={`task-column ${column.status}${over === column.status ? ' drop-target' : ''}`}
        onDragOver={event => { if (dragging && !busy) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(column.status); } }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null); }}
        onDrop={event => { event.preventDefault(); const task = tasks.find(item => item.id === dragging); setDragging(null); setOver(null); if (task && !busy && taskStatus(task) !== column.status) void save({ type: 'update', id: task.id, status: column.status }); }}>
        <header className="task-column-heading"><h2 id={`column-${column.status}`}><column.icon className="task-status-icon" size={17} aria-hidden="true" />{column.label}</h2><span>{cards.length}</span></header>
        <ul className="task-cards">{cards.map(task => <li key={task.id} className={`task-card${dragging === task.id ? ' dragging' : ''}`} draggable={!busy && editing !== task.id}
          onDragStart={event => { setDragging(task.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-mir0-task', task.id); }}
          onDragEnd={() => { setDragging(null); setOver(null); }}>
          <button className="task-card-open" disabled={busy} onClick={() => openDetails(task)}><span className="task-card-title">{task.title}</span>{task.description && <span className="task-description">{task.description}</span>}</button>
                    <div className="task-card-chips"><span className={`task-priority ${task.priority ?? 'medium'}`}>{({high:'High',medium:'Med',low:'Low'})[task.priority ?? 'medium']}</span>{task.tags?.map(tag => <span key={tag} className="task-tag">{tag}</span>)}{!!task.checklist?.length && <span className="task-check-progress" aria-label={`${task.checklist.filter(item => item.completed).length} of ${task.checklist.length} subtasks complete`}><Check size={12} />{task.checklist.filter(item => item.completed).length}/{task.checklist.length}</span>}</div>
          <div className="task-card-meta">{(() => { const due = dueInfo(task, now); return <button className={`task-date-chip ${due?.tone ?? 'unset'}`} disabled={busy} onClick={() => openDetails(task)} aria-label={`Edit due date for ${task.title}`} title={task.dueDate || 'Set a due date'}><CalendarDays size={13} aria-hidden="true" />{due && task.dueDate ? <><time dateTime={task.dueDate}>{Number(task.dueDate.slice(5, 7))}/{Number(task.dueDate.slice(8, 10))}</time>{due.days >= 0 && due.days < 7 && <span>· {new Date(task.dueDate + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</span>}<span>· {due.label}</span></> : 'Add due date'}</button>; })()}</div>
        </li>)}</ul>
        {ready && cards.length === 0 && <p className="task-column-empty">{dragging ? 'Drop task here' : todayOnly ? 'No tasks due today' : column.hint}</p>}
      </section>;
    })}</div>
    <output className="todo-status">{!ready ? 'Loading tasks…' : busy ? 'Saving…' : error ? 'Change not saved' : 'Saved locally · Status changes autosave on this browser'}</output>
    <Sheet open={editing !== null} onOpenChange={open => { if (!open && !busy) setEditing(null); }}>
      <SheetContent className="task-detail-sheet" showCloseButton={false}>
        <div className="task-detail-heading"><div><SheetTitle>Task details</SheetTitle><SheetDescription>Everything this task needs, in one place.</SheetDescription></div><button type="button" aria-label="Close task details" disabled={busy} onClick={() => setEditing(null)}><X size={19} /></button></div>
        <form className="task-properties task-detail-form" onSubmit={async event => { event.preventDefault(); if (editing && await save({ type: 'update', id: editing, title: draft, description, dueDate, status, priority, tags, checklist })) setEditing(null); }}>
          <label htmlFor="task-title">Title<Input id="task-title" value={draft} maxLength={500} disabled={busy} onChange={event => setDraft(event.target.value)} /></label>
          <div className="task-detail-fields"><label htmlFor="task-status">Status<NativeSelect id="task-status" value={status} disabled={busy} onChange={event => setStatus(event.target.value as TodoStatus)}>{columns.map(column => <NativeSelectOption key={column.status} value={column.status}>{column.label}</NativeSelectOption>)}</NativeSelect></label>
          <label htmlFor="task-date">Due date<Input id="task-date" type="date" max="9999-12-31" value={dueDate} disabled={busy} onChange={event => setDueDate(event.target.value)} /></label></div>
          <label htmlFor="task-priority">Priority<NativeSelect id="task-priority" value={priority} disabled={busy} onChange={event => setPriority(event.target.value as typeof priority)}><NativeSelectOption value="high">High</NativeSelectOption><NativeSelectOption value="medium">Medium</NativeSelectOption><NativeSelectOption value="low">Low</NativeSelectOption></NativeSelect></label>
          <fieldset className="task-tags-editor" disabled={busy}><legend>Projects / tags</legend><div className="task-tag-options">{knownTags.map(tag => <button type="button" className="task-tag" aria-pressed={tags.includes(tag)} key={tag} disabled={!tags.includes(tag) && tags.length >= 20} onClick={() => setTags(tags.includes(tag) ? tags.filter(value => value !== tag) : [...tags, tag])}>{tags.includes(tag) && <Check size={12} />}{tag}</button>)}</div><div className="task-inline-add"><Input aria-label="New project or tag" placeholder="Create a tag…" maxLength={40} value={tagDraft} onChange={event => setTagDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} /><button type="button" disabled={!tagDraft.trim() || tags.length >= 20} onClick={addTag}>Create</button></div></fieldset>
          <label htmlFor="task-description">Description<Textarea id="task-description" placeholder="Add context, links, or next steps…" value={description} maxLength={5000} disabled={busy} onChange={event => setDescription(event.target.value)} /></label>
          <fieldset className="task-checklist-editor" disabled={busy}><legend>Checklist <span>{checklist.filter(item => item.completed).length}/{checklist.length}</span></legend><div className="task-checklist-items">{checklist.map(item => <div className="task-checklist-row" key={item.id}><Checkbox aria-label={`Complete ${item.title}`} checked={item.completed} onCheckedChange={completed => setChecklist(checklist.map(value => value.id === item.id ? {...value, completed} : value))} /><Input aria-label="Subtask title" maxLength={500} value={item.title} onChange={event => setChecklist(checklist.map(value => value.id === item.id ? {...value, title:event.target.value} : value))} /><button type="button" aria-label={`Remove ${item.title}`} onClick={() => setChecklist(checklist.filter(value => value.id !== item.id))}><X size={14} /></button></div>)}</div><div className="task-inline-add"><Input aria-label="New subtask" placeholder="Add a step…" maxLength={500} value={stepDraft} onChange={event => setStepDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addStep(); } }} /><button type="button" disabled={!stepDraft.trim() || checklist.length >= 100} onClick={addStep}><Plus size={16} /></button></div></fieldset>
          {error && <p className="todo-error" role="alert">{error}</p>}
          <div className="task-detail-bottom"><button className="task-delete" type="button" disabled={busy} onClick={async () => { if (editing && await save({type:'delete',id:editing})) setEditing(null); }}><Trash2 size={15} />Delete task</button><button className="todo-primary" disabled={busy || !draft.trim() || checklist.some(item => !item.title.trim())}><Check size={16} />{busy ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </SheetContent>
    </Sheet>
  </section></main>;
}
