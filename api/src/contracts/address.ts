import { z } from 'zod';

const INDIAN_STATES = [
	'Andhra Pradesh',
	'Arunachal Pradesh',
	'Assam',
	'Bihar',
	'Chhattisgarh',
	'Goa',
	'Gujarat',
	'Haryana',
	'Himachal Pradesh',
	'Jharkhand',
	'Karnataka',
	'Kerala',
	'Madhya Pradesh',
	'Maharashtra',
	'Manipur',
	'Meghalaya',
	'Mizoram',
	'Nagaland',
	'Odisha',
	'Punjab',
	'Rajasthan',
	'Sikkim',
	'Tamil Nadu',
	'Telangana',
	'Tripura',
	'Uttar Pradesh',
	'Uttarakhand',
	'West Bengal',
	'Andaman and Nicobar Islands',
	'Chandigarh',
	'Dadra and Nagar Haveli and Daman and Diu',
	'Delhi',
	'Ladakh',
	'Lakshadweep',
	'Puducherry'
] as const;

function levenshteinDistance(str1: string, str2: string): number {
	const m = str1.length;
	const n = str2.length;
	const dp: number[][] = [];

	for (let i = 0; i <= m; i++) {
		dp[i] = [i];
	}

	for (let j = 0; j <= n; j++) {
		dp[0]![j] = j;
	}

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (str1[i - 1] === str2[j - 1]) {
				dp[i]![j] = dp[i - 1]![j - 1]!;
			} else {
				dp[i]![j] = Math.min(dp[i - 1]![j - 1]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j]! + 1);
			}
		}
	}

	return dp[m]![n]!;
}

function isValidIndianState(state: string): boolean {
	const threshold = 1;
	return INDIAN_STATES.some(
		(validState) => levenshteinDistance(validState.toLowerCase(), state.toLowerCase()) <= threshold
	);
}

/**
 * Accepts "98765 43210", "098765-43210", "+91 98765 43210", "919876543210" and stores
 * "+919876543210". Returns null when the input is not a 10-digit Indian mobile number.
 * Keep in sync with `normalizeIndianPhone` in src/lib/types/product.ts.
 */
export function normalizeIndianPhone(raw: string): string | null {
	let digits = raw.replace(/[\s\-().]/g, '');
	if (digits.startsWith('+91')) digits = digits.slice(3);
	else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
	else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
	return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

const indianPhoneSchema = z.string().transform((value, ctx) => {
	const normalized = normalizeIndianPhone(value);
	if (!normalized) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a 10-digit mobile number.' });
		return z.NEVER;
	}
	return normalized;
});

// Strict — web Address objects carry id/email/created_at and must be stripped by the frontend client (WU-2D).
// Length limits match `validateAddressFields` in src/lib/types/product.ts.
export const checkoutAddressSchema = z
	.object({
		name: z.string().trim().min(2).max(80),
		line1: z.string().trim().min(3).max(80),
		line2: z.string().trim().max(80).optional(),
		city: z.string().trim().min(2),
		pincode: z.string().regex(/^\d{6}$/),
		state: z.string().refine(isValidIndianState, 'State should be a valid Indian state.'),
		phone: indianPhoneSchema,
		email: z.string().email().optional()
	})
	.strict();

export type CheckoutAddress = z.infer<typeof checkoutAddressSchema>;
