import { writable, get } from 'svelte/store';

export const loading = writable(false);
export const getValue = () => get(loading);
