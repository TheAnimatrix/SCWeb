import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('sc-pwa-install-dismissed', Date.now().toString());
	});
});

test('readers can open a post and return to the blog', async ({ page }) => {
	await page.goto('/blog');
	await expect(page).toHaveTitle('Blog | Selfcrafted India');
	await expect(page.getByRole('heading', { name: 'Blog', exact: true, level: 1 })).toBeVisible();
	await expect(
		page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Blog' })
	).toHaveAttribute('aria-current', 'page');

	const stories = page.getByRole('region', { name: 'Posts' });
	await expect(stories.locator('article')).toHaveCount(4);

	const story = stories.locator('article').first();
	const title = (await story.getByRole('heading').innerText()).trim();
	const href = await story.getByRole('link').getAttribute('href');
	expect(href).toMatch(/^\/blog\/[a-z0-9-]+$/);
	await story.getByRole('link').click();
	await expect(page).toHaveURL(new RegExp(`${href}$`));
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
	const cover = page.locator('article figure img').first();
	await expect(cover).toBeVisible();
	await expect
		.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth))
		.toBeGreaterThan(0);
	await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
	await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute(
		'content',
		/^\d{4}-\d{2}-\d{2}T/
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		new RegExp(`${href}$`)
	);
	const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
	expect(structuredData.some((value) => JSON.parse(value)['@type'] === 'BlogPosting')).toBe(true);
	await page
		.getByRole('link', { name: /all posts/i })
		.first()
		.click();
	await expect(page).toHaveURL(/\/blog$/);
});

test('blog works on narrow screens and in both themes', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/blog');
	await expect(page).toHaveTitle('Blog | Selfcrafted India');
	await page.getByRole('button', { name: 'Open menu', exact: true }).click();
	const navigation = page.getByRole('dialog', { name: 'Mobile navigation' });
	await expect(navigation.getByRole('link', { name: 'Blog', exact: true })).toBeVisible();
	await navigation.getByRole('button', { name: 'Switch to light mode' }).click();
	await expect(page.locator('html')).toHaveClass(/light/);
	await navigation.getByRole('link', { name: 'Blog', exact: true }).click();
	await expect(navigation).not.toBeVisible();
	const stories = page.getByRole('region', { name: 'Posts' });
	await expect(stories.locator('article')).toHaveCount(4);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await stories.locator('article').first().getByRole('link').click();
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.setViewportSize({ width: 768, height: 1024 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('articles are server rendered and unknown slugs return 404', async ({ request }) => {
	const index = await request.get('/blog');
	expect(index.status()).toBe(200);
	const html = await index.text();
	const paths = [
		...new Set([...html.matchAll(/href="\.?(\/blog\/[a-z0-9-]+)"/g)].map((match) => match[1]))
	];
	expect(paths).toHaveLength(4);
	expect(paths).toEqual(
		expect.arrayContaining([
			'/blog/what-to-document-before-you-ship-your-first-build',
			'/blog/a-useful-part-deserves-a-second-life',
			'/blog/why-india-needs-selfcrafted',
			'/blog/a-product-studio-for-the-ai-era'
		])
	);
	for (const path of paths) {
		const response = await request.get(path);
		expect(response.status()).toBe(200);
		const article = await response.text();
		expect(article).toContain('BlogPosting');
		expect(article).toContain('property="og:type" content="article"');
		const imagePath = article.match(/src="(\/images\/blog\/[^"]+)"/)?.[1];
		expect(imagePath).toBeTruthy();
		const image = await request.get(imagePath!);
		expect(image.status()).toBe(200);
		expect(image.headers()['content-type']).toMatch(/^image\//);
	}
	const missing = await request.get('/blog/this-story-does-not-exist');
	expect(missing.status()).toBe(404);
});
