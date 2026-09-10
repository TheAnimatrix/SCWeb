export type BlogCategory = 'Perspectives' | 'Field notes' | 'Guides';

export interface BlogImage {
	src: string;
	alt: string;
	width: number;
	height: number;
	caption?: string;
}

export type BlogBlock =
	| {
			type: 'paragraph' | 'heading' | 'quote';
			text: string;
			links?: Array<{ label: string; href: string }>;
	  }
	| { type: 'list'; items: string[] };

export interface BlogPost {
	slug: string;
	title: string;
	excerpt: string;
	category: BlogCategory;
	publishedAt: string;
	readingMinutes: number;
	cover?: BlogImage;
	body: BlogBlock[];
}

export function formatPostDate(date: string): string {
	return new Intl.DateTimeFormat('en-IN', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(`${date}T00:00:00.000Z`));
}
