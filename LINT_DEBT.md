# Lint debt (intentional — requires refactors)

Tracked rule violations deferred from the mechanical lint pass. Do not add inline `eslint-disable` comments; fix these in dedicated work units.

| Rule                                 | Files | Count | Notes                                                                  |
| ------------------------------------ | ----- | ----- | ---------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any` | 24    | 51    | Replace `any` with proper Supabase/portal/product types                |
| `svelte/require-each-key`            | 10    | 18    | Add stable keys to `{#each}` blocks in portal, orders, product UI      |
| `svelte/no-at-html-tags`             | 4     | 4     | Sanitize or replace `{@html}` in policy/markdown/product components    |
| `@typescript-eslint/ban-ts-comment`  | 1     | 4     | Razorpay checkout: replace `@ts-ignore` with typed SDK wrapper         |
| `svelte/no-unused-svelte-ignore`     | 1     | 2     | Remove stale `svelte-ignore` comments in maker portal page             |
| `svelte/no-dom-manipulating`         | 1     | 1     | ModelViewer: refactor Three.js canvas setup to Svelte actions/bindings |

These rules are disabled in `eslint.config.js` until the above refactors land.
