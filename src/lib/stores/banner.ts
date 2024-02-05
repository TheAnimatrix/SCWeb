
import { writable } from 'svelte/store';
export type Banner = {
    bannerUrl : string;
    bannerAlt : string;
}

export const banners = writable<Banner[]>([]);
const bannersL : Banner[] = [];

function fetchBanners(){
    bannersL.push({bannerAlt:"Banner1", bannerUrl:"/images/lornode_wide.png"});
    bannersL.push({bannerAlt:"Banner2", bannerUrl:"/images/lornode_pp2.jpg"});
    banners.set(bannersL);
}

export function getBannerCount(){
    return bannersL.length;
}

export function getBanner(i:number){
    return bannersL[i];
}

fetchBanners();