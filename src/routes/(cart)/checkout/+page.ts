import { checkUser } from '$lib/stores/cart.js';

export async function load({ parent }) {
	const data = await parent();
	const result = await checkUser(data.supabase_lt);
	let addresses;
	if (result) {
		addresses = await data.supabase_lt.from('addresses').select('*');
        if(addresses.error){
            console.log(addresses.error);
            addresses = undefined;
        }else{
            addresses = addresses.data;
        }
	} else addresses = undefined;
	return { userExists: result, addresses: addresses };
}
