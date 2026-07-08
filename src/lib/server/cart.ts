type CartOwnerRow = {
	client_id: string | null;
	uid: string | null;
};

/**
 * Returns true when the requester owns the cart.
 * User-owned carts (uid set) require a matching authenticated userId.
 * Guest carts (uid null) are matched by clientId only.
 */
export function isCartOwnedBy(
	cart: CartOwnerRow,
	clientId: string,
	userId: string | null | undefined
): boolean {
	if (cart.uid) {
		return userId === cart.uid;
	}
	return cart.client_id === clientId;
}
