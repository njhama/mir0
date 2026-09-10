# Whiteboard

A self-hostable diagram editor with sticky notes, images, architecture icons, labeled outlines, and arrows.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run build:selfhost
npm run start:selfhost
```

Open http://127.0.0.1:3001. See [self-hosting instructions](SELF_HOSTING.md) for Docker, networking, storage, and recovery details.

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
