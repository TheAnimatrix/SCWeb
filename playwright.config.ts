import { defineConfig, devices } from '@playwright/test';

const port = 5173;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	timeout: 60_000,
	expect: { timeout: 15_000 },
	use: {
		...devices['Desktop Chrome'],
		baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run dev',
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			...process.env,
			E2E_DB_READY: process.env.E2E_DB_READY ?? ''
		}
	}
});
