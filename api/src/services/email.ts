import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getSiteUrl, isSmtpConfigured, type Env } from '../env.js';
import { storeLog } from '../middleware/logging.js';

export type EmailMessage = {
	to: string;
	subject: string;
	html: string;
	text: string;
};

export type EmailService = {
	isConfigured: boolean;
	send(message: EmailMessage): Promise<void>;
	sendSafe(message: EmailMessage): void;
};

export function createEmailService(env: Env): EmailService {
	const configured = isSmtpConfigured(env);
	let transporter: Transporter | null = null;

	if (configured) {
		const secure = env.SMTP_SECURE || env.SMTP_PORT === 465;
		transporter = nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure,
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
	}

	const service: EmailService = {
		isConfigured: configured,

		async send(message) {
			if (!configured || !transporter) {
				storeLog('info', 'email.skipped', {
					reason: 'smtp_not_configured',
					to: message.to,
					subject: message.subject
				});
				return;
			}

			await transporter.sendMail({
				from: env.EMAIL_FROM,
				to: message.to,
				subject: message.subject,
				html: message.html,
				text: message.text
			});

			storeLog('info', 'email.sent', {
				to: message.to,
				subject: message.subject
			});
		},

		sendSafe(message) {
			void service.send(message).catch((error) => {
				storeLog('error', 'email.failed', {
					to: message.to,
					subject: message.subject,
					error: error instanceof Error ? error.message : String(error)
				});
			});
		}
	};

	return service;
}

export function getEmailSiteUrl(env: Env): string {
	return getSiteUrl(env);
}
