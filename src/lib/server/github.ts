const GITHUB_REPO = 'TheAnimatrix/SCWeb';
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedStars: { count: number; fetchedAt: number } | null = null;

export async function getGithubStars(): Promise<number | null> {
	if (cachedStars && Date.now() - cachedStars.fetchedAt < CACHE_TTL_MS) {
		return cachedStars.count;
	}

	try {
		const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
			headers: {
				Accept: 'application/vnd.github+json',
				'User-Agent': 'Selfcrafted-Web'
			}
		});

		if (!res.ok) return cachedStars?.count ?? null;

		const data = (await res.json()) as { stargazers_count?: number };
		const count = data.stargazers_count;

		if (typeof count !== 'number') return cachedStars?.count ?? null;

		cachedStars = { count, fetchedAt: Date.now() };
		return count;
	} catch {
		return cachedStars?.count ?? null;
	}
}
