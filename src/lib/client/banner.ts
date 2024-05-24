export type Banner = {
    bannerUrl : string;
    bannerAlt : string;
}

const bannersL : Banner[] = [];
bannersL.push({bannerAlt:"Banner1", bannerUrl:"/images/lornode_wide.png"});
bannersL.push({bannerAlt:"Banner2", bannerUrl:"/images/lornode_pp2.jpg"});
export function getBannerCount(){
    return bannersL.length;
}

export function getBanner(i:number){
    return bannersL[i];
}