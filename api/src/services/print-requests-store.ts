import { eq, sql } from 'drizzle-orm';
import type {
	PrintRequestActionBody,
	PrintRequestActionResponse
} from '../contracts/print-requests.js';
import type { Database } from '../db/index.js';
import { chat } from '../db/schema/chat.js';
import { printrequests } from '../db/schema/printrequests.js';
import type { Actor } from '../types/context.js';
import type { PrintRequestEvent } from './print-payments.js';
import {
	ACTION_TRANSITIONS,
	appendEvent,
	canTransition,
	isMakerAction,
	isUserAction,
	normalizePrintRequestEvents,
	type PrintRequestAction
} from './print-requests.js';

export type PrintRequestActionResult =
	| { ok: true; response: PrintRequestActionResponse }
	| { ok: false; status: 404; body: { error: 'not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 409; body: { error: 'invalid_transition' } }
	| { ok: false; status: 400; body: { error: 'invalid_payload' } };

export interface PrintRequestsStore {
	performAction(
		actor: Actor,
		printRequestId: string,
		body: PrintRequestActionBody
	): Promise<PrintRequestActionResult>;
}

type PrintRequestRow = typeof printrequests.$inferSelect;

function isMaker(actorId: string, row: PrintRequestRow): boolean {
	return row.creatorId === actorId;
}

function isUser(actorId: string, row: PrintRequestRow): boolean {
	return row.userId === actorId;
}

function assertRole(
	actorId: string,
	row: PrintRequestRow,
	action: PrintRequestAction
): 'maker' | 'user' | null {
	if (action === 'quote' || action === 'decline' || action === 'shipped') {
		return isMaker(actorId, row) ? 'maker' : null;
	}

	if (action === 'complete') {
		return isUser(actorId, row) ? 'user' : null;
	}

	if (action === 'cancel') {
		if (isUser(actorId, row)) return 'user';
		if (isMaker(actorId, row)) return 'maker';
		return null;
	}

	return null;
}

async function insertChatMessage(
	tx: Pick<Database, 'insert'>,
	params: {
		senderId: string;
		recipientId: string;
		relationshipId: string;
		message: string;
		messageType: string;
	}
) {
	await tx.insert(chat).values({
		senderId: params.senderId,
		recipientId: params.recipientId,
		relationshipId: params.relationshipId,
		message: params.message,
		messageType: params.messageType,
		status: 'sent'
	});
}

export function createPrintRequestsStore(db: Database): PrintRequestsStore {
	return {
		async performAction(actor, printRequestId, body) {
			const actorId = actor.userId;
			if (!actorId) {
				return { ok: false, status: 403, body: { error: 'forbidden' } };
			}

			const action = body.action as PrintRequestAction;

			return db.transaction(async (tx) => {
				const [row] = await tx
					.select()
					.from(printrequests)
					.where(eq(printrequests.id, printRequestId))
					.for('update')
					.limit(1);

				if (!row) {
					return { ok: false, status: 404, body: { error: 'not_found' } };
				}

				const role = assertRole(actorId, row, action);
				if (!role) {
					return { ok: false, status: 403, body: { error: 'forbidden' } };
				}

				if (isMakerAction(action) && role !== 'maker') {
					return { ok: false, status: 403, body: { error: 'forbidden' } };
				}

				if (isUserAction(action) && role !== 'user') {
					return { ok: false, status: 403, body: { error: 'forbidden' } };
				}

				const currentStage = row.requestStage;
				if (!canTransition(currentStage, action)) {
					return { ok: false, status: 409, body: { error: 'invalid_transition' } };
				}

				const events = normalizePrintRequestEvents(row.events);
				const timestamp = new Date().toISOString();
				const nextStage = ACTION_TRANSITIONS[action].to;
				let nextEvents = events;
				const userId = row.userId;
				const creatorId = row.creatorId;

				if (!userId || !creatorId) {
					return { ok: false, status: 400, body: { error: 'invalid_payload' } };
				}

				switch (action) {
					case 'quote': {
						if (body.action !== 'quote') break;
						const { payload } = body;
						const quoteEvent: PrintRequestEvent = {
							type: 'quoted',
							reason: payload.reason ?? '',
							timestamp,
							by: 'maker',
							extra: { quote: payload.amount }
						};
						nextEvents = appendEvent(events, quoteEvent);
						await insertChatMessage(tx, {
							senderId: creatorId,
							recipientId: userId,
							relationshipId: printRequestId,
							message: JSON.stringify({
								action: 'quoted',
								reason: payload.reason ?? '',
								quote: payload.amount
							}),
							messageType: 'quote'
						});
						break;
					}
					case 'decline':
					case 'cancel': {
						if (body.action !== 'decline' && body.action !== 'cancel') break;
						const { payload } = body;
						const cancelledBy = role === 'maker' ? 'maker' : 'user';
						const cancelEvent: PrintRequestEvent = {
							type: 'cancelled',
							reason: payload.reason,
							timestamp,
							by: cancelledBy
						};
						nextEvents = appendEvent(events, cancelEvent);
						await insertChatMessage(tx, {
							senderId: actorId,
							recipientId: cancelledBy === 'maker' ? userId : creatorId,
							relationshipId: printRequestId,
							message: JSON.stringify({ action: 'cancelled', reason: payload.reason }),
							messageType: 'action'
						});
						break;
					}
					case 'shipped': {
						if (body.action !== 'shipped') break;
						const { payload } = body;
						const shippedEvent: PrintRequestEvent = {
							type: 'shipped',
							reason: `Courier: ${payload.courier}, Tracking ID: ${payload.tracking_id ?? ''}, Tracking Link: ${payload.tracking_link ?? ''}`,
							timestamp,
							by: 'maker',
							extra: {
								courier: payload.courier,
								tracking_id: payload.tracking_id ?? '',
								tracking_link: payload.tracking_link ?? ''
							}
						};
						nextEvents = appendEvent(events, shippedEvent);
						await insertChatMessage(tx, {
							senderId: creatorId,
							recipientId: userId,
							relationshipId: printRequestId,
							message: JSON.stringify({
								action: 'shipped',
								courier: payload.courier,
								tracking_id: payload.tracking_id ?? '',
								tracking_link: payload.tracking_link ?? ''
							}),
							messageType: 'action'
						});
						break;
					}
					case 'complete': {
						if (body.action !== 'complete') break;
						const reason = body.payload?.reason ?? '';
						const completeEvent: PrintRequestEvent = {
							type: 'completed',
							reason,
							timestamp,
							by: 'user'
						};
						nextEvents = appendEvent(events, completeEvent);
						await insertChatMessage(tx, {
							senderId: userId,
							recipientId: creatorId,
							relationshipId: printRequestId,
							message: JSON.stringify({ action: 'completed', reason }),
							messageType: 'action'
						});
						break;
					}
					default:
						return { ok: false, status: 400, body: { error: 'invalid_payload' } };
				}

				await tx
					.update(printrequests)
					.set({
						requestStage: nextStage,
						events: nextEvents,
						lastUpdated: sql`now()`,
						updateCount: sql`COALESCE(${printrequests.updateCount}, 0) + 1`
					})
					.where(eq(printrequests.id, printRequestId));

				return {
					ok: true as const,
					response: {
						id: printRequestId,
						requestStage: nextStage
					}
				};
			});
		}
	};
}
