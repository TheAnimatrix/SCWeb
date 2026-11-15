import { expect, test } from '@playwright/test';

test('home page renders header and product listings', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
	await expect(
		page.getByRole('heading', { name: "Hardware from India's independent makers." })
	).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Products', exact: true, level: 2 })
	).toBeVisible();
});
