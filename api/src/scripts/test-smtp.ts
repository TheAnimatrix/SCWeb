import nodemailer from 'nodemailer';
import { loadEnvFiles } from '../loadEnvFiles.js';
import { getSiteUrl, loadEnv } from '../env.js';

loadEnvFiles();
process.env.DATABASE_URL ??= process.env.POSTGRES_URL;
process.env.SMTP_PASS ??= process.env.SMTP_PASSWORD;

const env = loadEnv();
const to = process.env.SMTP_TEST_TO ?? 'support@selfcrafted.in';

const profiles = [
	{
		label: 'configured',
		port: env.SMTP_PORT,
		secure: env.SMTP_SECURE || env.SMTP_PORT === 465
	},
	...(env.SMTP_PORT === 465
		? [{ label: 'fallback-587-starttls', port: 587, secure: false }]
		: [])
];

console.log(
	JSON.stringify(
		{
			host: env.SMTP_HOST,
			from: env.EMAIL_FROM,
			to,
			siteUrl: getSiteUrl(env)
		},
		null,
		2
	)
);

for (const profile of profiles) {
	console.log(`\n--- Trying ${profile.label} (port ${profile.port}, secure=${profile.secure}) ---`);

	const transport = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: profile.port,
		secure: profile.secure,
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 15_000,
		auth:
			env.SMTP_USER && env.SMTP_PASS
				? {
						user: env.SMTP_USER,
						pass: env.SMTP_PASS
					}
				: undefined
	});

	try {
		await transport.verify();
		console.log('verify: ok');

		const info = await transport.sendMail({
			from: env.EMAIL_FROM,
			to,
			subject: `[SMTP test:${profile.label}] Selfcrafted mail check`,
			text: `SMTP profile ${profile.label} succeeded at ${new Date().toISOString()}.`
		});

		console.log('sent:', info.messageId);
		transport.close();
		process.exit(0);
	} catch (error) {
		console.error(
			'failed:',
			error instanceof Error ? `${error.name}: ${error.message}` : String(error)
		);
		transport.close();
	}
}

process.exit(1);
