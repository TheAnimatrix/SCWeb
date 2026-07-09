import { lookupPincode } from '$lib/server/pincode';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const pincode = params.pincode ?? '';
	const result = await lookupPincode(pincode);

	setHeaders({
		'cache-control': result.ok ? 'public, max-age=86400' : 'no-store'
	});

	if (!result.ok) {
		const status = result.error === 'invalid_pincode' ? 400 : 404;
		return json(result, { status });
	}

	return json(result);
};
