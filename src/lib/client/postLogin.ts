import { goto } from "$app/navigation";
import { Turtle } from "lucide-svelte";


const localStorageKey = "postLoginURL";

export function gotoPostLogin(fallback: string, remove: boolean = true){
    if(typeof window === "undefined"){
        goto(fallback);
    }
    const url = localStorage.getItem(localStorageKey);
    if(url){
        if(remove){
            localStorage.removeItem(localStorageKey);
        }
        goto(url);
    }
}

export function setPostLoginURL(url: string) : boolean{
    if(typeof window === "undefined"){
        return false;
    }
    localStorage.setItem(localStorageKey, url);
    return true;
}

export function removePostLoginURL(){
    if(typeof window === "undefined"){
        return;
    }
    localStorage.removeItem(localStorageKey);
}