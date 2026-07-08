import snarkdown from 'snarkdown';

const TABLE_SEPARATOR = /^\|?[\s:-]+\|[\s|:-]*$/;
const SALE_PRICE_ROW = /sale\s*price/i;
const ADJUSTMENT_ROW = /packing|handling|profit|loss/i;

function parseTableRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((cell) => cell.trim());
}

function parseAmount(cell: string): number | null {
	const normalized = cell.replace(/\*\*/g, '');
	const match = normalized.match(/-?\d+(?:\.\d+)?/);
	return match ? Number(match[0]) : null;
}

function formatMarginLabel(adjustment: number, landedCost: number): string {
	if (!landedCost) return '';

	const pct = (adjustment / landedCost) * 100;
	const rounded = Math.abs(pct).toFixed(1);

	if (pct < 0) {
		return `<span class="text-red-400">(${rounded}% loss)</span>`;
	}

	if (pct > 0) {
		return `<span class="text-green-400">(${rounded}% profit)</span>`;
	}

	return '';
}

function getCostingMarginLabel(rows: string[][]): string {
	const saleRow = rows.find(([label]) => SALE_PRICE_ROW.test(label));
	const adjustmentRow = rows.find(([label]) => ADJUSTMENT_ROW.test(label));

	if (!saleRow) return '';

	const saleAmount = parseAmount(saleRow[1] ?? '');
	if (saleAmount === null) return '';

	if (adjustmentRow) {
		const adjustment = parseAmount(adjustmentRow[1] ?? '');
		if (adjustment === null) return '';
		return formatMarginLabel(adjustment, saleAmount - adjustment);
	}

	const landedCost = rows
		.filter(([label]) => !SALE_PRICE_ROW.test(label))
		.reduce((sum, [, amountCell]) => {
			const amount = parseAmount(amountCell ?? '');
			return amount === null ? sum : sum + amount;
		}, 0);

	return formatMarginLabel(saleAmount - landedCost, landedCost);
}

function renderTableCell(cell: string, marginLabel: string, isSalePriceRow: boolean): string {
	if (!isSalePriceRow || !marginLabel) {
		return snarkdown(cell);
	}

	const amountText = cell.replace(/\*\*/g, '').trim();
	return `${snarkdown(amountText)} ${marginLabel}`;
}

function markdownTableToHtml(table: string, costing = false): string {
	const lines = table
		.trim()
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length < 2 || !lines[0].includes('|')) {
		return snarkdown(table);
	}

	const bodyLines = lines.slice(1).filter((line) => !TABLE_SEPARATOR.test(line));
	const rows = bodyLines.map(parseTableRow);
	const marginLabel = costing ? getCostingMarginLabel(rows) : '';

	const headers = parseTableRow(lines[0]);
	const headerHtml = headers.map((cell) => `<th>${snarkdown(cell)}</th>`).join('');
	const bodyHtml = rows
		.map(([label, ...rest]) => {
			const isSalePriceRow = SALE_PRICE_ROW.test(label);
			const cells = [label, ...rest];
			return `<tr>${cells
				.map((cell, index) => {
					const content =
						index === 1 && isSalePriceRow
							? renderTableCell(cell, marginLabel, true)
							: snarkdown(cell);
					return `<td>${content}</td>`;
				})
				.join('')}</tr>`;
		})
		.join('');

	return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

export function renderMarkdown(content: string): string {
	const blocks = content.split(/\n{2,}/);
	return blocks.map((block) => markdownTableToHtml(block.trim())).join('');
}

export function renderCostingMarkdown(content: string): string {
	const blocks = content.split(/\n{2,}/);
	return blocks.map((block) => markdownTableToHtml(block.trim(), true)).join('');
}
