<script>
	import { onMount } from 'svelte';
	import { getRequirements, updateRequirement, deleteRequirement, toggleRequirementCompletion } from '$lib/requirements.js';
	import { enhanceCourseOption } from '$lib/catalog.js';
	import { checkMigrationNeeded, migrateRequirementsSchema } from '$lib/migration.js';
	
	let requirements = [];
	let loading = true;
	let error = null;
	let filterCategory = 'All';
	let editingId = null;
	let editData = {};
	let completionModalOpen = false;
	let completingRequirement = null;
	
	const categories = ['All', 'Core', 'Major', 'Pre-graduate'];
	
	onMount(() => {
		loadRequirements();
	});
	
	async function loadRequirements() {
		loading = true;
		
		const { data, error: loadError } = await getRequirements();
		
		if (loadError) {
			error = loadError.message;
		} else {
			requirements = data || [];
		}
		
		loading = false;
	}
	
	// Listen for new requirements from the form
	export function handleRequirementAdded(event) {
		requirements = [event.detail, ...requirements];
	}
	
	$: filteredRequirements = filterCategory === 'All' 
		? requirements 
		: requirements.filter(req => req.category === filterCategory);
	
	async function toggleCompletion(requirement) {
		if (!requirement.is_completed && requirement.course_options && requirement.course_options.length > 1) {
			// Show course selection modal for completion
			completingRequirement = requirement;
			completionModalOpen = true;
		} else {
			// Direct toggle for simple cases
			const completedWith = requirement.is_completed ? null : 
				(requirement.course_options && requirement.course_options.length === 1 ? 
					requirement.course_options[0].code : null);
			
			const { error: toggleError } = await updateRequirement(requirement.id, {
				is_completed: !requirement.is_completed,
				completed_with_course: completedWith
			});
			
			if (!toggleError) {
				requirements = requirements.map(req => 
					req.id === requirement.id 
						? { ...req, is_completed: !req.is_completed, completed_with_course: completedWith } 
						: req
				);
			}
		}
	}
	
	async function completeWithCourse(courseCode) {
		if (!completingRequirement) return;
		
		const { error: updateError } = await updateRequirement(completingRequirement.id, {
			is_completed: true,
			completed_with_course: courseCode
		});
		
		if (!updateError) {
			requirements = requirements.map(req => 
				req.id === completingRequirement.id 
					? { ...req, is_completed: true, completed_with_course: courseCode } 
					: req
			);
		}
		
		completionModalOpen = false;
		completingRequirement = null;
	}
	
	function cancelCompletion() {
		completionModalOpen = false;
		completingRequirement = null;
	}
	
	function startEdit(requirement) {
		editingId = requirement.id;
		editData = { ...requirement };
	}
	
	function cancelEdit() {
		editingId = null;
		editData = {};
	}
	
	async function saveEdit() {
		const { data, error: updateError } = await updateRequirement(editingId, {
			title: editData.title,
			description: editData.description,
			credits: editData.credits,
			priority: editData.priority,
			notes: editData.notes
		});
		
		if (!updateError) {
			requirements = requirements.map(req => 
				req.id === editingId ? data : req
			);
			cancelEdit();
		}
	}
	
	async function handleDelete(id) {
		if (confirm('Are you sure you want to delete this requirement?')) {
			const { error: deleteError } = await deleteRequirement(id);
			
			if (!deleteError) {
				requirements = requirements.filter(req => req.id !== id);
			}
		}
	}
	
	function getPriorityLabel(priority) {
		const labels = {
			1: 'Lowest',
			2: 'Low', 
			3: 'Medium',
			4: 'High',
			5: 'Highest'
		};
		return labels[priority] || 'Medium';
	}
	
	function getPriorityColor(priority) {
		const colors = {
			1: '#64748b',
			2: '#06b6d4',
			3: '#10b981', 
			4: '#f59e0b',
			5: '#ef4444'
		};
		return colors[priority] || '#10b981';
	}
</script>

<div class="list-container">
	<div class="list-header">
		<h3>Your Requirements</h3>
		
		<div class="filter-controls">
			<label for="category-filter">Filter by category:</label>
			<select id="category-filter" bind:value={filterCategory}>
				{#each categories as category}
					<option value={category}>{category}</option>
				{/each}
			</select>
		</div>
	</div>
	
	{#if loading}
		<div class="loading">Loading requirements...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if filteredRequirements.length === 0}
		<div class="empty-state">
			{filterCategory === 'All' 
				? 'No requirements added yet. Use the form to add your first requirement!'
				: `No ${filterCategory} requirements found.`
			}
		</div>
	{:else}
		<div class="requirements-list">
			{#each filteredRequirements as requirement (requirement.id)}
				<div class="requirement-card" class:completed={requirement.is_completed}>
					{#if editingId === requirement.id}
						<!-- Edit Mode -->
						<div class="edit-form">
							<input 
								type="text" 
								bind:value={editData.title}
								class="edit-input title-input"
							/>
							
							<div class="edit-row">
								<input 
									type="number" 
									bind:value={editData.credits}
									placeholder="Credits"
									class="edit-input"
									min="1" max="10"
								/>
							</div>
							
							<textarea 
								bind:value={editData.description}
								placeholder="Description"
								class="edit-input"
								rows="2"
							></textarea>
							
							<div class="edit-actions">
								<button class="save-btn" on:click={saveEdit}>Save</button>
								<button class="cancel-btn" on:click={cancelEdit}>Cancel</button>
							</div>
						</div>
					{:else}
						<!-- View Mode -->
						<div class="requirement-content">
							<!-- Top Row: Title, Category, Credits -->
							<div class="requirement-header">
								<h4 class="requirement-title">{requirement.title}</h4>
								<div class="requirement-meta">
									<span 
										class="category-badge"
										style="background-color: {requirement.category === 'Core' ? '#3b82f6' : requirement.category === 'Major' ? '#10b981' : '#8b5cf6'}"
									>
										{requirement.category}
									</span>
									
									{#if requirement.credits}
										<span class="credits">{requirement.credits} credits</span>
									{/if}
									
									<span 
										class="priority-badge"
										style="color: {getPriorityColor(requirement.priority)}"
									>
										{getPriorityLabel(requirement.priority)}
									</span>
								</div>
							</div>
							
						
							<!-- Course Options - Each on its own row -->
							{#if requirement.course_options && requirement.course_options.length > 0}
								<div class="course-options-list">
									{#each requirement.course_options as option, index}
										{@const enhancedOption = enhanceCourseOption(option)}
										<div class="course-option-row" title="{enhancedOption.description || (enhancedOption.name + (enhancedOption.credits ? ' - ' + enhancedOption.credits + ' credits' : ''))}">
											<span class="course-code">{enhancedOption.code}</span>
											{#if enhancedOption.name}
												<span class="course-name">{enhancedOption.name}</span>
											{/if}
											{#if enhancedOption.credits}
												<span class="course-credits">{enhancedOption.credits} credits</span>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
							
							{#if requirement.description}
								<p class="requirement-description">{requirement.description}</p>
							{/if}
							
							{#if requirement.is_completed && requirement.completed_with_course}
								<div class="completion-info">
									<strong>✓ Completed with:</strong> {requirement.completed_with_course}
								</div>
							{/if}
							
							{#if requirement.notes}
								<div class="requirement-notes">
									<strong>Notes:</strong> {requirement.notes}
								</div>
							{/if}
							
							<div class="requirement-actions">
								<button 
									class="completion-btn"
									class:completed={requirement.is_completed}
									on:click={() => toggleCompletion(requirement)}
								>
									{requirement.is_completed ? '✓ Completed' : 'Mark Complete'}
								</button>
								
								<button class="edit-btn" on:click={() => startEdit(requirement)}>
									Edit
								</button>
								
								<button class="delete-btn" on:click={() => handleDelete(requirement.id)}>
									Delete
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Course Selection Modal -->
{#if completionModalOpen && completingRequirement}
	<div class="modal-backdrop" role="button" tabindex="0" on:click={cancelCompletion} on:keydown={(e) => e.key === 'Escape' && cancelCompletion()}>
		<div class="modal-content" role="dialog" tabindex="-1" on:click|stopPropagation on:keydown={() => {}}>
			<h3>Complete Requirement</h3>
			<p>Which course did you use to complete "<strong>{completingRequirement.title}</strong>"?</p>
			
			<div class="course-selection">
				{#each completingRequirement.course_options as option}
					{@const enhancedOption = enhanceCourseOption(option)}
					<button 
						class="course-selection-btn"
						title="{enhancedOption.description || (enhancedOption.name + (enhancedOption.credits ? ' - ' + enhancedOption.credits + ' credits' : ''))}"
						on:click={() => completeWithCourse(option.code)}
					>
						<div class="course-selection-info">
							<span class="course-selection-code">{enhancedOption.code}</span>
							{#if enhancedOption.name}
								<span class="course-selection-name">
									{enhancedOption.name}
									{#if enhancedOption.credits}
										<span class="modal-credits">({enhancedOption.credits} credits)</span>
									{/if}
								</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
			
			<div class="modal-actions">
				<button class="modal-cancel-btn" on:click={cancelCompletion}>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.list-container {
		height: 100%;
	}
	
	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}
	
	.list-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0;
	}
	
	.filter-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}
	
	.filter-controls label {
		color: #6b7280;
	}
	
	.filter-controls select {
		padding: 0.25rem 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}
	
	.loading, .error, .empty-state {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}
	
	.error {
		color: #dc2626;
		background: #fef2f2;
		border-radius: 0.375rem;
	}
	
	.requirements-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-height: 600px;
		overflow-y: auto;
	}
	
	.requirement-card {
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1rem;
		background: white;
		transition: all 0.2s;
	}
	
	.requirement-card.completed {
		opacity: 0.7;
		background: #f8fafc;
	}
	
	.requirement-card:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	
	.requirement-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
	}
	
	.requirement-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0;
	}
	
	.course-options-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	
	.course-option-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		background: #f8fafc;
		border-radius: 0.375rem;
		border-left: 3px solid #3b82f6;
	}
	
	.course-option-row .course-code {
		font-family: monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1e293b;
		background: #ffffff;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid #d1d5db;
		min-width: 5rem;
		text-align: center;
	}
	
	.course-option-row .course-name {
		font-size: 0.875rem;
		color: #374151;
		flex: 1;
	}
	
	.course-option-row .course-credits {
		font-size: 0.75rem;
		color: #3b82f6;
		font-weight: 500;
		background: #eff6ff;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		border: 1px solid #dbeafe;
	}
	
	.requirement-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	
	.category-badge {
		font-size: 0.75rem;
		color: white;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-weight: 500;
	}
	
	.priority-badge {
		font-size: 0.75rem;
		font-weight: 500;
	}
	
	.credits {
		font-size: 0.75rem;
		color: #6b7280;
	}
	
	.requirement-description {
		color: #4b5563;
		font-size: 0.875rem;
		line-height: 1.4;
		margin-bottom: 0.5rem;
	}
	
	.completion-info {
		font-size: 0.75rem;
		color: #059669;
		background: #ecfdf5;
		padding: 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid #d1fae5;
		margin-bottom: 0.5rem;
	}
	
	.requirement-notes {
		font-size: 0.75rem;
		color: #6b7280;
		background: #f9fafb;
		padding: 0.5rem;
		border-radius: 0.25rem;
		margin-bottom: 0.75rem;
	}
	
	.requirement-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	
	.completion-btn {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
		padding: 0.375rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.completion-btn.completed {
		background: #10b981;
		color: white;
		border-color: #10b981;
	}
	
	.edit-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.375rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.edit-btn:hover {
		background: #2563eb;
	}
	
	.delete-btn {
		background: #ef4444;
		color: white;
		border: none;
		padding: 0.375rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.delete-btn:hover {
		background: #dc2626;
	}
	
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.edit-input {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}
	
	.title-input {
		font-weight: 600;
	}
	
	.edit-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
	
	.edit-actions {
		display: flex;
		gap: 0.5rem;
	}
	
	.save-btn {
		background: #10b981;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
		cursor: pointer;
	}
	
	.save-btn:hover {
		background: #059669;
	}
	
	.cancel-btn {
		background: #6b7280;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
		cursor: pointer;
	}
	
	.cancel-btn:hover {
		background: #4b5563;
	}
	
	/* Modal Styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}
	
	.modal-content {
		background: white;
		border-radius: 0.5rem;
		padding: 1.5rem;
		max-width: 400px;
		width: 100%;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
	}
	
	.modal-content h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 0.5rem;
	}
	
	.modal-content p {
		color: #64748b;
		margin-bottom: 1.5rem;
		line-height: 1.5;
	}
	
	.course-selection {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}
	
	.course-selection-btn {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 0.375rem;
		padding: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}
	
	.course-selection-btn:hover {
		border-color: #2563eb;
		background: #f8fafc;
	}
	
	.course-selection-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	
	.course-selection-code {
		font-family: monospace;
		font-weight: 600;
		color: #1e293b;
	}
	
	.course-selection-name {
		font-size: 0.875rem;
		color: #64748b;
	}
	
	.modal-credits {
		font-size: 0.75rem;
		color: #9ca3af;
		font-weight: 500;
		margin-left: 0.25rem;
	}
	
	.modal-actions {
		display: flex;
		justify-content: flex-end;
	}
	
	.modal-cancel-btn {
		background: #6b7280;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.modal-cancel-btn:hover {
		background: #4b5563;
	}
</style>