import { browser } from '$app/environment';
import type {
	RazorpayCheckoutOptions,
	RazorpayCheckoutSuccessResponse,
	RazorpayPaymentFailedResponse
} from '$lib/types/razorpay';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const LOAD_TIMEOUT_MS = 20_000;

let loadPromise: Promise<typeof Razorpay> | null = null;

function waitForGlobalRazorpay(): Promise<typeof Razorpay> {
	return new Promise((resolve, reject) => {
		if (typeof Razorpay !== 'undefined') {
			resolve(Razorpay);
			return;
		}

		const deadline = Date.now() + LOAD_TIMEOUT_MS;
		const timer = window.setInterval(() => {
			if (typeof Razorpay !== 'undefined') {
				window.clearInterval(timer);
				resolve(Razorpay);
				return;
			}

			if (Date.now() >= deadline) {
				window.clearInterval(timer);
				reject(new Error('Razorpay checkout script timed out'));
			}
		}, 50);
	});
}

function injectRazorpayScript(): Promise<void> {
	return new Promise((resolve, reject) => {
		const existing = document.querySelector<HTMLScriptElement>(
			`script[src="${RAZORPAY_SCRIPT_URL}"]`
		);

		if (existing) {
			if (existing.dataset.loaded === 'true') {
				resolve();
				return;
			}

			existing.addEventListener('load', () => resolve(), { once: true });
			existing.addEventListener(
				'error',
				() => reject(new Error('Failed to load Razorpay checkout script')),
				{ once: true }
			);
			return;
		}

		const script = document.createElement('script');
		script.src = RAZORPAY_SCRIPT_URL;
		script.async = true;
		script.onload = () => {
			script.dataset.loaded = 'true';
			resolve();
		};
		script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
		document.head.appendChild(script);
	});
}

/** Loads checkout.js once and resolves to the global Razorpay constructor. */
export function loadRazorpay(): Promise<typeof Razorpay> {
	if (!browser) {
		return Promise.reject(new Error('Razorpay can only load in the browser'));
	}

	if (typeof Razorpay !== 'undefined') {
		return Promise.resolve(Razorpay);
	}

	loadPromise ??= injectRazorpayScript()
		.then(() => waitForGlobalRazorpay())
		.catch((error) => {
			loadPromise = null;
			throw error;
		});

	return loadPromise;
}

function lockPageForRazorpay(): void {
	document.documentElement.classList.add('sc-razorpay-open');
}

function unlockPageForRazorpay(): void {
	document.documentElement.classList.remove('sc-razorpay-open');
}

/** Razorpay sizes its iframe from viewport metrics; nudge after mount if needed. */
function nudgeRazorpayLayout(): void {
	const fire = () => window.dispatchEvent(new Event('resize'));
	fire();
	requestAnimationFrame(() => {
		fire();
		requestAnimationFrame(fire);
	});
}

function watchRazorpayFrame(): void {
	if (document.querySelector('.razorpay-checkout-frame')) {
		nudgeRazorpayLayout();
		return;
	}

	const observer = new MutationObserver(() => {
		if (!document.querySelector('.razorpay-checkout-frame')) return;
		nudgeRazorpayLayout();
		observer.disconnect();
	});

	observer.observe(document.body, { childList: true, subtree: true });
	window.setTimeout(() => observer.disconnect(), 10_000);
}

export type OpenRazorpayOptions = RazorpayCheckoutOptions & {
	onPaymentFailed?: (response: RazorpayPaymentFailedResponse) => void;
};

/** Opens Razorpay checkout after ensuring the SDK is ready and layout can host the overlay. */
export async function openRazorpayCheckout(options: OpenRazorpayOptions): Promise<void> {
	const { onPaymentFailed, ...razorpayOptions } = options;
	const RazorpayConstructor = await loadRazorpay();

	// Let the current frame finish layout before Razorpay measures the viewport.
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

	lockPageForRazorpay();
	let unlocked = false;
	const unlock = () => {
		if (unlocked) return;
		unlocked = true;
		unlockPageForRazorpay();
	};

	const instance = new RazorpayConstructor({
		...razorpayOptions,
		handler: async (response: RazorpayCheckoutSuccessResponse) => {
			try {
				await razorpayOptions.handler(response);
			} finally {
				unlock();
			}
		},
		modal: {
			...razorpayOptions.modal,
			ondismiss: () => {
				unlock();
				razorpayOptions.modal?.ondismiss?.();
			}
		}
	});

	if (onPaymentFailed) {
		instance.on('payment.failed', (response) => {
			unlock();
			onPaymentFailed(response);
		});
	}

	instance.open();
	watchRazorpayFrame();
	nudgeRazorpayLayout();
}
