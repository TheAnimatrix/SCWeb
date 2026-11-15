export type BlogCategory = 'Notes' | 'Guides';

export interface BlogImage {
	src: string;
	alt: string;
	width: number;
	height: number;
	caption?: string;
	/** Who made the image, or how. Shown under it. Always set this for generated images. */
	credit?: string;
	/**
	 * True for black-on-transparent line art. It is inverted in the dark theme so it reads as
	 * part of the page, not as a pale slab.
	 */
	lineArt?: boolean;
	/** Opaque 1200x630 version for link previews. Needed when `src` is transparent. */
	ogSrc?: string;
}

export type BlogBlock =
	| {
			type: 'paragraph' | 'heading' | 'quote';
			text: string;
			/** For a quote: the person who said it. Leave quotes out if nobody did. */
			attribution?: string;
			/** Links shown under a paragraph. Paths starting with "/" stay on this site. */
			links?: Array<{ label: string; href: string }>;
	  }
	| { type: 'list'; items: string[] };

export interface BlogPost {
	slug: string;
	title: string;
	excerpt: string;
	category: BlogCategory;
	/** The day the post first went live (YYYY-MM-DD). Don't backdate. */
	publishedAt: string;
	/** Set when the text is changed in a way readers should know about. */
	updatedAt?: string;
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
