type CartOwnerRow = {
	client_id: string | null;
	uid: string | null;
};

/** Returns true when the cart belongs to the anonymous clientId and/or authenticated user. */
export function isCartOwnedBy(
	cart: CartOwnerRow,
	clientId: string,
	userId: string | null | undefined
): boolean {
	if (userId && cart.uid === userId) return true;
	if (cart.client_id && cart.client_id === clientId) return true;
	return false;
}
