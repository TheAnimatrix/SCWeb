<script>
	import Header from './Header.svelte';
	import './styles.css';
	import './stylesheets/main.css';
</script>

<main>
	<table id="app_main_table">
		<tr id="app_main_row">
			<td id="sidebar_col">
				<Header />
			</td>
			<td>
				<div><p>Hello World!</p></div>
			</td>
		</tr>
	</table>
</main>

<!-- <div class="app">
	<Header />

	<main>
		<slot />
	</main>
</div>

<style>
	.app {
		background-color: #2c2c2c;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style> -->
