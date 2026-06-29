import matter from 'gray-matter';
import { marked } from 'marked';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ponytail: custom renderer preserves full info string for code-block mode detection
marked.use({
  renderer: {
    code({ text, lang }: any) {
      // lang is just first token, check if it ends with input/output
      const match = lang?.match(/^(\S+)\s+(input|output)$/);
      if (match) {
        const [, baseLang, mode] = match;
        return `<pre class="code-${mode}"><code class="language-${baseLang}">${text}</code></pre>\n`;
      }
      // Default rendering
      const language = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${language}>${text}</code></pre>\n`;
    }
  }
});

export interface Chapter {
  id: string;
  title: string;
  section: string;
  order: number;
  html: string;
}

// ponytail: post-process HTML for link/image rewrites + heading IDs + callouts + code-blocks
function processHTML(html: string): string {
  // Add IDs to headings
  html = html.replace(/<h([1-6])>(.*?)<\/h\1>/g, (_match, level, text) => {
    const id = text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
    return `<h${level} id="${id}">${text}</h${level}>`;
  });

  // Rewrite links
  html = html.replace(/href="([^"]+)"/g, (_match, href) => {
    return `href="${rewriteLink(href)}"`;
  });

  // Rewrite images
  html = html.replace(/src="([^"]+)"/g, (_match, src) => {
    return `src="${rewriteAsset(src)}"`;
  });

  // Add target=_blank to external links
  html = html.replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');

  // Callouts: > [!TYPE] → styled blockquote with emoji
  html = html.replace(/<blockquote>\s*<p>\[!(NOTE|ALERT|WARNING|QUIZ|TIP|DISCLAIMER)\](.*?)<\/p>/gis, (_match, type, rest) => {
    const lowerType = type.toLowerCase();
    const emoji: Record<string, string> = { note: '📝', alert: '⚠️', warning: '⚠️', quiz: '❓', tip: '💡', disclaimer: '⚙️' };
    return `<blockquote class="callout callout-${lowerType}"><span class="callout-icon">${emoji[lowerType]}</span><p>${rest}</p>`;
  });

  return html;
}

function rewriteLink(href: string): string {
  if (href.startsWith('http')) return href;

  // ponytail: image links (nested image-links reference images in hrefs too)
  if (href.match(/^(\.\.\/)+(img\/.*)$/)) {
    return href.replace(/^(\.\.\/)+(.*)/, '/content-assets/$2');
  }

  if (href.includes('/appendix/') && href.includes('.md')) {
    return href.replace(/.*\/appendix\/([^#]+)\.md(#.*)?/, '/appendix/$1$2');
  }
  if (href.includes('glossary.md')) {
    return href.replace(/.*glossary\.md(#.*)?/, '/glossary$1');
  }
  if (href.includes('command-reference-guide.md')) {
    return href.replace(/.*command-reference-guide\.md(#.*)?/, '/reference$1');
  }
  const chapterMatch = href.match(/\.\.\/([^/]+)\/README\.md(#.*)?/);
  if (chapterMatch) {
    return `/chapters/${chapterMatch[1]}${chapterMatch[2] || ''}`;
  }
  return href;
}

function rewriteAsset(src: string): string {
  // ponytail: rewrite any relative path to img/ as /content-assets/img/
  if (src.match(/^(\.\.\/)+(img\/.*)$/)) {
    return src.replace(/^(\.\.\/)+(.*)/, '/content-assets/$2');
  }
  return src;
}

export async function loadChapters(): Promise<Chapter[]> {
  const chaptersDir = resolve('../chapters');
  const dirs = ['000-getting-started', '1.1-first-network', '1.2-smol-internet',
    '1.3-internet-chonk', '1.4-automatic-route-configuration', '2.1-basic-name-resolution',
    '2.2-automated-name-resolution', '2.3-simple-dns',
    '2.4-recursive-dns', '3.1-traceroute'];

  return dirs.map(id => {
    const raw = readFileSync(resolve(chaptersDir, id, 'README.md'), 'utf-8');
    const { data, content } = matter(raw);
    const html = processHTML(marked(content) as string);
    return { id, title: data.title, section: data.section, order: data.order, html };
  });
}

export async function loadAppendix(slug: string): Promise<{ html: string }> {
  const raw = readFileSync(resolve('../appendix', `${slug}.md`), 'utf-8');
  const { content } = matter(raw);
  return { html: processHTML(marked(content) as string) };
}

export async function loadRef(slug: string): Promise<{ html: string }> {
  const raw = readFileSync(resolve('../chapters', `${slug}.md`), 'utf-8');
  const { content } = matter(raw);
  return { html: processHTML(marked(content) as string) };
}
