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

export const checkoutAddressSchema = z
	.object({
		name: z.string().min(4).max(35),
		line1: z.string().min(10).max(80),
		line2: z.string().max(50).optional(),
		city: z.string().min(2),
		pincode: z.string().regex(/^\d{6}$/),
		state: z.string().refine(isValidIndianState, 'State should be a valid Indian state.'),
		phone: z.string().regex(/^(\+91)?[6789]\d{9}$/)
	})
	.strict();

export type CheckoutAddress = z.infer<typeof checkoutAddressSchema>;
