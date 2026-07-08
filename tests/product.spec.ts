import { expect, test } from '@playwright/test';

test('navigate from home to product detail', async ({ page }) => {
	await page.goto('/');

	const featured = page.getByRole('region', { name: 'Featured crafts' });
	await expect(featured).toBeVisible();

	const productName = await featured.getByRole('heading', { level: 2 }).innerText();
	await featured.getByRole('link').first().click();
	await page.waitForURL(/\/craft\/item=/);

	await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible();
	await expect(page.getByText(/^₹[\d,]+$/).first()).toBeVisible();
	await expect(page.getByRole('button', { name: 'add_to_cart' })).toBeVisible();
});
