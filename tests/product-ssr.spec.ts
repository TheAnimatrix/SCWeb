import { expect, test } from '@playwright/test';

test('product detail direct load (SSR cold load)', async ({ page }) => {
	await page.goto('/');

	const featured = page.getByRole('region', { name: 'Featured crafts' });
	await expect(featured).toBeVisible();

	const productName = await featured.getByRole('heading', { level: 2 }).innerText();
	const productLink = featured.locator('a[href*="/craft/item="]:not([aria-hidden="true"])').first();
	const href = await productLink.getAttribute('href');
	expect(href).toBeTruthy();

	const response = await page.goto(href!);
	expect(response?.status()).toBe(200);
	await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible();
});

test('3dp portal direct load (SSR)', async ({ page }) => {
	const response = await page.goto('/3dp-portal');
	expect(response?.status()).toBe(200);
	await expect(page.getByRole('heading', { name: 'Community 3D Printing' })).toBeVisible();
});
