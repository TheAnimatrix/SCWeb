import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('sc-pwa-install-dismissed', Date.now().toString());
	});
});

test('LorNode docs overview renders a heading and the sidebar nav', async ({ page }) => {
	await page.goto('/docs/lornode');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('LorNode V2');
	const sidebar = page.getByRole('navigation', { name: 'LorNode V2 docs', exact: true });
	await expect(sidebar).toBeVisible();
	await expect(sidebar.getByRole('link', { name: 'Overview' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(sidebar.getByRole('link', { name: 'Pinout' })).toHaveAttribute(
		'href',
		'/docs/lornode/pinout'
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/docs\/lornode$/);
	const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
	expect(structuredData.some((value) => JSON.parse(value)['@type'] === 'TechArticle')).toBe(true);
});

test('pinout page shows the pinout diagram from /images/lornode/', async ({ page, request }) => {
	await page.goto('/docs/lornode/pinout');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pinout');
	const diagram = page.locator('article img').first();
	await expect(diagram).toHaveAttribute('src', /^\/images\/lornode\//);
	const src = await diagram.getAttribute('src');
	const image = await request.get(src!);
	expect(image.status()).toBe(200);
	expect(image.headers()['content-type']).toMatch(/^image\//);
});

test('unknown docs pages and products return 404', async ({ request }) => {
	expect((await request.get('/docs/lornode/nope')).status()).toBe(404);
	expect((await request.get('/docs/nope')).status()).toBe(404);
});

test('docs index lists LorNode', async ({ page }) => {
	await page.goto('/docs');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Product docs');
	const card = page.getByRole('link', { name: /LorNode V2/ });
	await expect(card).toHaveAttribute('href', '/docs/lornode');
	await card.click();
	await expect(page).toHaveURL(/\/docs\/lornode$/);
});
