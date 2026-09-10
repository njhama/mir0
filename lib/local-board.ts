import { parseEntities, type EntityClipboard } from './entities';
export { readClipboardImage } from './clipboard-image';
type Record = { revision: number; savedAt: number; board: EntityClipboard };
let database: Promise<IDBDatabase> | undefined;
let revision = 0;
const hashes = new Map<string, string>();
function openDatabase() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('whiteboard-local', 2);
    request.onupgradeneeded = () => {
      for (const name of ['boards', 'history', 'assets']) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
    };
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); database = undefined; }; resolve(request.result); };
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error('Close other whiteboard tabs, then reload.')); };
  });
}
function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
async function hydrate(board: EntityClipboard): Promise<EntityClipboard> {
  const db = await openDatabase();
  const notes = await Promise.all(board.notes.map(async note => {
    if (!note.image?.startsWith('asset:')) return note;
    const image = await result(db.transaction('assets').objectStore('assets').get(note.image.slice(6)));
    if (typeof image !== 'string') throw new Error('An image is missing from this snapshot.');
    return { ...note, image };
  }));
  const valid = parseEntities(JSON.stringify({ ...board, notes }));
  if (!valid) throw new Error('Saved board validation failed.');
  return valid;
}
export let recoveredBoard = false;
export async function loadLocalBoard(): Promise<EntityClipboard | undefined> {
  const db = await openDatabase();
  const head = await result(db.transaction('boards').objectStore('boards').get('default'));
  revision = head?.revision ?? 0;
  recoveredBoard = false;
  if (!head) return undefined;
  try { return await hydrate(head.board ?? head); } catch {
    const history = await result(db.transaction('history').objectStore('history').getAll()) as Record[];
    for (const snapshot of history.sort((a,b) => b.revision-a.revision)) {
      try { const board = await hydrate(snapshot.board); recoveredBoard = true; return board; } catch { /* Try the next intact checkpoint. */ }
    }
    throw new Error('Saved data could not be read. Import a backup; existing data has been preserved.');
  }
}
export async function saveLocalBoard(board: EntityClipboard): Promise<void> {
  const db = await openDatabase();
  const assets = new Map<string,string>();
  const notes = await Promise.all(board.notes.map(async note => {
    if (!note.image) return note;
    let hash = hashes.get(note.image);
    if (!hash) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(note.image));
      hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
      hashes.set(note.image, hash);
    }
    assets.set(hash,note.image);
    return { ...note, image: 'asset:' + hash };
  }));
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['boards','assets','history'], 'readwrite', { durability: 'strict' });
    let error: Error | null = null;
    let committedRevision = revision;
    const boards = transaction.objectStore('boards');
    const request = boards.get('default');
    request.onsuccess = () => {
      const previous = request.result;
      if ((previous?.revision ?? 0) !== revision) {
        error = new Error('Another tab saved newer changes. Export this tab as a backup before reloading.'); transaction.abort(); return;
      }
      const savedAt = Date.now(); committedRevision = revision + 1;
      const history = transaction.objectStore('history');
      if (previous) {
        const checkpoint: Record = previous.board ? previous : { revision: 0, savedAt, board: previous };
        // Keep one checkpoint per minute plus the immediately preceding save.
        history.put(checkpoint, Math.floor(checkpoint.savedAt / 60000));
        history.put(checkpoint, 'previous');
        const keys = history.getAllKeys();
        keys.onsuccess = () => { const minutes = keys.result.filter(key => typeof key === 'number').sort((a,b) => Number(a)-Number(b)); for (const key of minutes.slice(0, -60)) history.delete(key); };
      }
      const store = transaction.objectStore('assets');
      for (const [hash, image] of assets) {
        const exists = store.getKey(hash);
        exists.onsuccess = () => { if (exists.result === undefined) store.put(image,hash); };
      }
      boards.put({ revision: committedRevision, savedAt, board: { ...board, notes } }, 'default');
    };
    transaction.oncomplete = () => { revision = committedRevision; resolve(); };
    transaction.onerror = () => reject(error ?? transaction.error ?? new Error('Save failed. Export a backup.'));
    transaction.onabort = () => reject(error ?? transaction.error ?? new Error('Save aborted. Export a backup.'));
  });
}
export async function loadPreviousBoard(): Promise<EntityClipboard> {
  const db = await openDatabase();
  const snapshot = await result(db.transaction('history').objectStore('history').get('previous')) as Record | undefined;
  if (!snapshot) throw new Error('No previous save is available yet.');
  return hydrate(snapshot.board);
}
