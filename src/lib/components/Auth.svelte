<script>
	import { Auth } from '@supabase/auth-ui-svelte';
	import { ThemeSupa } from '@supabase/auth-ui-shared';
	import { supabase } from '$lib/supabaseClient.js';

	export let redirectTo = undefined;
</script>

<div class="auth-container">
	<div class="auth-card">
		<h1>Welcome to Schedulator</h1>
		<p class="subtitle">Your college class scheduling assistant</p>
		
		<Auth 
			supabaseClient={supabase}
			view="magic_link"
			appearance={{ 
				theme: ThemeSupa,
				variables: {
					default: {
						colors: {
							brand: '#2563eb',
							brandAccent: '#1d4ed8',
						}
					}
				}
			}}
			theme="light"
			showLinks={false}
			providers={[]}
			{redirectTo}
			magicLink={true}
		/>
	</div>
</div>

<style>
	.auth-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 1rem;
	}

	.auth-card {
		background: white;
		padding: 2rem;
		border-radius: 1rem;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		width: 100%;
		max-width: 400px;
	}

	h1 {
		font-size: 1.875rem;
		font-weight: 700;
		text-align: center;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		text-align: center;
		color: #6b7280;
		margin-bottom: 2rem;
		font-size: 0.875rem;
	}
</style>