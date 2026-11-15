import { expect, test } from '@playwright/test';

test('profile account page redirects unauthenticated users to sign in', async ({ page }) => {
	await page.goto('/user/profile/account');

	await expect(page).toHaveURL(/\/user\/sign\?postLogin=/);
	await expect(page.getByRole('heading', { name: 'Sign in to SelfCrafted' })).toBeVisible();
});

test('the maker printing area sends unauthenticated users to sign in', async ({ page }) => {
	// /3dp-portal/maker forwards to /portal/printing, which needs an account.
	await page.goto('/3dp-portal/maker');

	await expect(page).toHaveURL(/\/user\/sign\?postLogin=%2Fportal%2Fprinting$/);
	await expect(page.getByRole('heading', { name: 'Sign in to Selfcrafted' })).toBeVisible();
});

test('the 3D printing page is open to signed-out visitors', async ({ page }) => {
	await page.goto('/3dp-portal');

	await expect(page.getByRole('heading', { name: '3D printing', exact: true })).toBeVisible();
});
