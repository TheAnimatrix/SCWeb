import { error } from '@sveltejs/kit';
import { posts } from '$lib/blog/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const post = posts.find((candidate) => candidate.slug === params.slug);

	if (!post) {
		error(404, 'Article not found');
	}

	const related = posts
		.filter((candidate) => candidate.slug !== post.slug)
		.sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
		.slice(0, 2)
		.map(({ slug, title, excerpt, category, publishedAt, readingMinutes, cover }) => ({
			slug,
			title,
			excerpt,
			category,
			publishedAt,
			readingMinutes,
			cover
		}));

	return { post, related };
};
