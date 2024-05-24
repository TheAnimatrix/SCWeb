import { checkUser } from '$lib/server/user';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const result = await checkUser(event.locals.supabase);
	
	let addresses;
	if (result) {
		addresses = await event.locals.supabase.from('addresses').select('*');
		
		if (addresses.error) {
			
			addresses = undefined;
		} else {
			addresses = addresses.data;
		}
	} else addresses = undefined;
	return { userExists: result, addresses: addresses };
};
