<script>
	import { createRequirement } from '$lib/requirements.js';
	import { createEventDispatcher } from 'svelte';
	import { user } from '$lib/auth.js';
	import { enhanceCourseOption } from '$lib/catalog.js';
	import CourseAutocomplete from './CourseAutocomplete.svelte';
	
	const dispatch = createEventDispatcher();
	
	let formData = {
		title: '',
		description: '',
		category: 'Core',
		course_options: [],
		credits: null,
		priority: 3,
		notes: ''
	};
	
	let newCourseCode = '';
	let newCourseName = '';
    let newCourseCredits = '';
	let newCourseDescription = '';
	let courseSearchValue = '';
	
	let isSubmitting = false;
	let error = null;
	
	const categories = [
		{ value: 'Core', label: 'Core Requirements' },
		{ value: 'Major', label: 'Major Requirements' },
		{ value: 'Pre-graduate', label: 'Pre-graduate School' },
		{ value: 'Electives', label: 'Electives' }
	];
	
	const priorities = [
		{ value: 1, label: '1 - Lowest' },
		{ value: 2, label: '2 - Low' },
		{ value: 3, label: '3 - Medium' },
		{ value: 4, label: '4 - High' },
		{ value: 5, label: '5 - Highest' }
	];
	
	function addCourseOption() {
		if (!newCourseCode.trim()) return;
		
		const courseOption = {
			code: newCourseCode.trim(),
			name: newCourseName.trim() || '',
			semester_hours: newCourseCredits ? parseInt(newCourseCredits) : null,
			description: newCourseDescription.trim() || ''
		};
		
		// Check if course code already exists
		if (formData.course_options.some(option => option.code === courseOption.code)) {
			error = 'Course code already added';
			return;
		}
		
		formData.course_options = [...formData.course_options, courseOption];
		clearCourseInputs();
		error = null;
	}
	
	function clearCourseInputs() {
		newCourseCode = '';
		newCourseName = '';
        newCourseCredits = '';
		newCourseDescription = '';
		courseSearchValue = '';
	}
	
	function handleCourseSelect(event) {
		const selectedCourse = event.detail;
		newCourseCode = selectedCourse.code;
		newCourseName = selectedCourse.name;
        newCourseCredits = selectedCourse.semester_hours;
		newCourseDescription = selectedCourse.description || '';
		courseSearchValue = selectedCourse.code;
		
		// Auto-add if this is a unique selection
		setTimeout(() => {
			addCourseOption();
		}, 100);
	}
	
	function handleManualAdd() {
		// For manual entry when user types without selecting from autocomplete
		if (courseSearchValue && !newCourseCode) {
			newCourseCode = courseSearchValue;
		}
		addCourseOption();
	}
	
	function removeCourseOption(index) {
		formData.course_options = formData.course_options.filter((_, i) => i !== index);
	}
	
	function handleCourseKeydown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addCourseOption();
		}
	}

	async function handleSubmit(event) {
		event.preventDefault();
		
		if (!formData.title.trim()) {
			error = 'Title is required';
			return;
		}
		
		if (!$user?.id) {
			error = 'You must be logged in to create requirements';
			return;
		}
		
		isSubmitting = true;
		error = null;
		
		// Add user_id to the form data
		const requirementData = {
			...formData,
			user_id: $user.id
		};
		
		const { data, error: submitError } = await createRequirement(requirementData);
		
		if (submitError) {
			error = submitError.message;
		} else {
			// Reset form
			formData = {
				title: '',
				description: '',
				category: 'Core',
				course_options: [],
				credits: null,
				priority: 3,
				notes: ''
			};
			clearCourseInputs();
			
			// Notify parent component
			dispatch('requirementAdded', data);
		}
		
		isSubmitting = false;
	}
</script>

<div class="form-container">
	<h3>Add New Requirement</h3>
	
	<form on:submit={handleSubmit} class="requirement-form">
		{#if error}
			<div class="error-message">
				{error}
			</div>
		{/if}
		
		<div class="form-group">
			<label for="title">Title *</label>
			<input
				type="text"
				id="title"
				bind:value={formData.title}
				placeholder="e.g., Biological Science Core, Pre-OT, Honors Program"
				required
			/>
		</div>
		
		<div class="form-group">
			<label for="category">Category *</label>
			<select id="category" bind:value={formData.category} required>
				{#each categories as category}
					<option value={category.value}>{category.label}</option>
				{/each}
			</select>
		</div>
		
		<div class="form-group">
			<span class="form-label">Course Options</span>
			<div class="course-options-section">
				<div class="add-course-section">
					<div class="autocomplete-section">
						<label for="course-search" class="autocomplete-label">
							Search Course Catalog
						</label>
						<CourseAutocomplete
							bind:value={courseSearchValue}
							placeholder="Type course code or name... (e.g., MATH 101 or Calculus)"
							on:select={handleCourseSelect}
						/>
						<p class="autocomplete-help">
							Start typing to search {Math.floor(9565).toLocaleString()} courses in the catalog
						</p>
					</div>
					
					<div class="manual-section">
						<span class="section-divider">OR</span>
						<div class="manual-inputs">
							<input
								type="text"
								bind:value={newCourseCode}
								placeholder="Course Code (e.g., MATH 101)"
								on:keydown={handleCourseKeydown}
								class="course-code-input"
							/>
							<input
								type="text"
								bind:value={newCourseName}
								placeholder="Course Name (optional)"
								on:keydown={handleCourseKeydown}
								class="course-name-input"
							/>
							<button 
								type="button" 
								class="add-course-btn"
								on:click={handleManualAdd}
								disabled={!newCourseCode.trim() && !courseSearchValue.trim()}
							>
								Add
							</button>
						</div>
					</div>
				</div>
				
				{#if formData.course_options.length > 0}
					<div class="course-options-list">
						{#each formData.course_options as option, index}
							{@const enhancedOption = enhanceCourseOption(option)}
							<div class="course-option-item" title="{enhancedOption.description || (enhancedOption.name + (enhancedOption.credits ? ' - ' + enhancedOption.credits + ' credits' : ''))}">
								<div class="course-info">
									<div class="course-main">
										<div class="course-content">
											<div class="course-left">
												<span class="course-code">{enhancedOption.code}</span>
												{#if enhancedOption.name}
													<span class="course-name">{enhancedOption.name}</span>
												{/if}
											</div>
											<div class="course-right">
												{#if enhancedOption.name && enhancedOption.credits}
													<div class="course-credits">{enhancedOption.credits} credit{enhancedOption.credits !== 1 ? 's' : ''}</div>
												{/if}
											</div>
										</div>
									</div>
								</div>
								<button 
									type="button" 
									class="remove-course-btn"
									on:click={() => removeCourseOption(index)}
									aria-label="Remove course option"
								>
									×
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
		
		<div class="form-group">
			<label for="credits">Credits</label>
			<input
				type="number"
				id="credits"
				bind:value={formData.credits}
				min="1"
				max="10"
				placeholder="e.g., 3"
			/>
		</div>
		
		<div class="form-group">
			<label for="priority">Priority</label>
			<select id="priority" bind:value={formData.priority}>
				{#each priorities as priority}
					<option value={priority.value}>{priority.label}</option>
				{/each}
			</select>
		</div>
		
		<div class="form-group">
			<label for="description">Description</label>
			<textarea
				id="description"
				bind:value={formData.description}
				placeholder="Additional details about this requirement..."
				rows="3"
			></textarea>
		</div>
		
		<div class="form-group">
			<label for="notes">Notes</label>
			<textarea
				id="notes"
				bind:value={formData.notes}
				placeholder="Any additional notes..."
				rows="2"
			></textarea>
		</div>
		
		<button 
			type="submit" 
			class="submit-btn"
			disabled={isSubmitting}
		>
			{isSubmitting ? 'Adding...' : 'Add Requirement'}
		</button>
	</form>
</div>

<style>
	.form-container h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 1.5rem;
	}
	
	.requirement-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	

	
	label, .form-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}
	
	input, select, textarea {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	
	input:focus, select:focus, textarea:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}
	
	textarea {
		resize: vertical;
		font-family: inherit;
	}
	
	.submit-btn {
		background: #2563eb;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		margin-top: 0.5rem;
	}
	
	.submit-btn:hover:not(:disabled) {
		background: #1d4ed8;
	}
	
	.submit-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}
	
	.error-message {
		background: #fef2f2;
		color: #dc2626;
		padding: 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid #fecaca;
		font-size: 0.875rem;
	}
	
	/* Course Options Styles */
	.course-options-section {
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		padding: 1rem;
		background: #f9fafb;
	}
	
	.add-course-section {
		margin-bottom: 1rem;
	}
	
	.autocomplete-section {
		margin-bottom: 1.5rem;
	}
	
	.autocomplete-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}
	
	.autocomplete-help {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.5rem;
		margin-bottom: 0;
	}
	
	.section-divider {
		display: block;
		text-align: center;
		font-size: 0.75rem;
		color: #9ca3af;
		font-weight: 500;
		margin: 1rem 0 0.75rem 0;
		position: relative;
	}
	
	.section-divider::before,
	.section-divider::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 40%;
		height: 1px;
		background: #e5e7eb;
	}
	
	.section-divider::before {
		left: 0;
	}
	
	.section-divider::after {
		right: 0;
	}
	
	.manual-inputs {
		display: grid;
		grid-template-columns: 1fr 2fr auto;
		gap: 0.5rem;
	}
	
	.course-code-input,
	.course-name-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		background: white;
	}
	
	.add-course-btn {
		background: #10b981;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s;
		white-space: nowrap;
	}
	
	.add-course-btn:hover:not(:disabled) {
		background: #059669;
	}
	
	.add-course-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}
	
	.course-options-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.course-option-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		padding: 0.75rem;
	}
	
	.course-info {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		flex: 1;
	}
	
	.course-main {
		width: 100%;
	}
	
	.course-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding-right: 0.5rem; /* Space for the remove button */
	}
	
	.course-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0; /* Allow text to truncate if needed */
	}
	
	.course-right {
		display: flex;
		align-items: center;
		flex-shrink: 0; /* Prevent shrinking */
	}
	
	.course-code {
		font-family: monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1e293b;
		background: #f1f5f9;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		min-width: 5rem;
		text-align: center;
		flex-shrink: 0;
	}
	
	.course-name {
		font-size: 0.875rem;
		color: #64748b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 20rem;
		flex-shrink: 1;
	}
	
	.course-credits {
		font-size: 0.75rem;
		color: #3b82f6;
		font-weight: 500;
		background: #eff6ff;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		border: 1px solid #dbeafe;
	}
	
	.remove-course-btn {
		background: #ef4444;
		color: white;
		border: none;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		transition: background-color 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.remove-course-btn:hover {
		background: #dc2626;
	}
	
	@media (max-width: 640px) {
		.manual-inputs {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}
	}
</style>