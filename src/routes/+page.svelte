<script lang="ts">
	import { page } from '$app/stores';
	console.log("Page data of this + children : ",$page);
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<div id="app_page_area">
	<p>hi</p>
</div>

<style>
	#app_page_area{
		background-color: black ;
	    height: 100%;
	    width: 100%;
	}
</style>