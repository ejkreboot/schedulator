<script>
	import { user, loading } from '$lib/auth.js';
	import Auth from '$lib/components/Auth.svelte';
	import Dashboard from '$lib/components/Dashboard.svelte';
	import SemesterView from '$lib/components/SemesterView.svelte';

	export let data = {};
</script>

{#if data.sharedSchedule}
	<!-- Shared schedule mode -->
	<div class="shared-dashboard">
		<!-- Standard Schedulator Header -->
		<header class="header">
			<div class="header-content">
				<h1>Schedulator</h1>
				<div class="shared-info">
					<div class="shared-notification">
						<svg class="shared-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
						</svg>
						<span class="shared-label">Shared Schedule</span>
					</div>
					<span class="permission-badge {data.sharedSchedule.shareData.permissionLevel === 'edit' ? 'permission-edit' : 'permission-view'}">
						{data.sharedSchedule.shareData.permissionLevel === 'edit' ? 'Can Edit' : 'View Only'}
					</span>
				</div>
			</div>
		</header>

		<!-- Shared Schedule Info Banner -->
		<div class="info-banner">
			<div class="banner-content">
				<div class="banner-header">
					{#if data.sharedSchedule.shareData.description}
						<h2 class="schedule-title">{data.sharedSchedule.shareData.description}</h2>
					{:else}
						<h2 class="schedule-title">Shared Academic Schedule</h2>
					{/if}
				</div>
				
				<div class="banner-description">
					{#if data.sharedSchedule.shareData.permissionLevel === 'view'}
						<p class="description-text">
							<svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
							You're viewing a read-only academic schedule. You can see the planned courses but cannot make changes.
						</p>
					{:else}
						<p class="description-text">
							<svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
							You can view and edit this academic schedule. Drag courses from requirements to semesters to make changes.
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
	<div class="main-content" style="padding-left: 20px; padding-right: 20px; max-width: 1240px; margin-right:auto; margin-left:auto;">

	<SemesterView
		sharedMode={true}
		shareData={data.sharedSchedule.shareData}
		scheduleData={data.sharedSchedule.scheduleData}
		shareToken={data.sharedSchedule.shareToken}
	/>
	</div>
{:else if $loading}
	<!-- Normal loading state -->
	<div class="loading-container">
		<div class="spinner"></div>
		<p>Loading...</p>
	</div>
{:else if $user}
	<!-- Normal authenticated user -->
	<Dashboard />
{:else}
	<!-- Not authenticated and no shared schedule -->
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

	.shared-dashboard {
		background-color: #f8fafc;
	}

	/* Standard Header Styling (matches Dashboard.svelte) */
	.header {
		background: white;
		border-bottom: 1px solid #e2e8f0;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.header-content {
		max-width: 1280px;
		margin: 0 auto;
		padding: 1rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0;
	}

	.shared-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.875rem;
	}

	.shared-notification {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #64748b;
		background: #f1f5f9;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid #e2e8f0;
	}

	.shared-icon {
		width: 1rem;
		height: 1rem;
		color: #2563eb;
	}

	.shared-label {
		font-weight: 500;
	}

	.permission-badge {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.375rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid transparent;
	}

	.permission-badge.permission-view {
		background: #dbeafe;
		color: #1d4ed8;
		border-color: #93c5fd;
	}

	.permission-badge.permission-edit {
		background: #fed7aa;
		color: #c2410c;
		border-color: #fdba74;
	}

	/* Info Banner */
	.info-banner {
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		border-bottom: 1px solid #e2e8f0;
	}

	.banner-content {
		max-width: 1280px;
		margin: 0 auto;
		padding: 1.5rem 2rem;
	}

	.banner-header {
		margin-bottom: 0.75rem;
	}

	.schedule-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0;
	}

	.banner-description {
		display: flex;
		align-items: flex-start;
	}

	.description-text {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		color: #64748b;
		line-height: 1.5;
		margin: 0;
		font-size: 0.875rem;
	}

	.info-icon {
		width: 1rem;
		height: 1rem;
		color: #2563eb;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.header-content {
			padding: 1rem;
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.shared-info {
			align-self: stretch;
			justify-content: space-between;
		}

		.banner-content {
			padding: 1rem;
		}

		.schedule-title {
			font-size: 1.125rem;
		}

		.description-text {
			font-size: 0.813rem;
		}
	}
</style>
