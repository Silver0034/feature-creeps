// @ts-check
import { defineConfig } from 'astro/config'
import node from '@astrojs/node'

import mdx from '@astrojs/mdx'

import react from '@astrojs/react'

// https://astro.build/config
export default defineConfig({
	output: 'static',
	adapter: node({ mode: 'standalone' }),
	integrations: [mdx(), react()],
	server: {
		// Cross-origin isolation headers enable multithreaded WASM.
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
		},
	},
	base: process.env.BASE_URL ?? '/', // fallback for local dev
})
