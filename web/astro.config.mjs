import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';

export default defineConfig({
  vite: {
    server: {
      fs: { allow: ['..'] },
      watch: { ignored: [] }
    },
    build: {
      rollupOptions: {
        // ponytail: mark ../img/** as external so Rollup doesn't try to resolve, rehype rewrites them
        external: (id) => id.includes('../img/')
      }
    }
  },

  markdown: {
    remarkPlugins: [
      (await import('./src/lib/rehype-rewrite-links.ts')).remarkRewriteImages
    ],
    rehypePlugins: [
      (await import('./src/lib/rehype-rewrite-links.ts')).default
    ]
  },

  integrations: [preact()]
});
