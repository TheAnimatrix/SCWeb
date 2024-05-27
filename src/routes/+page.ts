import type { Banner } from '$lib/client/banner';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({parent}) => {
    const {supabase_lt} = await parent();
	let banners : Banner[] | undefined;
	if(supabase_lt){
		const bannerResult = await supabase_lt.from("constants").select().eq('key','BANNERS');
		banners = bannerResult.data?.[0].value as Banner[];
	}
   return {
     banners
   };
};