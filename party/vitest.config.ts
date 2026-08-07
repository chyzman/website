import { defineConfig } from 'vite';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
	plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })]
});
