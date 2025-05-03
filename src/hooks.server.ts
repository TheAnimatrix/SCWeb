import { SUPABASE_KEY } from '$env/static/private';
import { PUBLIC_IS_PRODUCTION, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createServerClient } from '@supabase/ssr'
import type { Handle } from '@sveltejs/kit'

import { v4 as uuidv4 } from 'uuid';

function generateUniqueId(): string {
  return uuidv4();
}

const CLIENT_ID_COOKIE_NAME = 'clientId';
export const handle: Handle = async ({ event, resolve }) => {
  const clientIdCookie = event.cookies.get(CLIENT_ID_COOKIE_NAME);
  const clientId = clientIdCookie || generateUniqueId();

  let options = {};
  if (PUBLIC_IS_PRODUCTION === "false") {
    options = { httpOnly: true, secure: false }
  }

  event.locals.clientId = clientId;
  event.cookies.set(CLIENT_ID_COOKIE_NAME, clientId, {
    path: '/',
    ...options
  });

  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => {
        return event.cookies.getAll()
      },
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' })
        })
      },
    },
  })

  event.locals.supabaseServer = createServerClient(PUBLIC_SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      // Implement no-op cookie handling using getAll/setAll
      getAll: () => {
        return []; // Return empty array as no cookies are managed by this client
      },
      setAll: (cookiesToSet) => {
        // Do nothing, as this client should not set cookies
      },
    },
  });


  event.locals.getSession = async () => {
    const { data: { session }, } = await event.locals.supabase.auth.getSession()
    if (!session) {
      return null;
    } 
    return session;
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range'
    },
  })
}