// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = true;

export function load({params} : {params:any}) {
    console.log(params);
    console.log("yooy");
    return { title : "welcome to hell"};
}