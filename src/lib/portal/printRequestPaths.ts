const PRINT_REQUEST_DETAIL_PATH = /^\/3dp-portal\/(maker|user)\/[^/]+$/;

export function isPrintRequestDetailPath(pathname: string): boolean {
	return PRINT_REQUEST_DETAIL_PATH.test(pathname);
}
