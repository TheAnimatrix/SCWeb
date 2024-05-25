import { fontFamily } from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
const config = {
	darkMode: ['class'],
	content: ['./src/**/*.{html,js,svelte,ts}'],
	safelist: ['dark'],
	// plugins: [require('daisyui')],
	// daisyui: {
	// 	themes:false,
	// 	base:false,
	// 	prefix:"daisy-",
	// 	styled:false,	
	// },
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border) / <alpha-value>)',
				input: 'hsl(var(--input) / <alpha-value>)',
				ring: 'hsl(var(--ring) / <alpha-value>)',
				background: 'hsl(var(--background) / <alpha-value>)',
				foreground: 'hsl(var(--foreground) / <alpha-value>)',
				primary: {
					DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
					foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
					foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
					foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
					foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
					foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
					foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
				},
				card: {
					DEFAULT: 'hsl(var(--card) / <alpha-value>)',
					foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
				},
				black: colors.black,
				white: colors.white,
				red: colors.red,
				cyan: colors.cyan,
				blue: colors.blue,
				fuchsia: colors.fuchsia,
				violet: colors.violet,
				orange: colors.orange,
				gray: colors.gray,
				slate: colors.slate,
				green: colors.emerald,
				purple: colors.purple,
				yellow: colors.amber,
				pink: colors.pink,
				transparent: 'transparent',
				current: 'currentColor',
				scbg: '#232323',
				scbgl1: '#2c2c2c',
				scbgl2: '#343434',
				scbgl3: '#383838',
				scblue: 'hsl(213, 99%, 71%)',
				scblued1: 'hsl(213, 49%, 12%)',
				scblued2: 'hsl(213, 50%, 16%)',
				scblued3: 'hsl(213, 43%, 22%)',
				scbluek1: 'hsl(213, 44%, 5%)',
				scbluek2: 'hsl(213, 57%, 11%)',
				scbluel0: 'hsl(213, 92%, 73%)',
				scbluel1: 'hsl(213, 92%, 86%)',
				scbluel2: 'hsl(213, 92%, 93%)',
				scpurple: 'hsl(225, 100%, 61.18%)',
				scpurpled1: 'hsl(225, 49.21%, 12.35%)',
				scpurpled2: 'hsl(225, 43.86%, 22.35%)',
				scpurpled3: 'hsl(225, 43.86%, 22.35%)',
				scpurpled4: 'hsl(225, 48.39%, 30.39%)',
				scpurpled0: 'hsl(225, 71.72%, 61.18%)',
				scpurplel0: 'hsl(225, 92.59%, 73.53%)',
				scpurplel1: 'hsl(225, 100%, 85.69%)',
				scpurplel2: 'hsl(225, 100%, 96.27%)',
				scpurplek1: 'hsl(225, 44.83%, 7%)',
				scpurplek2: 'hsl(225, 57.14%, 12%)',
				scorange: '#e58529',
				scoranged1: '#1c120a',
				scoranged2: '#2a1f1a',
				scoranged3: '#3B2F4A',
				scoranged0: '#8955e3',
				scorangel0: '#ab7dfa',
				scorangel1: '#f4b679',
				scorangel2: '#F4ECFF',
				sccyan: '#93CFC0',
				sccyanl1: '#B3FFE0',
				sccyand1: '#182322',
				scred: '#C53333',
				scredd1: '#171313',
				scredl1: 'hsl(5, 60%, 88%)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: [...fontFamily.sans],
				figtree: ['figtree', 'sans-serif']
			}
		},
		plugins: []
	}
};

export default config;
