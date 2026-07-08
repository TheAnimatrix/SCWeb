import { expect, test } from '@playwright/test';

test('rejects protocol-relative postLogin redirect targets', async ({ page }) => {
	await page.goto('/user/sign?postLogin=//evil.com');

	await expect(page.getByRole('heading', { name: 'Sign in to SelfCrafted' })).toBeVisible();

	const stored = await page.evaluate(() => localStorage.getItem('postLoginURL'));
	expect(stored).toBeNull();
});
