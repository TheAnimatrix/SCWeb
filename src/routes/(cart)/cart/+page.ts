import { browser } from '$app/environment';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
   
    if(browser)
        console.log("page load in browser yay ",localStorage);
    else    
        console.log("NAHHHHH");        
};