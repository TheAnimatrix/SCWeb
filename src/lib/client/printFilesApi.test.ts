import { describe, expect, it } from 'vitest';
import { mapPrintFilesError } from '$lib/client/printFilesApi';

describe('mapPrintFilesError', () => {
	it('maps file_too_large', () => {
		expect(mapPrintFilesError(413, { error: 'file_too_large' })).toEqual({
			kind: 'file_too_large',
			message: 'Model file must be less than 50MB.'
		});
	});

	it('maps invalid_file_type', () => {
		expect(mapPrintFilesError(415, { error: 'invalid_file_type' })).toEqual({
			kind: 'invalid_file_type',
			message: 'Only .stl files are allowed.'
		});
	});

	it('maps invalid_stl as invalid_file', () => {
		expect(mapPrintFilesError(415, { error: 'invalid_stl' })).toEqual({
			kind: 'invalid_file',
			message: 'The uploaded file is not a valid STL model.'
		});
	});

	it('maps quota_exceeded with daily limit message', () => {
		expect(mapPrintFilesError(429, { error: 'quota_exceeded' })).toEqual({
			kind: 'quota_exceeded',
			message: 'You have reached your daily quote request limit.'
		});
	});

	it('maps files_unconfigured', () => {
		expect(mapPrintFilesError(503, { error: 'files_unconfigured' })).toEqual({
			kind: 'files_unconfigured',
			message: 'File uploads are temporarily unavailable. Please try again later.'
		});
	});

	it('maps 413 by status when error code missing', () => {
		expect(mapPrintFilesError(413, {})).toEqual({
			kind: 'file_too_large',
			message: 'Model file must be less than 50MB.'
		});
	});

	it('maps 415 by status when error code missing', () => {
		expect(mapPrintFilesError(415, {})).toEqual({
			kind: 'invalid_file_type',
			message: 'Only .stl files are allowed.'
		});
	});

	it('maps 429 by status when error code missing', () => {
		expect(mapPrintFilesError(429, {})).toEqual({
			kind: 'quota_exceeded',
			message: 'You have reached your daily quote request limit.'
		});
	});

	it('maps 503 by status when error code missing', () => {
		expect(mapPrintFilesError(503, {})).toEqual({
			kind: 'files_unconfigured',
			message: 'File uploads are temporarily unavailable. Please try again later.'
		});
	});
});
