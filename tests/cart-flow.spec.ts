import { expect, test } from '@playwright/test';
import { dbReady } from './helpers';

test.describe('cart flow (requires DB + API)', () => {
	test.skip(!dbReady, 'Skipped unless E2E_DB_READY=1');

	test('guest add-to-cart, quantity change, remove, and checkout guard', async ({ page }) => {
		await page.goto('/');

		const featured = page.getByRole('region', { name: 'Featured listings' });
		await expect(featured).toBeVisible();
		await featured.getByRole('link').first().click();
		await page.waitForURL(/\/craft\/item=/);

		await page.getByRole('button', { name: 'Add to cart' }).first().click();
		await expect(page.getByText(/Added \d+ to your cart/)).toBeVisible({ timeout: 10_000 });

		await page.goto('/cart');
		await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
		await expect(page.getByRole('button', { name: /^Increase quantity/ })).toBeVisible();

		await page.getByRole('button', { name: /^Increase quantity/ }).click();
		await page.waitForTimeout(600);

		await page.getByRole('button', { name: /^Remove / }).click();
		await expect(page.getByText('Your cart is empty.')).toBeVisible({ timeout: 10_000 });

		await page.goto('/checkout');
		await expect(page).toHaveURL(/\/cart$/);
	});

	test('checkout guard passes when cart has items', async ({ page }) => {
		await page.goto('/');

		const featured = page.getByRole('region', { name: 'Featured listings' });
		await featured.getByRole('link').first().click();
		await page.getByRole('button', { name: 'Add to cart' }).first().click();
		await expect(page.getByText(/Added \d+ to your cart/)).toBeVisible({ timeout: 10_000 });

		await page.goto('/checkout');
		await expect(page).not.toHaveURL(/\/cart$/);
		await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible();
	});
});
