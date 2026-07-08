import { expect, test } from '@playwright/test';

test('cart page renders empty state or API error without crashing', async ({ page }) => {
	await page.goto('/cart');

	await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();

	const emptyState = page.getByRole('heading', { name: 'Nothing here yet' });
	const apiError = page.getByText('Could not load your cart');

	await expect(emptyState.or(apiError)).toBeVisible();
});
