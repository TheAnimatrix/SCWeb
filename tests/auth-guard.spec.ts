import { expect, test } from '@playwright/test';

test('profile account page redirects unauthenticated users to sign in', async ({ page }) => {
	await page.goto('/user/profile/account');

	await expect(page).toHaveURL(/\/user\/sign\?postLogin=/);
	await expect(page.getByRole('heading', { name: 'Sign in to SelfCrafted' })).toBeVisible();
});

test('3dp-portal authenticated area blocks unauthenticated users', async ({ page }) => {
	await page.goto('/3dp-portal/maker');

	await expect(page).toHaveURL(/\/3dp-portal\/?$/);
	await expect(page.getByRole('heading', { name: 'Community 3D Printing' })).toBeVisible();
});
