import { expect, test } from '@playwright/test';

test('navigate from home to product detail', async ({ page }) => {
	await page.goto('/');

	const featured = page.getByRole('region', { name: 'Featured listings' });
	await expect(featured).toBeVisible();

	// The carousel autoplays. Hovering the active slide pauses it, so the name we read and the
	// link we click belong to the same product.
	const productLink = featured.locator('a[href*="/craft/item="]:not([aria-hidden="true"])').first();
	await productLink.hover();
	const productName = await productLink.getByRole('heading', { level: 2 }).innerText();
	await productLink.click();
	await page.waitForURL(/\/craft\/item=/);

	await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible();
	await expect(page.getByText(/^₹[\d,]+$/).first()).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible();
});
