import { posts } from '$lib/blog/posts';
import { formatPostDate } from '$lib/blog/types';

export const load = () => ({
	posts: [...posts]
		.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
		.map(({ slug, title, excerpt, category, publishedAt, readingMinutes, cover }) => ({
			slug,
			title,
			excerpt,
			category,
			publishedAt,
			publishedLabel: formatPostDate(publishedAt),
			readingMinutes,
			cover
		}))
});
