import type { ErrorEvent } from '@sentry/node';

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
	if (event.request) {
		delete event.request.cookies;
		if (event.request.headers) {
			delete event.request.headers.authorization;
			delete event.request.headers.cookie;
		}
	}
	return event;
}
