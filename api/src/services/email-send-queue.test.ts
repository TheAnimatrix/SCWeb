import { describe, expect, it, vi } from 'vitest';
import {
	createSendQueue,
	DEFAULT_SMTP_MIN_SEND_INTERVAL_MS,
	isSmtpRateLimitError
} from './email-send-queue.js';

describe('email-send-queue', () => {
	it('detects SMTP rate limit errors', () => {
		expect(
			isSmtpRateLimitError(
				new Error(
					'Message failed: 550 Too many requests. You can only make 2 requests per second.'
				)
			)
		).toBe(true);
	});

	it('paces queued sends', async () => {
		vi.useFakeTimers();
		const order: number[] = [];
		const enqueue = createSendQueue(DEFAULT_SMTP_MIN_SEND_INTERVAL_MS);

		const first = enqueue(async () => {
			order.push(1);
		});
		const second = enqueue(async () => {
			order.push(2);
		});

		await first;
		expect(order).toEqual([1]);

		await vi.advanceTimersByTimeAsync(DEFAULT_SMTP_MIN_SEND_INTERVAL_MS);
		await second;
		expect(order).toEqual([1, 2]);

		vi.useRealTimers();
	});
});
