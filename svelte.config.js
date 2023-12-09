import adapter from '@sveltejs/adapter-auto';
import path from "path";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias : {
			'$libs' : path.resolve("./src/libs"),
			'$pages' : path.resolve("./src/routes")
		}
	}
};



export default config;
