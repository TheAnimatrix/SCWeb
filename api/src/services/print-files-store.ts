import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { eq, sql, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Env } from '../env.js';
import type { Database } from '../db/index.js';
import { printrequests } from '../db/schema/printrequests.js';
import type { MailService } from './mail.js';
import { notifyPrintQuoteRequested } from './order-notifications.js';
import {
	buildModelPath,
	buildStorageKey,
	canAccessPrintRequest,
	DEFAULT_DAILY_QUOTA,
	MODELS_BUCKET,
	SIGNED_URL_EXPIRY_SECONDS,
	signedUrlExpiresAt,
	storagePathToBucketKey
} from './print-files.js';

export type PrintModelDataInput = {
	color: string;
	material: string;
	quality: string;
	scale: string;
	infill: string;
};

export type PrintRequestRow = {
	id: string;
	user_id: string | null;
	creator_id: string | null;
	model: string | null;
	model_metadata: unknown;
	model_data: unknown;
	request_stage: string | null;
	created_at: string;
};

export type UploadPrintFileInput = {
	userId: string;
	makerId: string;
	originalFilename: string;
	fileBytes: Uint8Array;
	modelData: PrintModelDataInput;
};

export type UploadPrintFileResult =
	| { ok: true; printRequest: PrintRequestRow }
	| { ok: false; status: 429; body: { error: 'quota_exceeded' } }
	| { ok: false; status: 500; body: { error: 'upload_failed' } };

export type DownloadUrlResult =
	| { ok: true; url: string; expiresAt: string }
	| { ok: false; status: 404; body: { error: 'not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 500; body: { error: 'signed_url_failed' } };

export interface PrintFilesStorage {
	upload(
		bucketKey: string,
		data: Uint8Array,
		contentType: string
	): Promise<{ ok: true } | { ok: false; message: string }>;
	remove(bucketKey: string): Promise<{ ok: true } | { ok: false; message: string }>;
	createSignedUrl(
		bucketKey: string,
		expiresInSeconds: number
	): Promise<{ ok: true; signedUrl: string } | { ok: false; message: string }>;
}

export interface PrintFilesStore {
	uploadPrintFile(input: UploadPrintFileInput): Promise<UploadPrintFileResult>;
	getDownloadUrl(actorUserId: string, printRequestId: string): Promise<DownloadUrlResult>;
}

export type PrintFilesStoreOptions = {
	mail?: MailService;
};

export function isFilesConfigured(env: Env): boolean {
	return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseStorage(env: Env): PrintFilesStorage {
	const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY!);
	return createStorageFromClient(client);
}

export function createStorageFromClient(client: SupabaseClient): PrintFilesStorage {
	return {
		async upload(bucketKey, data, contentType) {
			const { error } = await client.storage.from(MODELS_BUCKET).upload(bucketKey, data, {
				upsert: false,
				contentType
			});

			if (error) {
				return { ok: false, message: error.message };
			}

			return { ok: true };
		},
		async remove(bucketKey) {
			const { error } = await client.storage.from(MODELS_BUCKET).remove([bucketKey]);

			if (error) {
				return { ok: false, message: error.message };
			}

			return { ok: true };
		},
		async createSignedUrl(bucketKey, expiresInSeconds) {
			const { data, error } = await client.storage
				.from(MODELS_BUCKET)
				.createSignedUrl(bucketKey, expiresInSeconds);

			if (error || !data?.signedUrl) {
				return { ok: false, message: error?.message ?? 'missing signed url' };
			}

			return { ok: true, signedUrl: data.signedUrl };
		}
	};
}

async function executeRows<T extends Record<string, unknown>>(
	db: Database,
	query: SQL
): Promise<T[]> {
	const result = await db.execute(query);

	if (Array.isArray(result)) {
		return result as T[];
	}

	if (
		result &&
		typeof result === 'object' &&
		'rows' in result &&
		Array.isArray((result as { rows: unknown }).rows)
	) {
		return (result as { rows: T[] }).rows;
	}

	return [];
}

async function getDailyQuotaLimit(db: Database, userId: string): Promise<number> {
	const result = await executeRows<{ quote_daily_limit: number | null }>(
		db,
		sql`SELECT quote_daily_limit FROM users WHERE id = ${userId} LIMIT 1`
	);

	const row = result[0];
	if (!row || row.quote_daily_limit == null) {
		return DEFAULT_DAILY_QUOTA;
	}

	return row.quote_daily_limit;
}

async function consumeUploadQuota(
	db: Database,
	userId: string,
	limit: number
): Promise<number | null> {
	// Intentional UTC day boundary: CURRENT_DATE uses the database session timezone (UTC).
	const result = await executeRows<{ count: number }>(
		db,
		sql`
		INSERT INTO upload_quota (user_id, quota_date, count)
		SELECT ${userId}, CURRENT_DATE, 1
		WHERE ${limit} >= 1
		ON CONFLICT (user_id, quota_date)
		DO UPDATE SET count = upload_quota.count + 1
		WHERE upload_quota.count < ${limit}
		RETURNING count
	`
	);

	return result[0]?.count ?? null;
}

async function releaseUploadQuota(db: Database, userId: string): Promise<void> {
	await executeRows(
		db,
		sql`
		UPDATE upload_quota
		SET count = GREATEST(count - 1, 0)
		WHERE user_id = ${userId} AND quota_date = CURRENT_DATE
	`
	);
}

function logUploadFailure(event: string, details: Record<string, unknown>): void {
	console.error(JSON.stringify({ level: 'error', event, ...details }));
}

function mapPrintRequestRow(row: typeof printrequests.$inferSelect): PrintRequestRow {
	return {
		id: row.id,
		user_id: row.userId,
		creator_id: row.creatorId,
		model: row.model,
		model_metadata: row.modelMetadata,
		model_data: row.modelData,
		request_stage: row.requestStage,
		created_at: row.createdAt.toISOString()
	};
}

export function createPrintFilesStore(
	db: Database,
	storage: PrintFilesStorage,
	options?: PrintFilesStoreOptions
): PrintFilesStore {
	return {
		async uploadPrintFile(input) {
			const limit = await getDailyQuotaLimit(db, input.userId);
			const quotaCount = await consumeUploadQuota(db, input.userId, limit);

			if (quotaCount === null) {
				return { ok: false, status: 429, body: { error: 'quota_exceeded' } };
			}

			const fileId = randomUUID();
			const storageKey = buildStorageKey(input.userId, fileId);
			const modelPath = buildModelPath(storageKey);

			const uploadResult = await storage.upload(storageKey, input.fileBytes, 'application/sla');

			if (!uploadResult.ok) {
				await releaseUploadQuota(db, input.userId);
				logUploadFailure('print-files.upload.storage_failed', {
					userId: input.userId,
					storageKey,
					message: uploadResult.message,
					quotaReleased: true
				});
				return { ok: false, status: 500, body: { error: 'upload_failed' } };
			}

			try {
				const [inserted] = await db
					.insert(printrequests)
					.values({
						userId: input.userId,
						creatorId: input.makerId,
						model: modelPath,
						modelData: input.modelData,
						modelMetadata: {
							fileName: storageKey,
							originalFilename: input.originalFilename
						},
						requestStage: 'requested'
					})
					.returning();

				if (options?.mail && inserted.userId && inserted.creatorId) {
					notifyPrintQuoteRequested(db, options.mail, inserted.id, {
						userId: inserted.userId,
						creatorId: inserted.creatorId
					});
				}

				return { ok: true, printRequest: mapPrintRequestRow(inserted) };
			} catch (error) {
				const cleanup = await storage.remove(storageKey);
				await releaseUploadQuota(db, input.userId);
				logUploadFailure('print-files.upload.insert_failed', {
					userId: input.userId,
					storageKey,
					error: error instanceof Error ? error.message : String(error),
					quotaReleased: true
				});
				console.error(
					JSON.stringify({
						event: 'orphan_cleanup',
						key: storageKey,
						ok: cleanup.ok,
						...(cleanup.ok ? {} : { message: cleanup.message })
					})
				);
				return { ok: false, status: 500, body: { error: 'upload_failed' } };
			}
		},

		async getDownloadUrl(actorUserId, printRequestId) {
			const [row] = await db
				.select()
				.from(printrequests)
				.where(eq(printrequests.id, printRequestId))
				.limit(1);

			if (!row) {
				return { ok: false, status: 404, body: { error: 'not_found' } };
			}

			if (!canAccessPrintRequest(actorUserId, { user_id: row.userId, creator_id: row.creatorId })) {
				return { ok: false, status: 403, body: { error: 'forbidden' } };
			}

			if (!row.model) {
				return { ok: false, status: 404, body: { error: 'not_found' } };
			}

			const bucketKey = storagePathToBucketKey(row.model);
			const signed = await storage.createSignedUrl(bucketKey, SIGNED_URL_EXPIRY_SECONDS);

			if (!signed.ok) {
				return { ok: false, status: 500, body: { error: 'signed_url_failed' } };
			}

			return {
				ok: true,
				url: signed.signedUrl,
				expiresAt: signedUrlExpiresAt(SIGNED_URL_EXPIRY_SECONDS)
			};
		}
	};
}
