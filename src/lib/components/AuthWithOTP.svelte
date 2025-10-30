<script>
	import { supabase } from '$lib/supabaseClient.js';
	import { createEventDispatcher } from 'svelte';

	export let redirectTo = undefined;

	const dispatch = createEventDispatcher();

	let email = '';
	let otp = '';
	let loading = false;
	let message = '';
	let error = '';
	let showOtpInput = false;
	let otpSent = false;

	async function handleSignIn() {
		if (!email) {
			error = 'Please enter your email address';
			return;
		}

		loading = true;
		error = '';
		message = '';

		try {
			const { data, error: signInError } = await supabase.auth.signInWithOtp({
				email,
				options: {
					shouldCreateUser: true,
					emailRedirectTo: redirectTo
				}
			});

			if (signInError) {
				error = signInError.message;
			} else {
				otpSent = true;
				showOtpInput = true;
				message = 'Check your email for the verification code!';
			}
		} catch (err) {
			error = 'An unexpected error occurred';
			console.error('Auth error:', err);
		} finally {
			loading = false;
		}
	}

	async function handleVerifyOtp() {
		if (!otp) {
			error = 'Please enter the verification code';
			return;
		}

		loading = true;
		error = '';

		try {
			const { data, error: verifyError } = await supabase.auth.verifyOtp({
				email,
				token: otp,
				type: 'email'
			});

			if (verifyError) {
				error = verifyError.message;
			} else {
				message = 'Successfully signed in!';
				dispatch('success');
			}
		} catch (err) {
			error = 'An unexpected error occurred';
			console.error('OTP verification error:', err);
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		showOtpInput = false;
		otpSent = false;
		otp = '';
		message = '';
		error = '';
	}

	function handleResendOtp() {
		resetForm();
		handleSignIn();
	}
</script>

<div class="auth-container">
	<div class="auth-card">
		<h1>Welcome to Schedulator</h1>
		<p class="subtitle">Your college class scheduling assistant</p>
		
		<form on:submit|preventDefault={showOtpInput ? handleVerifyOtp : handleSignIn}>
			{#if !showOtpInput}
				<!-- Email Input -->
				<div class="form-group">
					<label for="email">Email address</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="Enter your email"
						disabled={loading}
						required
					/>
				</div>
				
				<button type="submit" class="submit-btn" disabled={loading}>
					{#if loading}
						<span class="loading-spinner"></span>
						Sending...
					{:else}
						Send verification code
					{/if}
				</button>
			{:else}
				<!-- OTP Input -->
				<div class="form-group">
					<label for="email-display">Email</label>
					<input
						id="email-display"
						type="email"
						value={email}
						disabled
						class="disabled-input"
					/>
				</div>
				
				<div class="form-group">
					<label for="otp">Verification code</label>
					<input
						id="otp"
						type="text"
						bind:value={otp}
						placeholder="Enter 6-digit code"
						maxlength="6"
						disabled={loading}
						required
					/>
				</div>
				
				<button type="submit" class="submit-btn" disabled={loading}>
					{#if loading}
						<span class="loading-spinner"></span>
						Verifying...
					{:else}
						Verify & Sign In
					{/if}
				</button>
				
				<div class="secondary-actions">
					<button type="button" class="link-btn" on:click={resetForm} disabled={loading}>
						Use different email
					</button>
					<button type="button" class="link-btn" on:click={handleResendOtp} disabled={loading}>
						Resend code
					</button>
				</div>
			{/if}
		</form>

		{#if message}
			<div class="message success">{message}</div>
		{/if}

		{#if error}
			<div class="message error">{error}</div>
		{/if}

		{#if otpSent && !showOtpInput}
			<div class="info-box">
				<p>We've sent a verification code to <strong>{email}</strong></p>
				<p class="small">The email contains both a magic link and a 6-digit code. You can either:</p>
				<ul class="small">
					<li>Click the magic link in your email, or</li>
					<li><button class="link-btn inline" on:click={() => showOtpInput = true}>Enter the 6-digit code manually</button></li>
				</ul>
			</div>
		{/if}
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
		max-width: 420px;
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

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 1rem;
		transition: border-color 0.2s, box-shadow 0.2s;
		box-sizing: border-box;
	}

	input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	input:disabled {
		background-color: #f9fafb;
		color: #6b7280;
		cursor: not-allowed;
	}

	.disabled-input {
		background-color: #f3f4f6;
		color: #6b7280;
	}

	.submit-btn {
		width: 100%;
		background: #2563eb;
		color: white;
		border: none;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.submit-btn:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.submit-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.secondary-actions {
		display: flex;
		justify-content: space-between;
		margin-top: 1rem;
		gap: 1rem;
	}

	.link-btn {
		background: none;
		border: none;
		color: #2563eb;
		cursor: pointer;
		font-size: 0.875rem;
		text-decoration: underline;
		padding: 0;
	}

	.link-btn:hover:not(:disabled) {
		color: #1d4ed8;
	}

	.link-btn:disabled {
		color: #9ca3af;
		cursor: not-allowed;
	}

	.link-btn.inline {
		display: inline;
		padding: 0;
	}

	.message {
		margin-top: 1rem;
		padding: 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
	}

	.message.success {
		background: #d1fae5;
		color: #065f46;
		border: 1px solid #a7f3d0;
	}

	.message.error {
		background: #fee2e2;
		color: #dc2626;
		border: 1px solid #fca5a5;
	}

	.info-box {
		margin-top: 1.5rem;
		padding: 1rem;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: #1e40af;
	}

	.info-box p {
		margin: 0 0 0.5rem 0;
	}

	.info-box p:last-child {
		margin-bottom: 0;
	}

	.info-box ul {
		margin: 0.5rem 0 0 1rem;
		padding: 0;
	}

	.info-box li {
		margin-bottom: 0.25rem;
	}

	.small {
		font-size: 0.8rem;
	}

	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>