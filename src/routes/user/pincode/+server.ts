// https://api.data.gov.in/resource/6176ee09-3d56-4a3b-8115-21841576b2f6?api-key=579b464db66ec23bdd000001271c1812892a42b45bea2ebd8ae559d8&format=json&limit=1&filters%5Bpincode%5D=533401

import { redirect } from '@sveltejs/kit';

export const GET = async (event) => {
	const {
		url,
		locals: { supabase }
	} = event;

    const code = url.searchParams.get('code')

    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    }

	const token_hash = url.searchParams.get('token_hash') as string;
	const type = url.searchParams.get('type') as string;
	const next = url.searchParams.get('next') ?? '/';

  if (token_hash && type) {
    const { error } = await supabase.auth.getSession()
    if (!error) {
      throw redirect(303, `/${next.slice(1)}`);
    }
  }

  // return the user to an error page with some instructions
  throw redirect(303, '/error');
};