import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load : LayoutServerLoad = async ({route}) => {
    if(route.id == '/user/(authenticated)/profile')
        redirect(300,'/user/profile/account')

    return {
        url: route.id
    }
}