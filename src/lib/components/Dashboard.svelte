<script>
	import RequirementsForm from './RequirementsForm.svelte';
	import RequirementsList from './RequirementsList.svelte';
	import SemesterView from './SemesterView.svelte';
	import ScheduleSharing from './ScheduleSharing.svelte';
	import { onMount } from 'svelte';
	
	let activeTab = 'requirements';
	let requirementsList;
	let editingRequirement = null;
	
	function handleRequirementAdded(event) {
		if (requirementsList) {
			requirementsList.handleRequirementAdded(event);
		}
	}
	
	function handleRequirementUpdated(event) {
		if (requirementsList) {
			requirementsList.handleRequirementUpdated(event); // Use the proper update handler
		}
		editingRequirement = null; // Clear editing mode
	}
	
	function handleFullEdit(event) {
		editingRequirement = event.detail;
	}
	
	function handleCancelEdit() {
		editingRequirement = null;
	}
</script>

<div class="dashboard">
	<nav class="navigation">
		<div class="nav-container">
			<button 
				class="nav-btn" 
				class:active={activeTab === 'requirements'}
				on:click={() => activeTab = 'requirements'}
			>
				Requirements
			</button>
			<button 
				class="nav-btn" 
				class:active={activeTab === 'semesters'}
				on:click={() => activeTab = 'semesters'}
			>
				Semester Planning
			</button>
			<button 
				class="nav-btn" 
				class:active={activeTab === 'sharing'}
				on:click={() => activeTab = 'sharing'}
			>
				Sharing
			</button>
		</div>
	</nav>

	<main class="main-content">
		{#if activeTab === 'requirements'}
			<div class="requirements-section">
				<h2>Academic Requirements</h2>
				<p class="section-description">
					Add and manage your Core, Major, Pre-graduate, and other requirements
				</p>
				
				<div class="requirements-layout">
					<div class="requirements-grid">
						<div class="form-section">
							<RequirementsForm 
								bind:editingRequirement
								on:requirementAdded={handleRequirementAdded}
								on:requirementUpdated={handleRequirementUpdated}
								on:cancelEdit={handleCancelEdit}
							/>
						</div>
						<div class="list-section">
							<RequirementsList 
								bind:this={requirementsList}
								on:fullEdit={handleFullEdit}
							/>
						</div>
					</div>
					
				</div>
			</div>
		{:else if activeTab === 'semesters'}
			<div class="semesters-section">
				<SemesterView />
			</div>
		{:else if activeTab === 'sharing'}
			<div class="sharing-section">
				<h2>Schedule Sharing</h2>
				<p class="section-description">
					Share your academic schedule with advisors, family, or study partners. Create secure links with customizable permissions and expiration dates.
				</p>
				<ScheduleSharing />
			</div>
		{:else if activeTab === 'schedule'}
			<div class="coming-soon">
				<h2>Schedule Builder</h2>
				<p>Schedule planning functionality coming soon!</p>
			</div>
		{/if}
	</main>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		background-color: #f8fafc;
	}

	.navigation {
		background: white;
		border-bottom: 1px solid #e2e8f0;
	}

	.nav-container {
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		gap: 2rem;
	}

	.nav-btn {
		background: none;
		border: none;
		padding: 1rem 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: #64748b;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
	}

	.nav-btn:hover {
		color: #334155;
	}

	.nav-btn.active {
		color: #2563eb;
		border-bottom-color: #2563eb;
	}

	.main-content {
		max-width: 1280px;
		margin: 0 auto;
		padding: 2rem;
	}

	.requirements-section h2,
	.sharing-section h2 {
		font-size: 1.875rem;
		font-weight: 700;
		color: #1e293b;
		margin-bottom: 0.5rem;
	}

	.section-description {
		color: #64748b;
		margin-bottom: 2rem;
	}

	.requirements-layout {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	
	.requirements-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}
	
	.form-section,
	.list-section {
		background: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.semesters-section {
		height: calc(100vh - 140px); /* Account for header and nav */
		padding: 0;
	}

	.sharing-section {
		padding: 0;
	}
	
	.coming-soon {
		text-align: center;
		padding: 4rem 2rem;
	}

	.coming-soon h2 {
		font-size: 1.875rem;
		font-weight: 700;
		color: #1e293b;
		margin-bottom: 1rem;
	}

	.coming-soon p {
		color: #64748b;
	}

	@media (max-width: 768px) {
		.requirements-grid {
			grid-template-columns: 1fr;
		}
		
		.nav-container {
			padding: 0 1rem;
		}
		
		.main-content {
			padding: 1rem;
		}
	}
</style>