<span class="loader"></span>

<style>
	.loader {
		@apply relative flex items-center justify-center w-full max-w-[5rem] mt-[3rem] mb-[3rem];
	}
	.loader:before,
	.loader:after {
		content: '';
		position: absolute;
		border-radius: 50%;
		animation: pulsOut 1.8s ease-in-out infinite;
		@apply drop-shadow-[0_0_1rem_rgba(255,255,255,0.75)];
	}
	.loader:before {
		width: 100%;
		padding-bottom: 100%;
		box-shadow: inset 0 0 0 1rem #fff;
		animation-name: pulsIn;
	}
	.loader:after {
		width: calc(100% - 2rem);
		padding-bottom: calc(100% - 2rem);
		box-shadow: 0 0 0 0 #fff;
	}

	@keyframes pulsIn {
		0% {
			box-shadow: inset 0 0 0 1rem #fff;
			opacity: 1;
		}
		50%,
		100% {
			box-shadow: inset 0 0 0 0 #fff;
			opacity: 0;
		}
	}

	@keyframes pulsOut {
		0%,
		50% {
			box-shadow: 0 0 0 0 #fff;
			opacity: 0;
		}
		100% {
			box-shadow: 0 0 0 1rem #fff;
			opacity: 1;
		}
	}
</style>
