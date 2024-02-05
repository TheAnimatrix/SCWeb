
export interface Product {
	name: string;
	author: string;
	description: string;
	oldPrice: number;
	newPrice: number;
	stock: number;
	info: string;
	infoColor: string;
	rating: number;
	ratingCount: number;
	pic: never[] | string[];
	accent1: string;
	accent2: string;
	accent3: string;
	tags: string[];
};