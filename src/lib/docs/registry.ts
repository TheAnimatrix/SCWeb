export interface DocsProduct {
	slug: string;
	title: string;
	tagline: string;
	productId: string;
	productPath: string;
	/** Public source repo. Leave out when the design files are not public. */
	repoUrl?: string;
	/** Label for the button that goes to the listing. Defaults to "Buy {title}". */
	cta?: string;
}

export const docsProducts: DocsProduct[] = [
	{
		slug: 'lornode',
		title: 'LorNode V2',
		tagline: 'ESP32 + LoRa board for low-power wireless projects',
		productId: '284b6710-b260-4112-b0e7-3387f826d8c2',
		productPath: '/LorNode_V2/craft/item=284b6710-b260-4112-b0e7-3387f826d8c2',
		repoUrl: 'https://github.com/TheAnimatrix/LorNode'
	},
	{
		slug: 'keepalive',
		title: 'KeepAlive',
		tagline: 'Stops a power bank switching off under a small load',
		productId: 'b320bdaf-1e9f-4f13-b7a8-c24b4b2823be',
		productPath: '/KeepAlive/craft/item=b320bdaf-1e9f-4f13-b7a8-c24b4b2823be',
		// Not made yet: the listing is an interest check, so there is nothing to buy.
		cta: 'See the listing'
	}
];

export function getDocsProduct(slug: string): DocsProduct | undefined {
	return docsProducts.find((product) => product.slug === slug);
}

export function getDocsProductByProductId(id: string): DocsProduct | undefined {
	return docsProducts.find((product) => product.productId === id);
}
