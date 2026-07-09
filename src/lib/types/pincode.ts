export interface PincodeLookupSuccess {
	ok: true;
	pincode: string;
	state: string;
	cities: string[];
}

export interface PincodeLookupFailure {
	ok: false;
	error: 'invalid_pincode' | 'not_found' | 'upstream_error';
}

export type PincodeLookupResult = PincodeLookupSuccess | PincodeLookupFailure;
