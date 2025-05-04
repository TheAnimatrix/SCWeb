import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, clientId }, cookies }) => {
  const { session, user } = await safeGetSession()
  return {
    session: session,
    user: user,
    clientId : clientId,
    cookies : cookies.getAll()
  }
}