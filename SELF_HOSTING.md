# Self-hosted whiteboard

Run the same canvas and text boxes on your own computer or server. The standalone build contains no Sites or Cloudflare runtime, external fonts, analytics, sign-in, or cloud API calls. The bundled Node server serves static files and blocks browser fetch/WebSocket connections through its Content Security Policy.

## Run on your computer

From the whiteboard folder, with Node.js 24 and npm installed:

```sh
npm ci
npm run build:selfhost
npm run start:selfhost
```

Or run **`npm run local`** to install dependencies, build, and start in one command. It uses the same address and autosave database as the manual steps above. Node.js 24 or newer is required. First launch needs internet access; subsequent unchanged installations are reused.

Open http://127.0.0.1:3001. The default bind address is loopback, so other computers cannot connect. Dependency installation needs internet access; the finished app can run without internet access. The runtime server uses only Node built-ins, so you can also copy just `dist-selfhost/` and `scripts/serve-selfhost.mjs` onto another machine with Node installed.

## Docker option

```sh
docker build -t whiteboard .
docker run --rm --name whiteboard -p 127.0.0.1:3001:3001 whiteboard
```

The port is deliberately published only on your computer. The container runs as a non-root user. Building the image requires access to the image and npm registries.

## Host for other devices

Set `HOST` and `PORT` in your server environment to change the listener. For example, in PowerShell:

```powershell
$env:HOST = '0.0.0.0'
$env:PORT = '3001'
npm run start:selfhost
```

Only expose it to a trusted network or place it behind your own HTTPS reverse proxy and authentication. This version has no built-in access control. You can alternatively serve `dist-selfhost/` with your own static web server; preserve the security headers from `scripts/serve-selfhost.mjs`.

## What happens to board data

- Notes, images, positions, and arrows autosave in IndexedDB on this device. Wait for “Saved on this device” before closing or refreshing. They are not uploaded to this server or a cloud service.
- Database: `whiteboard-local` (schema v2); stores: `boards`, `assets`, and `history`. The `boards/default` record contains the revision, timestamp, and entity metadata. Inspect it through your browser's developer tools under Application → IndexedDB. Images are stored once in `assets`, keyed by SHA-256; entities and history reference those assets. They are not separate files in Downloads or the project folder. Exported backups embed the images so they are portable.
- Copy an image or screenshot, click the canvas, and paste with Ctrl/Cmd+V. Supported types: PNG, JPEG, WebP, GIF, and AVIF, up to 10 MB each. Select pasted images to copy/paste them as entities, move them, delete them, or connect arrows.
- Clearing this site's browser data deletes the saved board. Private browsing may discard it on exit. This is local storage, not a backup.
- Different browsers, devices, and origins have independent boards: `localhost:3000` and `127.0.0.1:3001` do not share storage. Concurrent tabs are not synchronized. A revision check rejects stale saves rather than overwriting another tab. Export a conflicting tab before reloading it.
- Self-hosting does not encrypt local device memory or protect against browser extensions or someone with access to your device.

## Project direction

[CanvyDocs](https://github.com/CanvyDocs/CanvyDocs) is a reference for the infinite-canvas, editable-content, self-hosting direction. Its README currently marks its self-hosting documentation as coming soon. This implementation does not copy its source code.

The existing `dev`, `build`, and `start` scripts retain the earlier hosted setup. Use the explicit `:selfhost` scripts above for the standalone option. The previously published preview is separate; these changes do not publish or send your local board to it.

## Saving and recovery

- Changes enter a serial save queue immediately. Superseded queued saves are skipped, and the newest state is committed atomically with its image assets and recovery history. The status only says saved after transaction completion.
- Autosaves request strict IndexedDB durability. An unsaved-change navigation warning is registered while writes are outstanding or failed; browser termination and power loss cannot be guaranteed against.
- Keep up to 60 minute checkpoints plus the immediately preceding committed save. Restore previous switches to that preceding save; a damaged current record triggers a search for the newest intact snapshot at startup. Existing v1 boards migrate without deleting their original data.
- Save now retries a failed save. Export backup downloads a complete JSON file with images; import validates and adds its contents alongside the current board with new entity IDs. Nothing is silently replaced by import.
- Protect storage requests persistent browser storage. The browser can decline. It does not prevent explicit site-data deletion or device loss. Keep exported backups outside the browser.
- Deleted image assets are retained for recovery rather than immediately garbage-collected. A full-disk/quota failure leaves the previously committed board intact and shows a save error.
- The hosted and self-hosted URLs do not share data. Export from the origin containing your work before changing URLs, then import at the destination. These changes update the self-hosted build; they do not silently publish the hosted preview.

Storage regression checks: `node tests/storage.mjs` (uses a test IndexedDB implementation, not your real browser data).
