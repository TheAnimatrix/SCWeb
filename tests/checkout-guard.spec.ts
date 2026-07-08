import { expect, test } from '@playwright/test';

test('checkout guards when cart is empty or unavailable', async ({ page }) => {
	await page.goto('/checkout');

	const onCart = page.getByRole('heading', { name: 'Your cart' });
	const checkoutApiError = page.getByText('Could not load your cart');

	await expect(onCart.or(checkoutApiError)).toBeVisible();
});
