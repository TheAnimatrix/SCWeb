import { expect, test } from '@playwright/test';

test('home page renders header and product listings', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Parts, products & people.' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Fresh listings' })).toBeVisible();
});
