import type { MiddlewareHandler } from 'hono';
import type { MakerCapabilityKey } from '../db/schema/makerCapabilities.js';
import type { AppVariables, ResolvedMaker } from '../types/context.js';

export const requireMaker = (options?: {
	approvedOnly?: boolean;
}): MiddlewareHandler<{ Variables: AppVariables }> => {
	const approvedOnly = options?.approvedOnly ?? true;

	return async (c, next) => {
		const userId = c.get('actor').userId;
		if (!userId) {
			return c.json({ error: 'unauthorized', message: 'Authentication required' }, 401);
		}

		let maker = c.get('maker');
		if (!maker || maker.id !== userId) {
			maker = await c.get('makersStore').resolveMaker(userId);
			c.set('maker', maker);
		}

		if (!maker) {
			return c.json({ error: 'forbidden', message: 'Maker profile required' }, 403);
		}

		if (approvedOnly && maker.approved_state !== 'approved') {
			return c.json({ error: 'forbidden', message: 'Approved maker required' }, 403);
		}

		await next();
	};
};

export const requireCapability = (
	capability: MakerCapabilityKey
): MiddlewareHandler<{ Variables: AppVariables }> => {
	return async (c, next) => {
		const userId = c.get('actor').userId;
		if (!userId) {
			return c.json({ error: 'unauthorized', message: 'Authentication required' }, 401);
		}

		let maker = c.get('maker') as ResolvedMaker | null | undefined;
		if (!maker || maker.id !== userId) {
			maker = await c.get('makersStore').resolveMaker(userId);
			c.set('maker', maker);
		}

		if (!maker || maker.approved_state !== 'approved') {
			return c.json({ error: 'forbidden', message: 'Approved maker required' }, 403);
		}

		if (!maker.capabilities.includes(capability)) {
			return c.json(
				{ error: 'forbidden', message: `Capability required: ${capability}` },
				403
			);
		}

		await next();
	};
};

export const requireStaff = (): MiddlewareHandler<{ Variables: AppVariables }> => {
	return async (c, next) => {
		const userId = c.get('actor').userId;
		if (!userId) {
			return c.json({ error: 'unauthorized', message: 'Authentication required' }, 401);
		}

		const staffIds = (c.get('env').STAFF_USER_IDS ?? '')
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean);

		if (staffIds.length === 0 || !staffIds.includes(userId)) {
			return c.json({ error: 'forbidden', message: 'Staff access required' }, 403);
		}

		await next();
	};
};
