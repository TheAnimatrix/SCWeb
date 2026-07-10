import {
	getPrintRequestDisplayName,
	parsePrintModelMetadata
} from './print-files.js';

export { getPrintRequestDisplayName, parsePrintModelMetadata };

export type PrintModelDataRecord = {
	color?: string;
	material?: string;
	quality?: string;
	scale?: string | number;
	infill?: string | number;
};

export function parsePrintModelData(value: unknown): PrintModelDataRecord {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}

	const record = value as Record<string, unknown>;
	return {
		color: typeof record.color === 'string' ? record.color : undefined,
		material: typeof record.material === 'string' ? record.material : undefined,
		quality: typeof record.quality === 'string' ? record.quality : undefined,
		scale: record.scale as string | number | undefined,
		infill: record.infill as string | number | undefined
	};
}

export function formatBytes(bytes: number | undefined): string | undefined {
	if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) {
		return undefined;
	}

	if (bytes < 1024) {
		return `${bytes} B`;
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDimensions(dimensions: { x: number; y: number; z: number } | undefined) {
	if (!dimensions) {
		return undefined;
	}

	const format = (value: number) => `${value.toFixed(2)} mm`;
	return `${format(dimensions.x)} × ${format(dimensions.y)} × ${format(dimensions.z)}`;
}

export function buildPrintOptionDetails(modelData: PrintModelDataRecord) {
	const details: Array<{ label: string; value: string }> = [];

	if (modelData.material) {
		details.push({ label: 'Material', value: modelData.material });
	}
	if (modelData.color) {
		details.push({ label: 'Color', value: modelData.color });
	}
	if (modelData.quality) {
		details.push({ label: 'Quality', value: modelData.quality });
	}
	if (modelData.scale != null && modelData.scale !== '') {
		details.push({ label: 'Scale', value: `${modelData.scale}×` });
	}
	if (modelData.infill != null && modelData.infill !== '') {
		details.push({ label: 'Infill', value: `${modelData.infill}%` });
	}

	return details;
}

export function buildPrintMetadataDetails(
	filename: string,
	metadata: ReturnType<typeof parsePrintModelMetadata>
) {
	const details: Array<{ label: string; value: string }> = [{ label: 'File', value: filename }];

	const fileSize = formatBytes(metadata?.fileSizeBytes);
	if (fileSize) {
		details.push({ label: 'File size', value: fileSize });
	}

	const dimensions = formatDimensions(metadata?.dimensions);
	if (dimensions) {
		details.push({ label: 'Dimensions', value: dimensions });
	}

	if (metadata?.triangleCount != null) {
		details.push({
			label: 'Triangles',
			value: metadata.triangleCount.toLocaleString('en-IN')
		});
	}

	return details;
}
