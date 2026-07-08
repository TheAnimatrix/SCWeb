/**
 * Converts whole INR rupees to paise for Razorpay API calls.
 * Money columns in the database store rupees; multiply by 100 only at this boundary.
 */
export function rupeesToPaise(rupees: number): number {
	if (!Number.isInteger(rupees)) {
		throw new Error('rupees must be a whole-number integer');
	}
	return rupees * 100;
}
