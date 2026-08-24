import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// URLs mirror the live site exactly: `/` for home, `/pages/<slug>` for everything else.
export default defineConfig({
  site: 'https://grip.health',
  integrations: [mdx(), sitemap()],
  build: {
    // Emit `/pages/huisarts/index.html` so paths resolve without trailing-slash surprises.
    format: 'directory',
  },
});
