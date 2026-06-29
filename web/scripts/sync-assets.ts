import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('../img');
const dest = resolve('public/content-assets/img');

// ponytail: rm + cp instead of sync, simpler
if (existsSync(dest)) rmSync(dest, { recursive: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

console.log(`✓ Synced ${src} → ${dest}`);
