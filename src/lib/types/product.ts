export interface ProductUser {
	username?: string | null;
	city?: string | null;
	tier?: string | null;
}

/** Normalize joined `users` relation from product queries (object or single-element array). */
export function productUserRef(
	users: ProductUser | ProductUser[] | null | undefined
): ProductUser | null {
	if (!users) return null;
	return Array.isArray(users) ? (users[0] ?? null) : users;
}

export interface Product {
	users: ProductUser | ProductUser[] | null;
	id: string;
	name: string;
	images: { url: string }[];
	tags: { tag: string }[];
	offer?: { offer_colorA: string; offer_colorB: string; offer_name: string };
	rating?: { count: number; rating: number };
	stock: { count: number; status: string };
	created_at: string;
	documentation?: { data: string; isMDUrl: boolean }[];
	//[0]->description
	//[1]->documentation
	//[2]->shipping
	//[3]->costing
	faq?: { question: string; answer: string }[];
	uid: string;
	price: { old: number; new: number };
	author?: string;
	type: string;
	guarantee: string;
	rel: string;
}

export interface Address {
	name?: string;
	line1?: string;
	line2?: string;
	city?: string;
	pincode?: string;
	state?: string;
	phone?: string;
	id?: string;
	created_at?: string;
	email?: string;
}

/** Coerce optional string fields to '' so they can bind to ScInput ($bindable('')). */
export function normalizeAddress(addr: Address = {}): Address {
	return {
		name: addr.name ?? '',
		line1: addr.line1 ?? '',
		line2: addr.line2 ?? '',
		city: addr.city ?? '',
		pincode: addr.pincode ?? '',
		state: addr.state ?? '',
		phone: addr.phone ?? '',
		email: addr.email ?? '',
		id: addr.id,
		created_at: addr.created_at
	};
}

export const newAddress = (): Address => normalizeAddress();

function optionalString(value: unknown): string | undefined {
	return value != null ? String(value) : undefined;
}

export function asAddress(value: unknown): Address {
	if (!value || typeof value !== 'object') return {};

	const record = value as Record<string, unknown>;
	return {
		name: optionalString(record.name),
		line1: optionalString(record.line1),
		line2: optionalString(record.line2),
		city: optionalString(record.city),
		pincode: optionalString(record.pincode),
		state: optionalString(record.state),
		phone: optionalString(record.phone),
		id: optionalString(record.id),
		created_at: optionalString(record.created_at),
		email: optionalString(record.email)
	};
}

export function asAddressList(values: unknown): Address[] {
	if (!Array.isArray(values)) return [];
	return values.map(asAddress);
}

export interface Order {
	created_at: string;
	payment_status: string;
	payment_method: string;
	payment_id: string | null;
	billing_address: string | null;
	shipping_address: string | null;
	trackingId: string | null;
	trackingCourier: string | null;
	trackingUrl: string | null;
	uid: string;
	id: string | number;
	amount: number;
	cart_id: string | null;
	item_snapshot: {
		product_name: string;
		product_id: string;
		qty: number;
		price: number;
		author?: string | null;
		authorTier?: string | null;
		image_url?: string | null;
	}[];
}
export const compareAddress = (a: Address, b: Address) => {
	if (a.id != b.id) return false;
	if (a.line1 != b.line1) return false;
	if (a.line2 != b.line2) return false;
	if (a.city != b.city) return false;
	if (a.name != b.name) return false;
	if (a.phone != b.phone) return false;
	if (a.state != b.state) return false;
	if (a.pincode != b.pincode) return false;
	return true;
};

export type Orders = Order[];

export type AddressField =
	'name' | 'line1' | 'line2' | 'pincode' | 'city' | 'state' | 'phone' | 'email';

/** Display order, also the order fields are focused in when the form is checked. */
export const ADDRESS_FIELD_ORDER: AddressField[] = [
	'name',
	'line1',
	'line2',
	'pincode',
	'city',
	'state',
	'phone',
	'email'
];

export type AddressFieldErrors = Partial<Record<AddressField, string>>;

/**
 * Accepts "98765 43210", "098765-43210", "+91 98765 43210", "919876543210" and returns
 * "+919876543210". Returns null when the input is not a 10-digit Indian mobile number.
 * Keep in sync with `normalizeIndianPhone` in api/src/contracts/address.ts.
 */
export function normalizeIndianPhone(raw: string | null | undefined): string | null {
	if (!raw) return null;
	let digits = raw.replace(/[\s\-().]/g, '');
	if (digits.startsWith('+91')) digits = digits.slice(3);
	else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
	else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
	return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

/** Trims text fields and normalises the phone to "+91XXXXXXXXXX" when it is valid. */
export function normalizeAddressForSave(address: Address): Address {
	const trim = (value: string | undefined) => (value ?? '').trim();
	return {
		...address,
		name: trim(address.name),
		line1: trim(address.line1),
		line2: trim(address.line2),
		city: trim(address.city),
		pincode: trim(address.pincode),
		state: trim(address.state),
		email: trim(address.email),
		phone: normalizeIndianPhone(address.phone) ?? trim(address.phone)
	};
}

/**
 * Per-field validation. Limits match `checkoutAddressSchema` in api/src/contracts/address.ts.
 * `checkEmail` is for guests, who have no account e-mail.
 */
export function validateAddressFields(address: Address, checkEmail?: boolean): AddressFieldErrors {
	const errors: AddressFieldErrors = {};
	const name = (address.name ?? '').trim();
	const line1 = (address.line1 ?? '').trim();
	const line2 = (address.line2 ?? '').trim();
	const city = (address.city ?? '').trim();
	const state = (address.state ?? '').trim();
	const pincode = (address.pincode ?? '').trim();
	const email = (address.email ?? '').trim();

	if (name.length < 2) errors.name = 'Enter your full name.';
	else if (name.length > 80) errors.name = 'Keep the name under 80 characters.';

	if (line1.length < 3) errors.line1 = 'Enter your house or flat number and street.';
	else if (line1.length > 80) errors.line1 = 'Keep address line 1 under 80 characters.';

	if (line2.length > 80) errors.line2 = 'Keep address line 2 under 80 characters.';

	if (!/^\d{6}$/.test(pincode)) errors.pincode = 'Enter a 6-digit pincode.';

	if (city.length < 2) errors.city = 'Enter your city.';

	if (!state || getValidState(state).length <= 0) errors.state = 'Select your state.';

	if (!normalizeIndianPhone(address.phone)) errors.phone = 'Enter a 10-digit mobile number.';

	if (checkEmail === true && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		errors.email = 'Enter a valid email address.';
	}

	return errors;
}

/** First problem with the address, or null when it can be used for checkout. */
export function validateAddress(address: Address, checkEmail?: boolean): string | null {
	const errors = validateAddressFields(address, checkEmail);
	for (const field of ADDRESS_FIELD_ORDER) {
		if (errors[field]) return errors[field]!;
	}
	return null;
}

export function getValidState(state: string): string[] {
	const threshold = 1; // Adjust threshold as needed

	// Calculate Levenshtein distance for each state and the provided state
	const matches = indianStates.filter((validState) => {
		const distance = levenshteinDistance(validState.toLowerCase(), state.toLowerCase());
		return distance <= threshold;
	});
	return matches;
}

// Function to calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
	const m = str1.length;
	const n = str2.length;
	const dp: number[][] = [];

	for (let i = 0; i <= m; i++) {
		dp[i] = [i];
	}

	for (let j = 0; j <= n; j++) {
		dp[0][j] = j;
	}

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (str1[i - 1] === str2[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1];
			} else {
				dp[i][j] = Math.min(dp[i - 1][j - 1] + 1, dp[i][j - 1] + 1, dp[i - 1][j] + 1);
			}
		}
	}

	return dp[m][n];
}

export const indianStates = [
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
];
