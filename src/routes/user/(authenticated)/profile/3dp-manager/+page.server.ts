import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Redirect from the base /3dp-manager to the /user sub-route by default
    redirect(302, '/user/profile/3dp-manager/user');
};