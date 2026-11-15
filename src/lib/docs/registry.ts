export interface DocsProduct {
	slug: string;
	title: string;
	tagline: string;
	productId: string;
	productPath: string;
	repoUrl: string;
}

export const docsProducts: DocsProduct[] = [
	{
		slug: 'lornode',
		title: 'LorNode V2',
		tagline: 'ESP32 + LoRa board for low-power wireless projects',
		productId: '284b6710-b260-4112-b0e7-3387f826d8c2',
		productPath: '/LorNode_V2/craft/item=284b6710-b260-4112-b0e7-3387f826d8c2',
		repoUrl: 'https://github.com/TheAnimatrix/LorNode'
	}
];

export function getDocsProduct(slug: string): DocsProduct | undefined {
	return docsProducts.find((product) => product.slug === slug);
}

export function getDocsProductByProductId(id: string): DocsProduct | undefined {
	return docsProducts.find((product) => product.productId === id);
}
