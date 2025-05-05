import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {

    const resp = await event.locals.supabase.from('constants').select('*').eq('key', 'FILTYPES').single();
    if (!resp || resp.error) {
        return {
            filtypes: ['PLA', 'ABS', 'ASA', 'PETG', 'TPU', 'NYLON']
        };
    } else {
        return {
            filtypes: resp.data.value
        };
    }
};