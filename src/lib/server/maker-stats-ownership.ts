/** Whether the authenticated user may trigger maker stats recalculation for makerId. */
export function isMakerStatsOwner(actorId: string, makerId: string): boolean {
	return actorId === makerId;
}
