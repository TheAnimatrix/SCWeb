import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { eq, inArray } from 'drizzle-orm';
import type { CheckoutAddress } from '../contracts/address.js';
import type { CheckoutOrderAddresses } from '../contracts/checkout.js';
import type { Database } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { getSiteUrl, type Env } from '../env.js';
import { storeLog } from '../middleware/logging.js';
import { createEmailService, type EmailMessage, type EmailService } from './email.js';

export type RenderedEmail = Pick<EmailMessage, 'subject' | 'html' | 'text'>;

export type MailService = {
	readonly isConfigured: boolean;
	readonly ordersInbox: string;
	readonly env: Env;
	readonly siteUrl: string;
	send(to: string | null | undefined, email: RenderedEmail, meta?: Record<string, unknown>): void;
	sendToMany(
		recipients: Iterable<string | null | undefined>,
		email: RenderedEmail,
		meta?: Record<string, unknown>
	): void;
	dispatch(event: string, task: () => Promise<void>): void;
	resolveUserEmail(
		userId: string | null | undefined,
		address?: unknown
	): Promise<string | null>;
	resolveUserEmails(userIds: string[]): Promise<Map<string, string>>;
};

function asOrderAddresses(stored: unknown): CheckoutOrderAddresses | null {
	if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
		return null;
	}

	const record = stored as Record<string, unknown>;
	if ('shipping' in record && 'billing' in record) {
		return {
			shipping: record.shipping as CheckoutAddress,
			billing: record.billing as CheckoutAddress
		};
	}

	return {
		shipping: stored as CheckoutAddress,
		billing: stored as CheckoutAddress
	};
}

function createAdminClient(env: Env): SupabaseClient | null {
	if (!env.SUPABASE_SERVICE_ROLE_KEY) {
		return null;
	}

	return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

export function createMailService(
	env: Env,
	db: Database,
	transport: EmailService = createEmailService(env)
): MailService {
	const siteUrl = getSiteUrl(env);
	const ordersInbox = env.ORDERS_INBOX_EMAIL;
	let adminClient: SupabaseClient | null | undefined;

	function getAdminClient(): SupabaseClient | null {
		if (adminClient === undefined) {
			adminClient = createAdminClient(env);
		}
		return adminClient;
	}

	async function lookupAuthEmail(userId: string): Promise<string | null> {
		const admin = getAdminClient();
		if (!admin) {
			return null;
		}

		const { data, error } = await admin.auth.admin.getUserById(userId);
		if (error) {
			storeLog('warn', 'mail.auth_lookup_failed', {
				userId,
				error: error.message
			});
			return null;
		}

		return data.user?.email ?? null;
	}

	return {
		isConfigured: transport.isConfigured,
		ordersInbox,
		env,
		siteUrl,

		send(to, email, meta) {
			if (!to) {
				storeLog('warn', 'mail.skipped', {
					reason: 'missing_recipient',
					subject: email.subject,
					...meta
				});
				return;
			}

			transport.sendSafe({
				to,
				subject: email.subject,
				html: email.html,
				text: email.text
			});
		},

		sendToMany(recipients, email, meta) {
			const uniqueRecipients = [
				...new Set(
					[...recipients].filter((recipient): recipient is string => Boolean(recipient))
				)
			];

			if (uniqueRecipients.length === 0) {
				storeLog('warn', 'mail.skipped', {
					reason: 'no_recipients',
					subject: email.subject,
					...meta
				});
				return;
			}

			for (const to of uniqueRecipients) {
				this.send(to, email, meta);
			}
		},

		dispatch(event, task) {
			void task().catch((error) => {
				storeLog('error', 'mail.dispatch_failed', {
					event,
					error: error instanceof Error ? error.message : String(error)
				});
			});
		},

		async resolveUserEmail(userId, address) {
			if (userId) {
				const [user] = await db
					.select({ email: users.email })
					.from(users)
					.where(eq(users.id, userId))
					.limit(1);

				if (user?.email) {
					return user.email;
				}

				const authEmail = await lookupAuthEmail(userId);
				if (authEmail) {
					return authEmail;
				}
			}

			const addresses = asOrderAddresses(address);
			return addresses?.shipping.email ?? addresses?.billing.email ?? null;
		},

		async resolveUserEmails(userIds) {
			const uniqueIds = [...new Set(userIds.filter(Boolean))];
			if (uniqueIds.length === 0) {
				return new Map();
			}

			const rows = await db
				.select({ id: users.id, email: users.email })
				.from(users)
				.where(inArray(users.id, uniqueIds));

			const emails = new Map(
				rows
					.filter((row): row is { id: string; email: string } => Boolean(row.email))
					.map((row) => [row.id, row.email])
			);

			const missingIds = uniqueIds.filter((id) => !emails.has(id));
			for (const userId of missingIds) {
				const authEmail = await lookupAuthEmail(userId);
				if (authEmail) {
					emails.set(userId, authEmail);
				}
			}

			return emails;
		}
	};
}
