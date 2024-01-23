import { writable } from 'svelte/store';
import type {Product} from './types/product';

export const products = writable<Product[]>([]);
const productList: Product[] = [];
const productA = {
	name: 'Lornode V2',
	author: 'Animatrix',
	description: `LoRA + ESP8266 Done right.
        Low quiescent current <10uA.
        73x43 mm.
        TP4056 based charging & power path.`,
	oldPrice: 999,
	newPrice: 899,
	stock: 9,
	info: 'Launch offer',
	infoColor: 'bg-gradient-to-r from-violet-950 to-purple-900 text-white',
	rating: 4.5,
	ratingCount: 20,
	pic: ['/images/lornode_pp2.jpg', '/images/lornode_pp.png'],
	accent1: '#8539FF',
	accent2: '#2039FF',
	accent3: '#9038FF',
	tags: ['Long Range Networking', 'WiFi/BT','Very Low Idle Drain ~20uA','Battery protection','Charging','Type-C']
};

const productB = {
	name: 'Lorem',
	author: 'Ipsum',
	oldPrice: 2699,
	newPrice: 1499,
	description:
		'Lorem ipsum dolor sit amet consectetur adipisicing elit. Perspiciatis, iste labore corruptiillo deserunt tempora expedita velit rem, totam omnis, quia ipsa. Nostrum quos asperiores, optio aliquam deserunt molestiae dignissimos.',
	stock: 0,
	info: 'Out of stock, Next batch in 4 weeks',
	infoColor: 'bg-[#84848441] text-white',
	rating: 4.1,
	ratingCount: 3,
	pic: [],
	accent1: '#FF7A00',
	accent2: '#FFCE85',
	accent3: '#FF5C38',
	tags: ['one', 'two', 'three']
};

for (let i = 0; i < 25; i++) {
	if (i % 2 == 0) productList.push(productA);
	else productList.push(productB);
}

products.set(productList);

/* 

*/
export const getProduct = (i:number) => {
	return productList[i];
};
