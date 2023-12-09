export async function load({params, parent}){
    console.log(params);
    let k = await parent();
    console.log(k);
    return params
}