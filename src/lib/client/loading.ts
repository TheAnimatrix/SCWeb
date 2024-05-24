import { writable, get, type Writable } from 'svelte/store';

export const loading = writable(false);
export const getValue = () => get(loading);

export const setLoading = (store:Writable<boolean>,value:boolean) => {
    // if(store) store.set(value);   
}

export const setLoadingT = (store:Writable<boolean>,value:boolean) => {
    if(store) store.set(value);   
}