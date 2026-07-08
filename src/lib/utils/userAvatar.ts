export function getAvatarUrlFromMetadata(
	metadata: Record<string, unknown> | null | undefined
): string | null {
	if (!metadata) return null;

	if (typeof metadata.avatar_url === 'string' && metadata.avatar_url) {
		return metadata.avatar_url;
	}

	if (typeof metadata.picture === 'string' && metadata.picture) {
		return metadata.picture;
	}

	return null;
}
