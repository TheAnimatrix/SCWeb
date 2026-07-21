/**
 * Money in the database is stored as integer paise.
 * Product catalog prices remain whole INR rupees until persisted on orders.
 */
export function rupeesToPaise(rupees: number): number {
	if (!Number.isInteger(rupees)) {
		throw new Error('rupees must be a whole-number integer');
	}
	return rupees * 100;
}

export function paiseToRupees(paise: number): number {
	if (!Number.isInteger(paise)) {
		throw new Error('paise must be a whole-number integer');
	}
	return paise / 100;
}
