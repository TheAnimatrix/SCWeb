<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';

	import { fetchPincodeLookup } from '$lib/client/pincode';
	import { ScInput } from '$lib/components/sc';
	import * as Select from '$lib/components/ui/select';
	import { indianStates } from '$lib/types/product';
	import { cn } from '$lib/utils';

	interface Props {
		pincode?: string;
		city?: string;
		state?: string;
		idPrefix: string;
		labelClass?: string;
		size?: 'default' | 'sm';
		class?: string;
	}

	let {
		pincode = $bindable(''),
		city = $bindable(''),
		state: selectedState = $bindable(''),
		idPrefix,
		labelClass = 'text-sm font-medium text-foreground',
		size = 'default',
		class: className = ''
	}: Props = $props();

	const stateItems = indianStates.map((name) => ({ value: name, label: name }));

	let cityOptions = $state<string[]>([]);
	let pincodeLoading = $state(false);
	let pincodeHint = $state<string | null>(null);
	let lastFetchedPincode = $state('');

	const selectTriggerClass = $derived(
		cn(
			'border-border bg-card text-foreground focus:border-foreground/30 focus:ring-foreground/10',
			size === 'sm' ? 'h-9 text-sm' : 'h-10 text-sm'
		)
	);

	const cityItems = $derived(cityOptions.map((name) => ({ value: name, label: name })));
	const stateLabel = $derived(selectedState || 'Select state');
	const cityLabel = $derived(city || (cityOptions.length ? 'Select city' : 'Enter city'));

	function sanitizePincode(value: string): string {
		return value.replace(/\D/g, '').slice(0, 6);
	}

	function applyLookupResult(result: { state: string; cities: string[] }) {
		selectedState = result.state;
		cityOptions = result.cities;

		if (result.cities.length === 1) {
			city = result.cities[0] ?? '';
			pincodeHint = null;
			return;
		}

		if (result.cities.length > 1) {
			if (!result.cities.includes(city)) {
				city = '';
			}
			pincodeHint = `${result.cities.length} cities found — pick yours`;
			return;
		}

		pincodeHint = null;
	}

	async function lookupFromPincode(nextPincode: string) {
		if (nextPincode.length !== 6 || nextPincode === lastFetchedPincode) return;

		pincodeLoading = true;
		pincodeHint = null;

		const result = await fetchPincodeLookup(fetch, nextPincode);
		lastFetchedPincode = nextPincode;
		pincodeLoading = false;

		if (!result.ok) {
			cityOptions = [];
			pincodeHint =
				result.error === 'not_found' ? 'Pincode not found' : 'Could not look up pincode';
			return;
		}

		applyLookupResult(result);
	}

	function handlePincodeInput() {
		const nextPincode = sanitizePincode(pincode);
		if (nextPincode !== pincode) {
			pincode = nextPincode;
		}

		if (nextPincode.length < 6) {
			lastFetchedPincode = '';
			pincodeHint = null;
			if (nextPincode.length === 0) {
				cityOptions = [];
			}
			return;
		}

		void lookupFromPincode(nextPincode);
	}

	$effect(() => {
		if (pincode.length === 6 && pincode !== lastFetchedPincode) {
			void lookupFromPincode(pincode);
		}
	});
</script>

<div class={cn('space-y-4', className)}>
	<div class="space-y-1.5">
		<label for="{idPrefix}-pincode" class={labelClass}>Pincode</label>
		<div class="relative">
			<ScInput
				id="{idPrefix}-pincode"
				type="text"
				{size}
				glow={false}
				placeholder="6-digit pincode"
				bind:value={pincode}
				maxlength={6}
				inputmode="numeric"
				autocomplete="postal-code"
				oninput={handlePincodeInput} />
			{#if pincodeLoading}
				<Icon
					icon={F.refresh}
					class="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
					aria-hidden="true" />
			{/if}
		</div>
		{#if pincodeHint}
			<p class="text-xs text-muted-foreground">{pincodeHint}</p>
		{/if}
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div class="space-y-1.5">
			<label for="{idPrefix}-city" class={labelClass}>City</label>
			{#if cityOptions.length > 0}
				<Select.Root type="single" items={cityItems} bind:value={city}>
					<Select.Trigger id="{idPrefix}-city" class={selectTriggerClass}>
						<span class:truncate={true} class:text-muted-foreground={!city}>{cityLabel}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							{#each cityItems as item (item.value)}
								<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			{:else}
				<ScInput
					id="{idPrefix}-city"
					type="text"
					{size}
					glow={false}
					placeholder="City / district"
					bind:value={city}
					autocomplete="address-level2" />
			{/if}
		</div>

		<div class="space-y-1.5">
			<label for="{idPrefix}-state" class={labelClass}>State</label>
			<Select.Root type="single" items={stateItems} bind:value={selectedState}>
				<Select.Trigger id="{idPrefix}-state" class={selectTriggerClass}>
					<span class:truncate={true} class:text-muted-foreground={!selectedState}>{stateLabel}</span>
				</Select.Trigger>
				<Select.Content class="max-h-60">
					<Select.Group>
						{#each stateItems as item (item.value)}
							<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
		</div>
	</div>
</div>
