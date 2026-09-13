# Whiteboard

A self-hostable diagram editor with sticky notes, images, architecture icons, labeled outlines, and arrows.

## Run locally

Requires Node.js 24 or newer (includes npm). Clone or download this repository, open a terminal in its folder, then run one command:

```sh
npm run local
```

Open http://127.0.0.1:3001. See [self-hosting instructions](SELF_HOSTING.md) for Docker, networking, storage, and recovery details.

The launcher installs locked dependencies on first run, builds the app, and starts the local server with autosave enabled. Later runs reuse dependencies unless the lockfile, package manifest, or Node environment changed. Internet is needed for installation, but the installed app runs offline. Keep the terminal open; Ctrl+C stops the server without deleting saved boards. No account, cloud service, or database setup is needed.

Always return using the same browser and `http://127.0.0.1:3001/`. Saves are browser-local IndexedDB data, not files in the repository. Export backups for safekeeping. An occupied port produces a clear message rather than silently moving to a different address with separate storage.

## Controls

- Right-drag to pan; scroll to zoom around the cursor.
- Left-click to select; drag empty canvas to select multiple entities.
- Drag an entity to move it; click a selected sticky note again to edit text.
- Use connection dots to draw arrows between entities.
- Ctrl/Cmd+C and Ctrl/Cmd+V copy/paste entities; clipboard images can be pasted directly.
- Select outlines to edit their labels and borders or drag their resize handles.

## Local data

The standalone app stores boards and deduplicated images in browser IndexedDB with autosaving, revision checks, and recovery snapshots. Board data is not uploaded. Export backups to protect against clearing browser data or losing a device. Different origins and browser profiles have separate storage.

## Validation

```sh
npx tsc --noEmit
node tests/storage.mjs
npm run build:selfhost
```

The original hosted build remains available through `npm run build`; the `:selfhost` scripts build and serve the standalone app.

## Icon artwork

AWS, GitHub, and Redis assets come from their official sources; generic icons use Lucide. See [asset sources](public/icons/SOURCES.md). Vendor artwork and trademarks remain subject to their respective terms. No Lucidchart source or artwork is included.

### Task board

Use the **Task board** tab to move cards between To do, In progress, Waiting / Blocked, and Done. Click a card to edit its title, description, status, due date, priority, project/tag chips, and checklist, then choose **Save changes**. Create custom tags in task details and reuse tags from saved tasks. Cards show due-date countdowns and checklist progress. The **Today** filter shows unfinished tasks due today or overdue. The top bar includes a saved dark/light theme preference.

Adding, moving, and deleting tasks saves immediately; the board reports saving failures. Existing tasks and diagrams are preserved.

Tasks are stored separately from diagrams in the browser's `mir0-todos` IndexedDB database. They stay on the current browser and origin (host + port), and are not uploaded. Clearing site data removes tasks too. Whiteboard exports currently contain diagrams only, not tasks.
