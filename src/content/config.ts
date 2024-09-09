import { z, defineCollection } from 'astro:content'

const viewsHostCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		key: z.number()
	})
})

const viewsClientCollection = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		key: z.number()
	})
})

export const collections = {
	'views-host': viewsHostCollection,
	'views-client': viewsClientCollection
}
