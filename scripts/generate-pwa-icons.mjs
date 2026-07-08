import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const outputDir = 'static/pwa';

await mkdir(outputDir, { recursive: true });

const variants = [
	{ input: `${outputDir}/pwa-any.svg`, outputs: ['pwa-192.png', 'pwa-512.png'], sizes: [192, 512] },
	{
		input: `${outputDir}/pwa-maskable.svg`,
		outputs: ['pwa-maskable-192.png', 'pwa-maskable-512.png'],
		sizes: [192, 512]
	},
	{
		input: `${outputDir}/pwa-monochrome.svg`,
		outputs: ['pwa-monochrome-192.png', 'pwa-monochrome-512.png'],
		sizes: [192, 512]
	}
];

for (const variant of variants) {
	for (let index = 0; index < variant.outputs.length; index += 1) {
		const size = variant.sizes[index];
		const output = `${outputDir}/${variant.outputs[index]}`;

		await sharp(variant.input)
			.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.png()
			.toFile(output);

		console.log(`Generated ${output}`);
	}
}
