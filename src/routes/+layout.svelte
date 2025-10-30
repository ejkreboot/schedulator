<script>
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Schedulator - College Class Scheduling</title>
	<meta name="description" content="Manage your college course requirements and build your class schedule" />
</svelte:head>

{@render children?.()}

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		line-height: 1.6;
		background-color: #f8fafc;
	}

	:global(h1, h2, h3, h4, h5, h6) {
		line-height: 1.2;
	}

	:global(button) {
		font-family: inherit;
	}

	:global(input, select, textarea) {
		font-family: inherit;
	}
</style>
