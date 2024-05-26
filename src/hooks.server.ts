import { SUPABASE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
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

  event.locals.clientId = clientId;
  event.cookies.set(CLIENT_ID_COOKIE_NAME, clientId, {
    path: '/',
    httpOnly: true,
  });

  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => {
        event.cookies.set(key, value, { ...options, path: '/' });
      },
      remove: (key, options) => {
        event.cookies.delete(key, { ...options, path: '/' });
      },
    },
  });

  event.locals.supabaseServer = createServerClient(PUBLIC_SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      get: () => '',
      set: (_, __, ____) => undefined,
      remove: (_, __) => undefined,
    },
  });


  event.locals.getSession = async () => {
    const { data: { session } } = await event.locals.supabase.auth.getSession();
    return session;
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range'
    },
  })
}