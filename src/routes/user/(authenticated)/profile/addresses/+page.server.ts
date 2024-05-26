import type { Address } from '$lib/types/product';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let addresses: Address[] = [];
    let editing: boolean[] = [];

    const result = await event.locals.supabase.from('addresses').select('*');
    if (result && result.data) {
    for (const r of result.data as Address[]) {
        addresses.push(r);
        editing.push(false);
    }
    addresses = [...addresses];
    editing = [...editing];
    }

    return {
        addresses,
        editing
    };
};