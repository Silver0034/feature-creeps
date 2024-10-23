// @ts-check
import { defineConfig } from 'astro/config'
import node from '@astrojs/node'

import mdx from '@astrojs/mdx'

import react from '@astrojs/react'

import icon from 'astro-icon'

// https://astro.build/config
export default defineConfig({
	output: 'hybrid',

	adapter: node({
		mode: 'standalone'
	}),

	vite: {
		define: {
			__SITE__: JSON.stringify('https://localhost:4321')
		}
	},

	integrations: [
		mdx(),
		react(),
		icon({
			include: {
				'fa6-solid': ['*'] // Loads entire FontAwesome 6 Solid set
			}
		})
	]
})
