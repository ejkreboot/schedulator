<script>
	import { user, loading } from '$lib/auth.js';
	import Auth from '$lib/components/Auth.svelte';
	import Dashboard from '$lib/components/Dashboard.svelte';
</script>

{#if $loading}
	<div class="loading-container">
		<div class="spinner"></div>
		<p>Loading...</p>
	</div>
{:else if $user}
	<Dashboard />
{:else}
	<Auth />
{/if}

<style>
	.loading-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #2563eb;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>
