/** Resend SMTP allows 2 requests/second — pace sends to stay under the limit. */
export const DEFAULT_SMTP_MIN_SEND_INTERVAL_MS = 600;

export function isSmtpRateLimitError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /too many requests/i.test(message) || /\b429\b/.test(message);
}

export function createSendQueue(minIntervalMs: number) {
	let tail: Promise<void> = Promise.resolve();
	let lastSendAt = 0;

	return function enqueue<T>(task: () => Promise<T>): Promise<T> {
		const run = async (): Promise<T> => {
			if (minIntervalMs > 0 && lastSendAt > 0) {
				const waitMs = Math.max(0, lastSendAt + minIntervalMs - Date.now());
				if (waitMs > 0) {
					await new Promise((resolve) => setTimeout(resolve, waitMs));
				}
			}

			lastSendAt = Date.now();
			return task();
		};

		const result = tail.then(run, run);
		tail = result.then(
			() => undefined,
			() => undefined
		);
		return result;
	};
}
