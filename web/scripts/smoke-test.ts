#!/usr/bin/env bun
// ponytail: minimal smoke test — does site actually render?
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const distDir = 'dist';
const errors: string[] = [];

function checkPage(path: string, html: string, label: string) {
  // Must have doctype
  if (!html.includes('<!DOCTYPE html>')) {
    errors.push(`${label}: missing <!DOCTYPE html>`);
  }

  // Must have title
  if (!html.includes('<title>')) {
    errors.push(`${label}: missing <title>`);
  }

  // Must have main content
  if (!html.includes('<chapter-content') && !path.includes('index.html')) {
    errors.push(`${label}: missing chapter-content`);
  }

  // Must have TOC
  if (!html.includes('<table-of-contents')) {
    errors.push(`${label}: missing TOC`);
  }

  // Check for unclosed tags (basic)
  const openDivs = (html.match(/<div/g) || []).length;
  const closeDivs = (html.match(/<\/div>/g) || []).length;
  if (openDivs !== closeDivs) {
    errors.push(`${label}: mismatched <div> tags (${openDivs} open, ${closeDivs} close)`);
  }
}

// Check a few key pages
const samples = [
  'chapters/000-getting-started/index.html',
  'chapters/1.1-first-network/index.html',
  'chapters/2.4-recursive-dns/index.html',
  'glossary/index.html',
  'reference/index.html'
];

for (const sample of samples) {
  const path = join(distDir, sample);
  try {
    const html = readFileSync(path, 'utf-8');
    checkPage(path, html, sample);
  } catch (e: any) {
    errors.push(`${sample}: failed to read (${e.message})`);
  }
}

if (errors.length > 0) {
  console.error(`Smoke test failed with ${errors.length} error(s):\n`);
  errors.forEach(e => console.error(`  ✗ ${e}`));
  process.exit(1);
} else {
  console.log(`✓ Smoke test passed (${samples.length} pages checked)`);
}
