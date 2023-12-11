import { writable } from 'svelte/store';
export const products = writable([]);
let productList=[];
let productA = {
		name: 'Lornode V2',
		author: 'Animatrix',
		description: `LoRA + ESP8266 Done right.
        Low quiescent current <10uA.
        73x43 mm.
        TP4056 based charging & power path.`,
		oldPrice:'999',
		newPrice:'899',
		info: '<strong>8</strong> in stock',
		infoColor: ['#ffffff', '#000000'],
		rating: 4.5,
		ratingCount: 20,
		pic: ['/images/lornode_pp2.jpg','/images/lornode_pp.png'],
		accent1: '#8539FF',
		accent2: '#2039FF',
		accent3: '#9038FF'
	};

let productB = {
		name: 'Lorem',
		author: 'Ipsum',
		oldPrice:'2699',
		newPrice:'1499',
		description:
			'Lorem ipsum dolor sit amet consectetur adipisicing elit. Perspiciatis, iste labore corruptiillo deserunt tempora expedita velit rem, totam omnis, quia ipsa. Nostrum quos asperiores, optio aliquam deserunt molestiae dignissimos.',
		info: 'Out of stock',
		infoColor: ['#FF5C38', '#ffffff'],
		rating: 4.1,
		ratingCount: 3,
		pic: [],
		accent1: '#FF7A00',
		accent2: '#FFCE85',
		accent3: '#FF5C38'
	}


for (let i=0;i<25;i++)
{
    if (i%2 == 0)
        productList.push(productA)
    else
        productList.push(productB)
}

products.set(productList);
products.update((p) => {console.log("updated"); return p;});




/* 

*/
export const getProduct = (i) => {
	return productList[i];
};