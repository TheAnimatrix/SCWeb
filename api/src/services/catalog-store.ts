import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type {
	BrowseCatalogResponse,
	BrowseQuery,
	GetConstantResponse,
	HomeCatalogResponse,
	ProductDetailResponse,
	ProductMakerInfo,
	ProductRelatedResponse,
	ProductReviewsResponse,
	ProductVariantsResponse
} from '../contracts/catalog.js';
import type { Database } from '../db/index.js';
import { constants } from '../db/schema/constants.js';
import { makers } from '../db/schema/makers.js';
import { products } from '../db/schema/products.js';
import { reviews } from '../db/schema/reviews.js';
import { users } from '../db/schema/users.js';
import {
	buildTagFilterSql,
	buildTagGroups,
	filterBrowsableStandaloneTags,
	filterBrowsableTagGroups,
	normalizeTagKey,
	parseProductTags,
	type TagOption
} from '../lib/browse-tags.js';
import { createTtlCache } from '../lib/cache.js';
import {
	mapProductRow,
	mapReviewRow,
	parseProductIdFromBannerUrl,
	productHref,
	type ProductView
} from './catalog-mappers.js';
import { interestStatsSubquery, productInterestFromStats } from './interest-store.js';

const PAGE_SIZE = 12;
const RELATED_LIMIT = 4;
const HOME_RECENT_LIMIT = 6;

const constantsCache = createTtlCache<GetConstantResponse>(60_000);
const tagCatalogCache = createTtlCache<{
	groups: ReturnType<typeof buildTagGroups>['groups'];
	standalone: ReturnType<typeof buildTagGroups>['standalone'];
	allOptions: TagOption[];
}>(60_000);
const categoryCountsCache = createTtlCache<BrowseCatalogResponse['categoryCounts']>(60_000);
const homeCatalogCache = createTtlCache<HomeCatalogResponse>(30_000);

function filterToProductType(filter: BrowseQuery['filter']): string | null {
	switch (filter) {
		case 'products':
			return 'product';
		case 'spares':
			return 'spare';
		case 'flea_market':
			return 'flea-market';
		default:
			return null;
	}
}

function buildBrowseConditions(
	filters: BrowseQuery,
	tagOptions: TagOption[],
	options?: { includeType?: boolean }
): SQL[] {
	const conditions: SQL[] = [eq(products.listingState, 'live')];

	if (options?.includeType !== false) {
		const productType = filterToProductType(filters.filter);
		if (productType) {
			conditions.push(eq(products.type, productType));
		}
	}

	if (filters.q) {
		const term = `%${filters.q.replace(/[%_\\]/g, '\\$&')}%`;
		conditions.push(or(ilike(products.name, term), ilike(products.author, term))!);
	}

	if (filters.minPrice != null) {
		conditions.push(sql`(${products.price}->>'new')::int >= ${filters.minPrice}`);
	}

	if (filters.maxPrice != null) {
		conditions.push(sql`(${products.price}->>'new')::int <= ${filters.maxPrice}`);
	}

	if (filters.inStock) {
		conditions.push(
			or(
				sql`(${products.stock}->>'count')::int > 0`,
				ilike(sql`${products.stock}->>'status'`, '%on-demand%')
			)!
		);
	}

	const tagFilter = buildTagFilterSql(filters.tag ?? null, tagOptions);
	if (tagFilter) {
		conditions.push(tagFilter);
	}

	return conditions;
}

function browseOrderBy(sort: BrowseQuery['sort']) {
	switch (sort) {
		case 'price_asc':
			return asc(sql`(${products.price}->>'new')::int`);
		case 'price_desc':
			return desc(sql`(${products.price}->>'new')::int`);
		default:
			return desc(products.createdAt);
	}
}

export interface CatalogStore {
	getConstant(key: string): Promise<GetConstantResponse | null>;
	getHomeCatalog(): Promise<HomeCatalogResponse>;
	getBrowseCatalog(filters: BrowseQuery): Promise<BrowseCatalogResponse>;
	getProduct(productId: string): Promise<ProductDetailResponse | null>;
	getProductReviews(productId: string): Promise<ProductReviewsResponse>;
	getProductVariants(productId: string): Promise<ProductVariantsResponse | null>;
	getRelatedProducts(productId: string): Promise<ProductRelatedResponse | null>;
}

export function createCatalogStore(db: Database): CatalogStore {
	/**
	 * Per-product review average and count, computed from the `reviews` table so the
	 * card, the purchase panel and the reviews tab always agree. The legacy
	 * `products.rating` column is no longer read.
	 */
	function reviewStatsSubquery() {
		return db
			.select({
				productId: reviews.productId,
				average: sql<string | null>`avg(${reviews.rating})`.as('review_average'),
				count: sql<number>`count(*)::int`.as('review_count')
			})
			.from(reviews)
			.groupBy(reviews.productId)
			.as('review_stats');
	}

	function selectProductColumns(
		reviewStats: ReturnType<typeof reviewStatsSubquery>,
		interestStats: ReturnType<typeof interestStatsSubquery>
	) {
		return {
			product: products,
			user: {
				username: users.username,
				tier: users.tier
			},
			reviewStats: {
				average: reviewStats.average,
				count: reviewStats.count
			},
			// Interest check (null for an ordinary listing): campaign settings plus the live
			// count of people who have not withdrawn.
			interestStats: {
				status: interestStats.status,
				targetCount: interestStats.targetCount,
				shipsWithinDays: interestStats.shipsWithinDays,
				note: interestStats.note,
				interestedCount: interestStats.interestedCount
			}
		};
	}

	type ProductQueryRow = {
		product: typeof products.$inferSelect;
		user: { username: string | null; tier: string | null } | null;
		reviewStats: { average: string | null; count: number } | null;
		interestStats: Parameters<typeof productInterestFromStats>[0];
	};

	function mapQueryRow(row: ProductQueryRow): ProductView {
		return mapProductRow(
			row.product,
			row.user,
			row.reviewStats,
			productInterestFromStats(row.interestStats)
		);
	}

	async function selectProductsWithUsers(
		where?: SQL,
		orderBy = desc(products.createdAt),
		limit?: number
	) {
		const live = eq(products.listingState, 'live');
		const combined = where ? and(live, where) : live;
		const reviewStats = reviewStatsSubquery();
		const interestStats = interestStatsSubquery(db);

		let query = db
			.select(selectProductColumns(reviewStats, interestStats))
			.from(products)
			.leftJoin(users, eq(products.uid, users.id))
			.leftJoin(reviewStats, eq(reviewStats.productId, products.id))
			.leftJoin(interestStats, eq(interestStats.productId, products.id))
			.where(combined)
			.orderBy(orderBy);

		if (limit != null) {
			query = query.limit(limit) as typeof query;
		}

		const rows = await query;
		return rows.map(mapQueryRow);
	}

	async function getMakerInfo(makerId: string): Promise<ProductMakerInfo | null> {
		const [row] = await db
			.select({
				location: makers.location,
				approvedState: makers.approvedState,
				storefrontState: makers.storefrontState,
				publishedAt: makers.publishedAt,
				approvedAt: makers.approvedAt
			})
			.from(makers)
			.where(eq(makers.id, makerId))
			.limit(1);
		if (!row) return null;

		const approved = row.approvedState === 'approved';
		let sellingSince: string | null = null;
		if (approved) {
			// Makers who were listing before the makers table existed have a `published_at`
			// later than their first listing, so take the earlier of the two.
			const [first] = await db
				.select({ at: sql<string | null>`min(${products.createdAt})` })
				.from(products)
				.where(
					and(
						or(eq(products.makerId, makerId), eq(products.uid, makerId)),
						eq(products.listingState, 'live')
					)
				);
			const candidates = [row.publishedAt ?? row.approvedAt ?? null, first?.at ?? null]
				.filter((value): value is NonNullable<typeof value> => value != null)
				.map((value) => new Date(value).getTime())
				.filter((time) => Number.isFinite(time));
			sellingSince = candidates.length ? new Date(Math.min(...candidates)).toISOString() : null;
		}
		return {
			location: row.location?.trim() || null,
			sellingSince,
			storefrontLive: approved && row.storefrontState === 'live'
		};
	}

	async function getTagCatalog() {
		const cached = tagCatalogCache.get('all');
		if (cached) return cached;

		const rows = await db
			.select({ tags: products.tags, type: products.type })
			.from(products)
			.where(eq(products.listingState, 'live'));
		const built = buildTagGroups(
			rows.map((row) => ({
				tags: parseProductTags(row.tags),
				type: row.type
			}))
		);

		const value = {
			groups: built.groups,
			standalone: built.standalone,
			allOptions: built.allOptions
		};
		tagCatalogCache.set('all', value);
		return value;
	}

	async function getCategoryCounts(): Promise<BrowseCatalogResponse['categoryCounts']> {
		const cached = categoryCountsCache.get('all');
		if (cached) return cached;

		const [allResult, productsResult, sparesResult, fleaResult] = await Promise.all([
			db.select({ value: count() }).from(products).where(eq(products.listingState, 'live')),
			db
				.select({ value: count() })
				.from(products)
				.where(and(eq(products.listingState, 'live'), eq(products.type, 'product'))),
			db
				.select({ value: count() })
				.from(products)
				.where(and(eq(products.listingState, 'live'), eq(products.type, 'spare'))),
			db
				.select({ value: count() })
				.from(products)
				.where(and(eq(products.listingState, 'live'), eq(products.type, 'flea-market')))
		]);

		const value = {
			all: Number(allResult[0]?.value ?? 0),
			products: Number(productsResult[0]?.value ?? 0),
			spares: Number(sparesResult[0]?.value ?? 0),
			flea_market: Number(fleaResult[0]?.value ?? 0)
		};
		categoryCountsCache.set('all', value);
		return value;
	}

	async function loadRecentByType(type: string, limit = HOME_RECENT_LIMIT): Promise<ProductView[]> {
		return selectProductsWithUsers(eq(products.type, type), desc(products.createdAt), limit);
	}

	return {
		async getConstant(key) {
			const cacheKey = `constant:${key}`;
			const cached = constantsCache.get(cacheKey);
			if (cached) return cached;

			const [row] = await db.select().from(constants).where(eq(constants.key, key)).limit(1);
			if (!row || row.key == null) return null;

			const response = { key: row.key, value: row.value };
			constantsCache.set(cacheKey, response);
			return response;
		},

		async getHomeCatalog() {
			const cached = homeCatalogCache.get('home');
			if (cached) return cached;

			const [
				recentProducts,
				recentSpares,
				recentFleaMarket,
				bannersConstant,
				listingsResult,
				makersResult,
				usersResult
			] = await Promise.all([
				loadRecentByType('product'),
				loadRecentByType('spare'),
				loadRecentByType('flea-market'),
				db.select().from(constants).where(eq(constants.key, 'BANNERS')).limit(1),
				db.select({ value: count() }).from(products).where(eq(products.listingState, 'live')),
				db.select({ value: count() }).from(makers).where(eq(makers.approvedState, 'approved')),
				db.select({ value: count() }).from(users)
			]);

			let featuredProducts: ProductView[] = [];
			const banners = bannersConstant[0]?.value as { url: string }[] | undefined;
			const bannerProductIds =
				banners
					?.map((banner) => parseProductIdFromBannerUrl(banner.url))
					.filter((id): id is string => !!id) ?? [];

			if (bannerProductIds.length > 0) {
				const featuredRows = await selectProductsWithUsers(inArray(products.id, bannerProductIds));
				const byId = new Map(featuredRows.map((product) => [product.id, product]));
				featuredProducts = bannerProductIds
					.map((id) => byId.get(id))
					.filter((product): product is ProductView => !!product);
			}

			const featuredIsCurated = featuredProducts.length > 0;

			if (featuredProducts.length === 0 && recentProducts.length > 0) {
				featuredProducts = recentProducts.slice(0, 3);
			}

			if (featuredProducts.length === 0) {
				featuredProducts = await selectProductsWithUsers(undefined, desc(products.createdAt), 3);
			}

			const response: HomeCatalogResponse = {
				recentProducts,
				recentSpares,
				recentFleaMarket,
				featuredProducts,
				featuredIsCurated,
				stats: {
					makers: Number(makersResult[0]?.value ?? 0),
					listings: Number(listingsResult[0]?.value ?? 0),
					users: Number(usersResult[0]?.value ?? 0)
				}
			};

			homeCatalogCache.set('home', response);
			return response;
		},

		async getBrowseCatalog(filters) {
			const tagCatalog = await getTagCatalog();
			const tagGroups = filterBrowsableTagGroups(tagCatalog.groups);
			const standaloneTags = filterBrowsableStandaloneTags(tagCatalog.standalone);
			const allTagOptions = tagCatalog.allOptions;
			const categoryCounts = await getCategoryCounts();

			const activeFilters: BrowseQuery = {
				...filters,
				tag:
					filters.tag && allTagOptions.some((option) => option.key === filters.tag)
						? filters.tag
						: undefined
			};

			const where = and(...buildBrowseConditions(activeFilters, allTagOptions));
			const [countResult] = await db.select({ value: count() }).from(products).where(where);
			const totalCount = Number(countResult?.value ?? 0);
			const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 0;
			const currentPage = totalPages > 0 ? Math.min(activeFilters.page, totalPages) : 1;
			const offset = (currentPage - 1) * PAGE_SIZE;

			const reviewStats = reviewStatsSubquery();
			const interestStats = interestStatsSubquery(db);
			const rows = await db
				.select(selectProductColumns(reviewStats, interestStats))
				.from(products)
				.leftJoin(users, eq(products.uid, users.id))
				.leftJoin(reviewStats, eq(reviewStats.productId, products.id))
				.leftJoin(interestStats, eq(interestStats.productId, products.id))
				.where(where)
				.orderBy(browseOrderBy(activeFilters.sort))
				.limit(PAGE_SIZE)
				.offset(offset);

			return {
				products: rows.map(mapQueryRow),
				totalCount,
				currentPage,
				totalPages,
				filters: { ...activeFilters, page: currentPage },
				categoryCounts,
				tagGroups,
				standaloneTags,
				allTagOptions
			};
		},

		async getProduct(productId) {
			const rows = await selectProductsWithUsers(eq(products.id, productId));
			const product = rows[0];
			if (!product) return null;

			let makerCraftCount = 0;
			let maker: ProductMakerInfo | null = null;
			if (product.uid) {
				const [countRows, makerInfo] = await Promise.all([
					db
						.select({ value: count() })
						.from(products)
						.where(and(eq(products.uid, product.uid), eq(products.listingState, 'live'))),
					getMakerInfo(product.uid)
				]);
				makerCraftCount = Number(countRows[0]?.value ?? 0);
				maker = makerInfo;
			}

			return { product, makerCraftCount, maker };
		},

		async getProductReviews(productId) {
			const rows = await db
				.select({
					review: reviews,
					user: {
						username: users.username,
						tier: users.tier
					}
				})
				.from(reviews)
				.leftJoin(users, eq(reviews.userId, users.id))
				.where(eq(reviews.productId, productId))
				.orderBy(desc(reviews.createdAt));

			return {
				reviews: rows.map(({ review, user }) => mapReviewRow(review, user))
			};
		},

		async getProductVariants(productId) {
			const detail = await this.getProduct(productId);
			if (!detail) return null;

			const product = detail.product;
			const currentVariant = {
				id: product.id,
				label: product.name,
				href: productHref(product.name, product.id)
			};

			if (product.type === 'product') {
				const siblings = await selectProductsWithUsers(eq(products.rel, product.id));
				if (siblings.length === 0) {
					return { variants: [] };
				}

				return {
					variants: [
						currentVariant,
						...siblings.map((item) => ({
							id: item.id,
							label: item.name,
							href: productHref(item.name, item.id)
						}))
					]
				};
			}

			if (!product.rel) {
				return { variants: [] };
			}

			const [parentRows, siblingRows] = await Promise.all([
				selectProductsWithUsers(eq(products.id, product.rel)),
				selectProductsWithUsers(eq(products.rel, product.rel))
			]);

			const options: ProductVariantsResponse['variants'] = [];
			const parent = parentRows[0];
			if (parent) {
				options.push({
					id: parent.id,
					label: parent.name,
					href: productHref(parent.name, parent.id)
				});
			}

			for (const item of siblingRows) {
				if (!options.some((option) => option.id === item.id)) {
					options.push({
						id: item.id,
						label: item.name,
						href: productHref(item.name, item.id)
					});
				}
			}

			if (!options.some((option) => option.id === product.id)) {
				options.push(currentVariant);
			}

			return { variants: options };
		},

		async getRelatedProducts(productId) {
			const detail = await this.getProduct(productId);
			if (!detail) return null;

			const product = detail.product;
			const seen = new Set<string>([product.id]);
			const related: ProductView[] = [];

			const addUnique = (items: ProductView[]) => {
				for (const item of items) {
					if (related.length >= RELATED_LIMIT) return;
					if (!item?.id || seen.has(item.id)) continue;
					seen.add(item.id);
					related.push(item);
				}
			};

			if (product.type === 'product') {
				addUnique(await selectProductsWithUsers(eq(products.rel, product.id)));
			} else if (product.rel) {
				const [parentRows, siblingRows] = await Promise.all([
					selectProductsWithUsers(eq(products.id, product.rel)),
					selectProductsWithUsers(eq(products.rel, product.rel))
				]);
				if (parentRows[0]) addUnique([parentRows[0]]);
				addUnique(siblingRows);
			}

			if (related.length < RELATED_LIMIT && product.uid) {
				addUnique(
					await selectProductsWithUsers(
						and(eq(products.uid, product.uid), sql`${products.id} <> ${product.id}`),
						desc(products.createdAt),
						RELATED_LIMIT + 5
					)
				);
			}

			if (related.length < RELATED_LIMIT && product.type) {
				addUnique(
					await selectProductsWithUsers(
						and(eq(products.type, product.type), sql`${products.id} <> ${product.id}`),
						desc(products.createdAt),
						RELATED_LIMIT + 5
					)
				);
			}

			if (related.length < RELATED_LIMIT) {
				addUnique(
					await selectProductsWithUsers(
						sql`${products.id} <> ${product.id}`,
						desc(products.createdAt),
						RELATED_LIMIT + 5
					)
				);
			}

			return { products: related };
		}
	};
}

export function normalizeBrowseTagParam(raw: string | null | undefined): string | null {
	if (!raw?.trim()) return null;
	if (raw.includes('/')) {
		const [parent, child] = raw.split('/');
		return `${normalizeTagKey(parent)}/${normalizeTagKey(child)}`;
	}
	return normalizeTagKey(raw);
}
