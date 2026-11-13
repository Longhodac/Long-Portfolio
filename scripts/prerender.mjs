// Renders the app to HTML and puts it in the built page, so all content reads without JavaScript.
// Runs after `vite build` (the client) and `vite build --ssr` (this render function, into .prerender/).
import { readFile, rm, writeFile } from 'node:fs/promises';

const MARK = '<!--app-html-->';
const page = new URL('../dist/index.html', import.meta.url);
const ssrDir = new URL('../.prerender/', import.meta.url);

const { render } = await import(new URL('entry-server.js', ssrDir));
const template = await readFile(page, 'utf8');
if (!template.includes(MARK)) throw new Error(`dist/index.html has no ${MARK} to replace`);
await writeFile(page, template.replace(MARK, render()));
await rm(ssrDir, { recursive: true, force: true });
console.log('prerendered dist/index.html');
