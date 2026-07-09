import { z } from 'zod';

export const productUserRefSchema = z.object({
	username: z.string().nullable().optional(),
	tier: z.string().nullable().optional()
});

export const productViewSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	images: z.array(z.object({ url: z.string() })),
	tags: z.array(z.object({ tag: z.string() })),
	offer: z
		.object({
			offer_colorA: z.string(),
			offer_colorB: z.string(),
			offer_name: z.string()
		})
		.optional(),
	rating: z.object({ count: z.number(), rating: z.number() }).optional(),
	stock: z.object({ count: z.number(), status: z.string() }),
	created_at: z.string(),
	documentation: z.array(z.object({ data: z.string(), isMDUrl: z.boolean() })).optional(),
	faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
	uid: z.string(),
	price: z.object({ old: z.number(), new: z.number() }),
	author: z.string().optional(),
	type: z.string(),
	guarantee: z.string(),
	rel: z.string(),
	users: productUserRefSchema.nullable()
});

export const reviewViewSchema = z.object({
	id: z.string().uuid(),
	user_id: z.string().uuid(),
	product_id: z.string().uuid(),
	rating: z.number(),
	comment: z.string().nullable(),
	created_at: z.string(),
	users: productUserRefSchema.optional()
});

export const constantKeyParamSchema = z.object({
	key: z.string().min(1)
});

export const getConstantResponseSchema = z.object({
	key: z.string(),
	value: z.unknown()
});

export const homeCatalogResponseSchema = z.object({
	recentProducts: z.array(productViewSchema),
	recentSpares: z.array(productViewSchema),
	recentFleaMarket: z.array(productViewSchema),
	featuredProducts: z.array(productViewSchema),
	stats: z.object({
		makers: z.number(),
		listings: z.number(),
		users: z.number()
	})
});

export const browseCategorySchema = z.enum(['all', 'products', 'spares', 'flea_market']);
export const browseSortSchema = z.enum(['newest', 'price_asc', 'price_desc']);

export const browseQuerySchema = z.object({
	filter: browseCategorySchema.default('all'),
	q: z.string().optional(),
	tag: z.string().optional(),
	minPrice: z.coerce.number().optional(),
	maxPrice: z.coerce.number().optional(),
	inStock: z
		.enum(['true', 'false'])
		.optional()
		.transform((value) => value === 'true'),
	sort: browseSortSchema.default('newest'),
	page: z.coerce.number().int().positive().default(1)
});

export const tagOptionSchema = z.object({
	key: z.string(),
	label: z.string(),
	count: z.number(),
	variants: z.array(z.string()),
	parentKey: z.string().nullable().optional()
});

export const tagGroupSchema = z.object({
	key: z.string(),
	label: z.string(),
	count: z.number(),
	variants: z.array(z.string()),
	children: z.array(tagOptionSchema)
});

export const categoryCountsSchema = z.object({
	all: z.number(),
	products: z.number(),
	spares: z.number(),
	flea_market: z.number()
});

export const browseCatalogResponseSchema = z.object({
	products: z.array(productViewSchema),
	totalCount: z.number(),
	currentPage: z.number(),
	totalPages: z.number(),
	filters: browseQuerySchema,
	categoryCounts: categoryCountsSchema,
	tagGroups: z.array(tagGroupSchema),
	standaloneTags: z.array(tagOptionSchema),
	allTagOptions: z.array(tagOptionSchema)
});

export const productIdParamSchema = z.object({
	productId: z.string().uuid()
});

export const productDetailResponseSchema = z.object({
	product: productViewSchema
});

export const productReviewsResponseSchema = z.object({
	reviews: z.array(reviewViewSchema)
});

export const productVariantsResponseSchema = z.object({
	variants: z.array(
		z.object({
			id: z.string().uuid(),
			label: z.string(),
			href: z.string()
		})
	)
});

export const productRelatedResponseSchema = z.object({
	products: z.array(productViewSchema)
});

export type ProductView = z.infer<typeof productViewSchema>;
export type ReviewView = z.infer<typeof reviewViewSchema>;
export type GetConstantResponse = z.infer<typeof getConstantResponseSchema>;
export type HomeCatalogResponse = z.infer<typeof homeCatalogResponseSchema>;
export type BrowseQuery = z.infer<typeof browseQuerySchema>;
export type BrowseCatalogResponse = z.infer<typeof browseCatalogResponseSchema>;
export type ProductDetailResponse = z.infer<typeof productDetailResponseSchema>;
export type ProductReviewsResponse = z.infer<typeof productReviewsResponseSchema>;
export type ProductVariantsResponse = z.infer<typeof productVariantsResponseSchema>;
export type ProductRelatedResponse = z.infer<typeof productRelatedResponseSchema>;
