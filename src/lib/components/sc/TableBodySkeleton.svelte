<script lang="ts">
	import Skeleton from './Skeleton.svelte';

	interface Props {
		rows?: number;
		columns?: number;
	}

	let { rows = 5, columns = 5 }: Props = $props();
</script>

<tbody class="divide-y divide-border" aria-hidden="true">
	{#each Array(rows) as _, rowIndex (rowIndex)}
		<tr>
			{#each Array(columns) as _, colIndex (colIndex)}
				<td class="px-4 py-3">
					<Skeleton
						class="h-4 rounded-sm {colIndex === 0 ? 'w-24' : colIndex === columns - 1 ? 'w-16' : 'w-20'}"
					/>
				</td>
			{/each}
		</tr>
	{/each}
</tbody>
