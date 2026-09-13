export type TodoStatus = 'todo' | 'in-progress' | 'blocked' | 'done';
export type ChecklistItem = { id: string; title: string; completed: boolean };
export type TaskProperties = { priority?: 'high' | 'medium' | 'low'; tags?: string[]; checklist?: ChecklistItem[] };
export type Todo = TaskProperties & { id: string; title: string; completed: boolean; createdAt: number; status?: TodoStatus; description?: string; dueDate?: string };
export type TodoChange = { type: 'add'; task: Todo } | (TaskProperties & { type: 'update'; id: string; title?: string; completed?: boolean; status?: TodoStatus; description?: string; dueDate?: string }) | { type: 'delete'; id: string };
export function validDueDate(value: string) {
  if (value === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function dueInfo(task: Todo, now = new Date()) {
  if (!task.dueDate || !validDueDate(task.dueDate)) return null;
  // Compare calendar dates, not elapsed hours, so DST and local midnight stay correct.
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((Date.parse(`${task.dueDate}T00:00:00Z`) - today) / 86400000);
  if (taskStatus(task) === 'done') return { days, tone: 'complete', label: 'Completed' };
  if (days < 0) return { days, tone: 'overdue', label: `${-days} ${days === -1 ? 'day' : 'days'} overdue` };
  if (days === 0) return { days, tone: 'soon', label: 'Due today' };
  return { days, tone: days <= 3 ? 'soon' : 'later', label: `${days} ${days === 1 ? 'day' : 'days'} left` };
}
export function taskStatus(task: Todo): TodoStatus {
  return task.status ?? (task.completed ? 'done' : 'todo');
}

// Separate from the board database: task operations never replace diagram data.
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mir0-todos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('tasks', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other mir0 tabs and try again.'));
  });
}

export async function loadTodos(): Promise<Todo[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', 'readonly');
    const request = tx.objectStore('tasks').getAll();
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

export async function changeTodo(change: TodoChange): Promise<Todo[]> {
  const status = change.type === 'add' ? change.task.status : change.type === 'update' ? change.status : undefined;
  if (status !== undefined && !['todo', 'in-progress', 'blocked', 'done'].includes(status)) throw new Error('Invalid task status.');
  const properties: TaskProperties & { description?: string; dueDate?: string } = change.type === 'add' ? change.task : change.type === 'update' ? change : {};
  if (properties.description !== undefined && properties.description.length > 5000) throw new Error('Description is too long.');
  if (properties.dueDate !== undefined && !validDueDate(properties.dueDate)) throw new Error('Invalid due date.');
  if (properties.priority !== undefined && !['high', 'medium', 'low'].includes(properties.priority)) throw new Error('Invalid priority.');
  if (properties.tags !== undefined && (properties.tags.length > 20 || properties.tags.some(tag => !tag.trim() || tag.length > 40) || new Set(properties.tags).size !== properties.tags.length)) throw new Error('Invalid tags.');
  if (properties.checklist !== undefined && (properties.checklist.length > 100 || properties.checklist.some(item => !item.id || !item.title.trim() || item.title.length > 500 || typeof item.completed !== 'boolean') || new Set(properties.checklist.map(item => item.id)).size !== properties.checklist.length)) throw new Error('Invalid checklist.');
  if (change.type === 'add' && (!change.task.title.trim() || change.task.title.length > 500)) throw new Error('Enter a task with 1–500 characters.');
  if (change.type === 'update' && change.title !== undefined && (!change.title.trim() || change.title.length > 500)) throw new Error('Enter a task with 1–500 characters.');
  const db = await open();
  return new Promise((resolve, reject) => {
    // Read/modify the latest record atomically, including across browser tabs.
    const tx = db.transaction('tasks', 'readwrite', { durability: 'strict' });
    const store = tx.objectStore('tasks');
    if (change.type === 'add') store.add({ ...change.task, title: change.task.title.trim(), ...(status !== undefined ? { completed: status === 'done' } : {}) });
    else if (change.type === 'delete') store.delete(change.id);
    else {
      const request = store.get(change.id);
      request.onsuccess = () => {
        if (!request.result) return;
        store.put({ ...request.result, ...(change.priority !== undefined ? { priority: change.priority } : {}), ...(change.tags !== undefined ? { tags: change.tags } : {}), ...(change.checklist !== undefined ? { checklist: change.checklist } : {}), ...(change.description !== undefined ? { description: change.description } : {}), ...(change.dueDate !== undefined ? { dueDate: change.dueDate } : {}), ...(change.title !== undefined ? { title: change.title.trim() } : {}), ...(change.completed !== undefined ? { completed: change.completed, ...(request.result.status ? { status: change.completed ? 'done' : 'todo' } : {}) } : {}), ...(status !== undefined ? { status, completed: status === 'done' } : {}) });
      };
    }
    tx.oncomplete = () => { db.close(); loadTodos().then(resolve, reject); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Could not save task.')); };
  });
}


export function isTodayTask(task: Todo, now = new Date()) {
  const due = dueInfo(task, now);
  return taskStatus(task) !== 'done' && due !== null && due.days <= 0;
}
