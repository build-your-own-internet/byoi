#!/usr/bin/env bun
// ponytail: parses built HTML, checks all internal hrefs exist
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const distDir = 'dist';
const errors: string[] = [];

function checkHtml(filePath: string, html: string) {
  const hrefMatches = html.matchAll(/href="([^"]+)"/g);

  for (const match of hrefMatches) {
    const href = match[1];

    // Skip external and assets
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/content-assets/') || href.startsWith('/_astro/')) continue;

    // Parse path and anchor
    const [path, anchor] = href.split('#');

    // Check path exists (if not empty/anchor-only)
    if (path && path !== '') {
      const diskPath = join(distDir, path === '/' ? 'index.html' : path, path.endsWith('/') ? 'index.html' : '');
      const checkPath = diskPath.endsWith('.html') ? diskPath : `${diskPath}/index.html`;

      if (!existsSync(checkPath)) {
        errors.push(`${filePath}: broken link "${href}" → file not found: ${checkPath}`);
      }
    }

    // Check anchor exists in target (or current page if anchor-only)
    if (anchor) {
      let targetHtml: string;
      let targetLabel: string;

      if (!path || path === '') {
        // Same-page anchor
        targetHtml = html;
        targetLabel = filePath;
      } else {
        const diskPath = join(distDir, path === '/' ? 'index.html' : path, path.endsWith('/') ? 'index.html' : '');
        const checkPath = diskPath.endsWith('.html') ? diskPath : `${diskPath}/index.html`;

        if (!existsSync(checkPath)) continue; // Already reported path error

        targetHtml = readFileSync(checkPath, 'utf-8');
        targetLabel = checkPath;
      }

      // Check for id="anchor" in target
      if (!targetHtml.includes(`id="${anchor}"`)) {
        errors.push(`${filePath}: broken anchor "${href}" → #${anchor} not found in ${targetLabel}`);
      }
    }
  }
}

function walk(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name.endsWith('.html')) {
      const html = readFileSync(fullPath, 'utf-8');
      checkHtml(fullPath, html);
    }
  }
}

if (!existsSync(distDir)) {
  console.error('dist/ not found. Run `bun run build` first.');
  process.exit(1);
}

walk(distDir);

if (errors.length > 0) {
  console.error(`Found ${errors.length} broken link(s):\n`);
  errors.forEach(e => console.error(`  ✗ ${e}`));
  process.exit(1);
} else {
  console.log('✓ All internal links valid.');
}
