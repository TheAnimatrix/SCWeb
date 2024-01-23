import { fontFamily } from "tailwindcss/defaultTheme";
const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
const config = {
	darkMode: ["class"],
	content: ["./src/**/*.{html,js,svelte,ts}"],
  safelist: ["dark"],
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px"
			}
		},
		extend: {
			colors: {
				border: "hsl(var(--border) / <alpha-value>)",
				input: "hsl(var(--input) / <alpha-value>)",
				ring: "hsl(var(--ring) / <alpha-value>)",
				background: "hsl(var(--background) / <alpha-value>)",
				foreground: "hsl(var(--foreground) / <alpha-value>)",
				primary: {
					DEFAULT: "hsl(var(--primary) / <alpha-value>)",
					foreground: "hsl(var(--primary-foreground) / <alpha-value>)"
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
					foreground: "hsl(var(--secondary-foreground) / <alpha-value>)"
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
					foreground: "hsl(var(--destructive-foreground) / <alpha-value>)"
				},
				muted: {
					DEFAULT: "hsl(var(--muted) / <alpha-value>)",
					foreground: "hsl(var(--muted-foreground) / <alpha-value>)"
				},
				accent: {
					DEFAULT: "hsl(var(--accent) / <alpha-value>)",
					foreground: "hsl(var(--accent-foreground) / <alpha-value>)"
				},
				popover: {
					DEFAULT: "hsl(var(--popover) / <alpha-value>)",
					foreground: "hsl(var(--popover-foreground) / <alpha-value>)"
				},
				card: {
					DEFAULT: "hsl(var(--card) / <alpha-value>)",
					foreground: "hsl(var(--card-foreground) / <alpha-value>)"
				},
        transparent: 'transparent',
        current: 'currentColor',
        black: colors.black,
        white: colors.white,
        red: colors.red,
        cyan: colors.cyan,
        blue: colors.blue,
        fuchsia: colors.fuchsia,
        violet: colors.violet,
        orange:colors.orange,
        gray: colors.gray,
        slate: colors.slate,
        green: colors.emerald,
        purple: colors.purple,
        yellow: colors.amber,
        pink: colors.pink,
        scbg: "#232323",
        scbgl1: "#2c2c2c",
        scbgl2: "#343434",
        scbgl3: "#383838",
        scpurple: '#9039FF',
        scpurpled1: '#1C102F',
        scpurpled2: '#2A2137',
        scpurpled3: '#3B2F4A',
        scpurpled0:'#8955e3',
        scpurplel0:'#ab7dfa',
        scpurplel1: "#e2b6ff",
        scpurplel2: "#F4ECFF",
        scorange: '#e58529',
        scoranged1: '#1c120a',
        scoranged2: '#2a1f1a',
        scoranged3: '#3B2F4A',
        scoranged0:'#8955e3',
        scorangel0:'#ab7dfa',
        scorangel1: "#f4b679",
        scorangel2: "#F4ECFF",
        sccyan: '#93CFC0',
        sccyanl1: '#B3FFE0'
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)"
			},
			fontFamily: {
				sans: [...fontFamily.sans],
        'figtree': ['figtree', 'sans-serif']
			}
		},
    plugins: [
    ]
	},
};

export default config;
