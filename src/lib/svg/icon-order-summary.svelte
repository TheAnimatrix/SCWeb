<script lang="ts">
	interface Props {
		[key: string]: any
	}

	let { ...props }: Props = $props();
</script>

<svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
<path opacity="0.16" d="M11.7917 10L14.5 7.5H15.5H41.3333V36.6667C41.3333 37.7717 40.8943 38.8315 40.1129 39.6129C39.3315 40.3943 38.2717 40.8333 37.1667 40.8333H12.1667C11.0616 40.8333 10.0018 40.3943 9.22039 39.6129C8.43899 38.8315 8 37.7717 8 36.6667V14.5V13.5L11.7917 10Z" fill="currentcolor"/>
<path d="M8 14.5V36.6667C8 37.7717 8.43899 38.8315 9.22039 39.6129C10.0018 40.3943 11.0616 40.8333 12.1667 40.8333H37.1667C38.2717 40.8333 39.3315 40.3943 40.1129 39.6129C40.8943 38.8315 41.3333 37.7717 41.3333 36.6667V7.5H15.5M8 14.5L15.5 7.5M8 14.5H15.5V7.5" stroke="currentcolor" stroke-width="2.91667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18 22H32M18 33.5H32M18 27.5H32M23.5 16H32" stroke="currentcolor" stroke-width="2.92" stroke-linecap="round"/>
</svg>
