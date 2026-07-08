import { describe, expect, it } from 'vitest';
import {
	buildModelPath,
	buildStorageKey,
	canAccessPrintRequest,
	DEFAULT_DAILY_QUOTA,
	isAsciiStl,
	isBinaryStl,
	isQuotaExceeded,
	isWithinSizeLimit,
	MAX_STL_SIZE_BYTES,
	sanitizeOriginalFilename,
	validateStlContent
} from './print-files.js';

function createBinaryStl(triangleCount: number): Uint8Array {
	const size = 84 + triangleCount * 50;
	const buffer = new Uint8Array(size);
	const view = new DataView(buffer.buffer);
	view.setUint32(80, triangleCount, true);
	return buffer;
}

const ASCII_STL = `solid cube
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
endsolid cube
`;

describe('print-files pure logic', () => {
	describe('STL sniffing', () => {
		it('accepts valid binary STL', () => {
			const data = createBinaryStl(2);
			expect(isBinaryStl(data)).toBe(true);
			expect(validateStlContent(data)).toBe(true);
		});

		it('accepts valid ASCII STL', () => {
			const data = new TextEncoder().encode(ASCII_STL);
			expect(isAsciiStl(data)).toBe(true);
			expect(validateStlContent(data)).toBe(true);
		});

		it('rejects junk data', () => {
			const data = new TextEncoder().encode('not an stl file');
			expect(validateStlContent(data)).toBe(false);
		});

		it('rejects truncated binary STL', () => {
			const data = createBinaryStl(4).slice(0, 100);
			expect(validateStlContent(data)).toBe(false);
		});
	});

	describe('quota arithmetic', () => {
		it('treats the daily limit as inclusive for allowed uploads', () => {
			expect(isQuotaExceeded(0, DEFAULT_DAILY_QUOTA)).toBe(false);
			expect(isQuotaExceeded(2, DEFAULT_DAILY_QUOTA)).toBe(false);
			expect(isQuotaExceeded(3, DEFAULT_DAILY_QUOTA)).toBe(true);
		});
	});

	describe('authorization predicate', () => {
		const printRequest = {
			user_id: 'user-a',
			creator_id: 'maker-b'
		};

		it('allows the request owner', () => {
			expect(canAccessPrintRequest('user-a', printRequest)).toBe(true);
		});

		it('allows the assigned creator', () => {
			expect(canAccessPrintRequest('maker-b', printRequest)).toBe(true);
		});

		it('rejects strangers', () => {
			expect(canAccessPrintRequest('stranger', printRequest)).toBe(false);
		});
	});

	describe('helpers', () => {
		it('sanitizes original filenames without path traversal', () => {
			expect(sanitizeOriginalFilename('../../evil.stl')).toBe('evil.stl');
			expect(sanitizeOriginalFilename('my model (1).stl')).toBe('my model (1).stl');
		});

		it('builds deterministic storage paths', () => {
			expect(buildStorageKey('user-1', 'file-1')).toBe('user-1/file-1.stl');
			expect(buildModelPath('user-1/file-1.stl')).toBe('models/user-1/file-1.stl');
		});

		it('enforces the upload size ceiling', () => {
			expect(isWithinSizeLimit(1)).toBe(true);
			expect(isWithinSizeLimit(MAX_STL_SIZE_BYTES)).toBe(true);
			expect(isWithinSizeLimit(MAX_STL_SIZE_BYTES + 1)).toBe(false);
			expect(isWithinSizeLimit(0)).toBe(false);
		});
	});
});
