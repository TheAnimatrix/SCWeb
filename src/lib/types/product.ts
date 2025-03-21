export interface Product {
	users: any;
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
	type:string;
	guarantee:string;
	rel : string;
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

export const newAddress = (): Address => {
	return {
	};
};

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
	id: number;
	amount: number;
	cart_id: string | null;
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

export function validateAddress(address: Address,checkEmail?:boolean): string | null {

	if(checkEmail === true)
	if(!address.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) {
		return 'Please enter a valid email address.';
	}

	if (!address.name || address.name.length < 4 || address.name.length > 35) {
		return 'Name should be between 4 and 35 characters long.';
	}

	if (!address.line1 || address.line1.length < 10 || address.line1.length > 80) {
		return 'Address Line1 should be between 10 and 80 characters long.';
	}

	if (address.line2 && address.line2.length > 50) {
		return 'Line2 should be at most 50 characters long.';
	}

	if (!address.pincode || !/^\d{6}$/.test(address.pincode)) {
		return 'Pincode should be a valid Indian pincode.';
	}

	// Validation for state and city can be implemented using external libraries or data sources
	// Assuming you have a function to validate state and city
	if (!address.state || getValidState(address.state).length <= 0) {
		return 'State should be a valid Indian state.';
	}

	if (!address.city || address.city.length < 2) {
		return 'City should be a valid Indian city.';
	}

	if (!address.phone || !/^[6789]\d{9}$/.test(address.phone)) {
		return 'Phone should be a valid Indian number.';
	}

	return null; // No validation errors found
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
