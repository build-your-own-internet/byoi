import { visit } from 'unist-util-visit';

// ponytail: remark runs before Astro's import resolution, rewrites images there
export function remarkRewriteImages() {
  return (tree: any) => {
    visit(tree, 'image', (node) => {
      if (node.url.includes('/img/')) {
        node.url = node.url.replace(/.*\/(img\/.*)/, '/content-assets/$1');
      }
    });
  };
}

export default function rehypeRewriteLinks() {
  return (tree: any) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a' && node.properties?.href) {
        node.properties.href = rewriteLink(node.properties.href);
        if (node.properties.href.startsWith('http')) {
          node.properties.target = '_blank';
          node.properties.rel = 'noopener';
        }
      }
    });
  };
}

function rewriteLink(href: string): string {
  if (href.startsWith('http')) return href;
  if (href.includes('/appendix/') && href.endsWith('.md')) {
    return href.replace(/.*\/appendix\/([^#]+)\.md(#.*)?/, '/appendix/$1$2');
  }
  if (href.includes('/appendix/') && href.includes('#')) {
    return href.replace(/.*\/appendix\/([^#]+)(#.*)/, '/appendix/$1$2');
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
