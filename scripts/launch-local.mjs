import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3001);
let child;
let stopping = false;
function run(file, args) {
  return new Promise((resolveRun, reject) => {
    child = spawn(file, args, { cwd: root, stdio: 'inherit', env: { ...process.env, HOST: host, PORT: String(port) }, windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      child = undefined;
      if (code === 0 || stopping) resolveRun();
      else reject(new Error(`Command failed (${signal || code}). Fix the error above and run npm run local again.`));
    });
  });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  stopping = true;
  if (child) child.kill(signal);
  else process.exit(0);
});

try {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Install Node.js 24 or newer, then run npm run local again.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error('Start this launcher using: npm run local');
  await new Promise((ready, reject) => {
    const probe = createServer();
    probe.once('error', error => reject(new Error(error.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. If mir0 is running, open http://${host}:${port}/. Otherwise stop the program using this port and retry. The launcher will not switch ports because saved boards belong to a specific address.`
      : `Cannot listen on ${host}:${port}: ${error.message}`)));
    probe.listen(port, host, () => probe.close(ready));
  });

  const lock = await readFile(resolve(root, 'package-lock.json'));
  const manifest = await readFile(resolve(root, 'package.json'));
  const fingerprint = createHash('sha256').update(lock).update(manifest).update(`${process.versions.node}-${process.platform}-${process.arch}`).digest('hex');
  const stamp = resolve(root, 'node_modules/.mir0-install');
  let installed = false;
  try {
    installed = (await readFile(stamp, 'utf8')) === fingerprint;
    await access(resolve(root, 'node_modules/vite/bin/vite.js'));
    await access(resolve(root, 'node_modules/react/package.json'));
  } catch { installed = false; }
  if (!installed) {
    console.log('\nInstalling dependencies (internet required on first run)…');
    await run(process.execPath, [npm, 'ci', '--include=dev', '--no-audit', '--no-fund']);
    if (stopping) process.exit(0);
    await writeFile(stamp, fingerprint);
  }
  console.log('\nBuilding mir0…');
  await run(process.execPath, [npm, 'run', 'build:selfhost']);
  if (!stopping) {
    console.log(`\nOpen http://${host}:${port}/\nAutosave is enabled in this browser. Use the same address and browser to return to your board.\nKeep this terminal running. Press Ctrl+C to stop.\n`);
    await run(process.execPath, [resolve(root, 'scripts/serve-selfhost.mjs')]);
  }
} catch (error) {
  console.error('\n' + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
}
