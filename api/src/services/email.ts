import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getSiteUrl, isSmtpConfigured, resolveSmtpSecure, type Env } from '../env.js';
import { storeLog } from '../middleware/logging.js';
import {
	createSendQueue,
	DEFAULT_SMTP_MIN_SEND_INTERVAL_MS,
	isSmtpRateLimitError
} from './email-send-queue.js';

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

export function createEmailService(
	env: Env,
	options?: { minSendIntervalMs?: number }
): EmailService {
	const configured = isSmtpConfigured(env);
	let transporter: Transporter | null = null;
	const minSendIntervalMs =
		options?.minSendIntervalMs ??
		(env.NODE_ENV === 'test' ? 0 : DEFAULT_SMTP_MIN_SEND_INTERVAL_MS);
	const enqueueSend = createSendQueue(minSendIntervalMs);

	if (configured) {
		const secure = resolveSmtpSecure(env);
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

		storeLog('info', 'email.transport', {
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure,
			smtpSecureEnv: env.SMTP_SECURE
		});
	}

	async function deliver(message: EmailMessage, attempt = 1): Promise<void> {
		if (!configured || !transporter) {
			storeLog(env.NODE_ENV === 'production' ? 'error' : 'info', 'email.skipped', {
				reason: 'smtp_not_configured',
				to: message.to,
				subject: message.subject,
				hasHost: Boolean(env.SMTP_HOST),
				hasPass: Boolean(env.SMTP_PASS)
			});
			return;
		}

		try {
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
		} catch (error) {
			if (attempt === 1 && isSmtpRateLimitError(error)) {
				storeLog('warn', 'email.rate_limited', {
					to: message.to,
					subject: message.subject,
					retryInMs: DEFAULT_SMTP_MIN_SEND_INTERVAL_MS
				});
				await new Promise((resolve) =>
					setTimeout(resolve, DEFAULT_SMTP_MIN_SEND_INTERVAL_MS)
				);
				return deliver(message, 2);
			}

			throw error;
		}
	}

	const service: EmailService = {
		isConfigured: configured,

		async send(message) {
			await enqueueSend(() => deliver(message));
		},

		sendSafe(message) {
			void enqueueSend(() => deliver(message)).catch((error) => {
				storeLog('error', 'email.failed', {
					to: message.to,
					subject: message.subject,
					host: env.SMTP_HOST,
					port: env.SMTP_PORT,
					secure: resolveSmtpSecure(env),
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
