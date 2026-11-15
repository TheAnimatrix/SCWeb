import { expect, test } from '@playwright/test';

test('cart page renders empty state or API error without crashing', async ({ page }) => {
	await page.goto('/cart');

	await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();

	const emptyState = page.getByText('Your cart is empty.');
	const apiError = page.getByText("Your cart didn't load.");

	await expect(emptyState.or(apiError).first()).toBeVisible();
});
