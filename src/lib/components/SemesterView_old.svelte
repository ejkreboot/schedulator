<script>
	import { onMount } from 'svelte';
	import { user } from '$lib/auth.js';
	import { 
		getAllSemestersWithCourses, 
		createDefaultAcademicYear,
		createDefaultSemesters,
		scheduleCourse,
		moveCourseBetweenSemesters,
		deleteScheduledCourse,
		validateCreditLimit
	} from '$lib/semesters.js';
	import { getRequirements } from '$lib/requirements.js';
	import { enhanceCourseOption, isCourseOfferedInSemester, formatSemesterList } from '$lib/catalog.js';
	
	let semesters = [];
	let requirements = [];
	let loading = true;
	let error = null;
	let draggedItem = null;
	let draggedFromSemester = null;
	let dragState = { item: null, fromSemester: null };
	let scheduledCourses = new Set();
	
	onMount(() => {
		loadData();
	});
	
	// Reactive derived set of scheduled course codes
	$: {
		console.log('=== REACTIVE UPDATE TRIGGERED ===');
		console.log('Current semesters:', semesters.length);
		const courseCodes = semesters.flatMap(semester => {
			const codes = semester.courses?.map(course => course.course_code) || [];
			console.log(`Semester ${semester.name} has courses:`, codes);
			return codes;
		});
		console.log('All course codes found:', courseCodes);
		scheduledCourses = new Set(courseCodes);
		console.log('scheduledCourses updated:', Array.from(scheduledCourses));
	}
	
	// Helper function to check if a course is scheduled
	function isCourseScheduled(courseCode) {
		const isScheduled = scheduledCourses.has(courseCode);
		if (courseCode && (courseCode.includes('CS') || courseCode.includes('MATH'))) {
			console.log(`isCourseScheduled(${courseCode}):`, isScheduled, 'current set:', Array.from(scheduledCourses));
		}
		return isScheduled;
	}
	
	async function loadData() {
		loading = true;
		
		// Load semesters and requirements in parallel
		const [semestersResult, requirementsResult] = await Promise.all([
			getAllSemestersWithCourses(),
			getRequirements()
		]);
		
		if (semestersResult.error) {
			error = semestersResult.error.message;
		} else {
			semesters = semestersResult.data || [];
		}
		
		if (requirementsResult.error) {
			error = requirementsResult.error.message;
		} else {
			requirements = requirementsResult.data || [];
		}
		
		// If no semesters exist, create default ones
		if (semesters.length === 0) {
			await setupDefaultSemesters();
		}
		
		loading = false;
	}
	
	async function setupDefaultSemesters() {
		try {
			if (!$user?.id) {
				error = 'User not authenticated';
				return;
			}
			
			// Create default academic year
			const { data: academicYear, error: yearError } = await createDefaultAcademicYear($user.id);
			if (yearError) throw yearError;
			
			// Create default semesters
			await createDefaultSemesters($user.id, academicYear.id);
			
			// Reload data
			const { data: newSemesters } = await getAllSemestersWithCourses();
			semesters = newSemesters || [];
		} catch (err) {
			error = err.message;
		}
	}
	
	// ===== DRAG AND DROP HANDLERS =====
	
	function handleDragStart(event, item, fromSemester = null) {		
		// Set both old and new drag state
		draggedItem = item;
		draggedFromSemester = fromSemester;
		dragState = { item, fromSemester };
		
		event.dataTransfer.effectAllowed = 'move';
		
		const transferData = {
			item: item,
			fromSemesterId: fromSemester?.id || null,
			timestamp: Date.now()
		};
		
		event.dataTransfer.setData('application/json', JSON.stringify(transferData));
		event.dataTransfer.setData('text/plain', item.code || item.course_code || 'unknown');
		event.target.style.opacity = '0.5';
		
		console.log('Drag state set:', { draggedItem, draggedFromSemester, dragState });
	}
	
	function handleDragEnd(event) {
		event.target.style.opacity = '1';
		
		setTimeout(() => {
			draggedItem = null;
			draggedFromSemester = null;
			dragState = { item: null, fromSemester: null };
		}, 150);
	}
	
	function handleDragOver(event) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	}
	
	function handleDragEnter(event) {
		event.preventDefault();
		event.currentTarget.classList.add('drag-over');
	}
	
	function handleDragLeave(event) {
		event.currentTarget.classList.remove('drag-over');
	}
	
	async function handleDrop(event, targetSemester) {		
		event.preventDefault();
		event.currentTarget.classList.remove('drag-over');
		debugger;
		// Try to get data from multiple sources
		let transferData = null;
		try {
			const jsonData = event.dataTransfer.getData('application/json');
			if (jsonData) {
				transferData = JSON.parse(jsonData);
			}
		} catch (e) {
			console.warn('Could not parse transfer data:', e);
		}
		
		// Try multiple sources for the item
		let itemToUse = draggedItem || dragState.item || transferData?.item;
		let fromSemesterToUse = draggedFromSemester || dragState.fromSemester;
		
		console.log('Item sources:', {
			draggedItem,
			dragStateItem: dragState.item,
			transferDataItem: transferData?.item,
			itemToUse,
			fromSemesterToUse
		});
		
		if (!itemToUse || !targetSemester) {
			console.error('Missing required data:', { itemToUse, targetSemester });
			alert('Drag and drop failed: missing item data');
			return;
		}
		
		console.log('Using item:', itemToUse);
		
		try {
			// If dropping a course option from requirements
			if (itemToUse.code && !itemToUse.semester_id) {
				const enhancedCourse = enhanceCourseOption(itemToUse);
				
				// Check if course is already scheduled
				if (isCourseScheduled(enhancedCourse.code)) {
					alert(`${enhancedCourse.code} is already scheduled in another semester`);
					return;
				}
				
				// Check if course is offered in this semester
				if (!isCourseOfferedInSemester(enhancedCourse.code, targetSemester.term_type)) {
					const availableSemesters = enhancedCourse.semesters?.length > 0 ? formatSemesterList(enhancedCourse.semesters) : 'Unknown';
					alert(`${enhancedCourse.code} is not offered in ${targetSemester.term_type}.\nAvailable semesters: ${availableSemesters}`);
					return;
				}
				
				const courseData = {
					user_id: $user.id,
					semester_id: targetSemester.id,
					requirement_id: itemToUse.requirement_id,
					course_code: enhancedCourse.code,
					course_name: enhancedCourse.name,
					credits: enhancedCourse.credits || 3,
					status: 'planned'
				};
				
				// Check credit limit
				if (!validateCreditLimit(targetSemester, courseData.credits)) {
					alert(`Adding this course would exceed the credit limit for ${targetSemester.name}`);
					return;
				}
				
				const { data, error: scheduleError } = await scheduleCourse(courseData);
				if (scheduleError) throw scheduleError;
				
				// Add to local state
				console.log('=== ADDING COURSE TO LOCAL STATE ===');
				console.log('Course added:', data);
				console.log('Target semester:', targetSemester.id);
				console.log('Course code being added:', data.course_code);
				
				const updatedSemesters = semesters.map(sem => 
					sem.id === targetSemester.id 
						? { ...sem, courses: [...sem.courses, data], current_credits: sem.current_credits + courseData.credits }
						: sem
				);
				semesters = updatedSemesters;
				
				console.log('Updated semesters:', updatedSemesters);
				console.log('Should now be scheduled:', data.course_code);
			}
			// If moving a scheduled course between semesters
			else if (itemToUse.semester_id) {
				// Find the source semester using multiple sources
				let sourceSemester = fromSemesterToUse;
				if (!sourceSemester && transferData?.fromSemesterId) {
					sourceSemester = semesters.find(s => s.id === transferData.fromSemesterId);
				}
				if (!sourceSemester) {
					// Last resort: find semester by looking for the course
					sourceSemester = semesters.find(s => 
						s.courses?.some(c => c.id === itemToUse.id)
					);
				}
				
				if (!sourceSemester) {
					console.error('Could not find source semester for move operation');
					alert('Error: Could not determine source semester for this course');
					return;
				}
				
				if (sourceSemester.id === targetSemester.id) {
					console.log('Dropping in same semester, ignoring');
					return;
				}
				// Check credit limit
				if (!validateCreditLimit(targetSemester, itemToUse.credits)) {
					alert(`Moving this course would exceed the credit limit for ${targetSemester.name}`);
					return;
				}
				
				const { error: moveError } = await moveCourseBetweenSemesters(itemToUse.id, targetSemester.id);
				if (moveError) throw moveError;
				
				// Update local state
				const updatedSemesters = semesters.map(sem => {
					if (sem.id === sourceSemester.id) {
						// Remove from source semester
						return {
							...sem,
							courses: sem.courses.filter(c => c.id !== itemToUse.id),
							current_credits: sem.current_credits - itemToUse.credits
						};
					} else if (sem.id === targetSemester.id) {
						// Add to target semester
						return {
							...sem,
							courses: [...sem.courses, { ...itemToUse, semester_id: targetSemester.id }],
							current_credits: sem.current_credits + itemToUse.credits
						};
					}
					return sem;
				});
				semesters = updatedSemesters;
			}
		} catch (err) {
			error = err.message;
		}
	}
	
	async function removeCourse(courseId, semesterId) {
		try {
			const { error: deleteError } = await deleteScheduledCourse(courseId);
			if (deleteError) throw deleteError;
			
			// Update local state
			const updatedSemesters = semesters.map(sem => 
				sem.id === semesterId 
					? { 
						...sem, 
						courses: sem.courses.filter(c => c.id !== courseId),
						current_credits: sem.current_credits - (sem.courses.find(c => c.id === courseId)?.credits || 0)
					}
					: sem
			);
			semesters = updatedSemesters;
		} catch (err) {
			error = err.message;
		}
	}
	
	async function createNewAcademicYear() {
		try {
			if (!$user?.id) {
				error = 'User not authenticated';
				return;
			}
			
			// Get the latest year from existing semesters to determine next year
			const currentYear = new Date().getFullYear();
			const maxYear = semesters.reduce((max, sem) => Math.max(max, sem.year), currentYear);
			const nextYear = Math.max(maxYear + 1, currentYear + 1);
			
			// Create new academic year
			const { data: academicYear, error: yearError } = await createDefaultAcademicYear($user.id, nextYear);
			if (yearError) throw yearError;
			
			// Create semesters for the new year
			await createDefaultSemesters($user.id, academicYear.id, nextYear);
			
			// Reload data
			const { data: newSemesters } = await getAllSemestersWithCourses();
			semesters = newSemesters || [];
		} catch (err) {
			error = err.message;
		}
	}
	
	function getCreditStatus(semester) {
		const current = semester.current_credits || 0;
		const max = semester.max_credits || 18;
		const percentage = (current / max) * 100;
		
		if (percentage >= 100) return 'over-limit';
		if (percentage >= 80) return 'near-limit';
		return 'normal';
	}
</script>

<div class="semester-view">
	<div class="view-header">
		<div class="header-content">
			<div class="header-text">
				<h2>Semester Planning</h2>
				<p class="view-description">
					Drag courses to schedule them in specific semesters.
				</p>
			</div>
			<button class="create-year-btn" on:click={createNewAcademicYear}>
				Create New Academic Year
			</button>
		</div>
	</div>
	
	{#if loading}
		<div class="loading">Loading semester data...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else}
		<div class="semester-layout">
			<!-- Requirements Sidebar -->
			<div class="requirements-sidebar">
				<h3>Available Requirements</h3>
				{#if requirements.length === 0}
					<p class="empty-state">No requirements found. Add some requirements first!</p>
				{:else}
					<div class="requirements-list">
						{#each requirements as requirement}
							<div class="requirement-item">
								<h4 class="requirement-title">{requirement.title}</h4>
								<span class="requirement-category">{requirement.category}</span>
								
								{#if requirement.course_options && requirement.course_options.length > 0}
									<div class="course-options">
										{#each requirement.course_options as option}
											{@const enhancedOption = enhanceCourseOption(option)}
											{@const isScheduled = isCourseScheduled(enhancedOption.code)}
											<div 
												class="course-chip"
												class:scheduled={isScheduled}
												role="button"
												tabindex="0"
												draggable={!isScheduled}
												on:dragstart={(e) => handleDragStart(e, { ...enhancedOption, requirement_id: requirement.id })}
												on:dragend={handleDragEnd}
											>
												<span class="course-code">{enhancedOption.code}</span>
												{#if enhancedOption.name}
													<span class="course-name">{enhancedOption.name}</span>
												{/if}
												<div class="course-details">
													{#if enhancedOption.credits}
														<span class="course-credits">{enhancedOption.credits}cr</span>
													{/if}
													{#if enhancedOption.semesters && enhancedOption.semesters.length > 0}
														<span class="course-semesters">{formatSemesterList(enhancedOption.semesters)}</span>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
			
			<!-- Semesters Grid -->
			<div class="semesters-grid">
				{#each semesters as semester}
					<div 
						class="semester-card"
						data-term="{semester.term_type}"
						role="region"
						aria-label="Semester drop zone for {semester.name}"
						on:dragover={handleDragOver}
						on:dragenter={handleDragEnter}
						on:dragleave={handleDragLeave}
						on:drop={(e) => handleDrop(e, semester)}
					>
						<div class="semester-header">
							<h3 class="semester-title">{semester.name}</h3>
							<div class="credit-info {getCreditStatus(semester)}">
								<span class="credit-count">{semester.current_credits || 0} / {semester.max_credits}</span>
								<span class="credit-label">credits</span>
							</div>
						</div>
						
						<div class="courses-container">
							{#if semester.courses && semester.courses.length > 0}
								{#each semester.courses as course}
									{@const enhancedCourse = enhanceCourseOption({ code: course.course_code })}
									<div 
										class="scheduled-course"
										role="button"
										tabindex="0"
										draggable="true"
										on:dragstart={(e) => handleDragStart(e, course, semester)}
										on:dragend={handleDragEnd}
									>
										<div class="course-header">
											<span class="course-code">{course.course_code}</span>
											<button 
												class="remove-btn"
												on:click={() => removeCourse(course.id, semester.id)}
												title="Remove course"
											>
												×
											</button>
										</div>
										
										{#if course.course_name}
											<div class="course-name">{course.course_name}</div>
										{/if}
										
										<div class="course-footer">
											<div class="course-info-left">
												<span class="course-credits">{course.credits} credits</span>
												{#if enhancedCourse.semesters && enhancedCourse.semesters.length > 0}
													<span class="scheduled-course-semesters">{formatSemesterList(enhancedCourse.semesters)}</span>
												{/if}
											</div>
											{#if course.requirement}
												<span class="requirement-link">{course.requirement.title}</span>
											{/if}
										</div>
									</div>
								{/each}
							{:else}
								<div class="empty-semester">
									<p>Drag courses here to schedule them</p>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.semester-view {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	
	.view-header {
		margin-bottom: 1.5rem;
	}
	
	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}
	
	.header-text {
		flex: 1;
	}
	
	.view-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0 0 0.5rem 0;
	}
	
	.view-description {
		color: #64748b;
		margin: 0;
	}
	
	.create-year-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		white-space: nowrap;
	}
	
	.create-year-btn:hover {
		background: #2563eb;
	}
	
	.semester-layout {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: 1.5rem;
		height: 100%;
		overflow: hidden;
	}
	
	/* ===== REQUIREMENTS SIDEBAR ===== */
	
	.requirements-sidebar {
		background: #f8fafc;
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-y: auto;
		border: 1px solid #e2e8f0;
	}
	
	.requirements-sidebar h3 {
		font-size: 1rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 1rem 0;
	}
	
	.requirements-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.requirement-item {
		background: white;
		border-radius: 0.375rem;
		padding: 0.75rem;
		border: 1px solid #e5e7eb;
	}
	
	.requirement-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0 0 0.25rem 0;
	}
	
	.requirement-category {
		font-size: 0.75rem;
		color: #6b7280;
		background: #f3f4f6;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}
	
	.course-options {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	
	.course-chip {
		background: #ffffff;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		padding: 0.375rem;
		cursor: grab;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}
	
	.course-chip.scheduled {
		background: #f3f4f6;
		border-color: #9ca3af;
		cursor: not-allowed;
		opacity: 0.7;
	}
	
	.course-chip.scheduled .course-code,
	.course-chip.scheduled .course-name,
	.course-chip.scheduled .course-credits {
		color: #6b7280;
	}
	
	.course-chip:not(.scheduled):hover {
		border-color: #3b82f6;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.course-chip:not(.scheduled):active {
		cursor: grabbing;
	}
	
	.course-chip .course-code {
		font-family: monospace;
		font-size: 0.75rem;
		font-weight: 600;
		color: #1e293b;
	}
	
	.course-chip .course-name {
		font-size: 0.6875rem;
		color: #64748b;
		line-height: 1.2;
	}
	
	.course-details {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}
	
	.course-chip .course-credits {
		font-size: 0.6875rem;
		color: #3b82f6;
		font-weight: 500;
	}
	
	.course-semesters {
		font-size: 0.625rem;
		color: #f59e0b;
		font-weight: 500;
		background: #fffbeb;
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		border: 1px solid #fed7aa;
		white-space: nowrap;
	}
	
	.course-chip.scheduled .course-semesters {
		color: #9ca3af;
		background: #f9fafb;
		border-color: #e5e7eb;
	}
	
	/* ===== SEMESTERS GRID ===== */
	
	.semesters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
		overflow-y: auto;
		padding: 0.5rem 0;
	}
	
	.semester-card {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1rem;
		height: fit-content;
		transition: border-color 0.2s;
	}
	
	.semester-card[data-term="Summer"] {
		max-height: 300px;
	}
	
	.semester-card[data-term="Summer"] .courses-container {
		min-height: 120px;
		max-height: 180px;
		overflow-y: auto;
	}
	
	.semester-card.drag-over {
		border-color: #3b82f6;
		background: #eff6ff;
	}
	
	.semester-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
	}
	
	.semester-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0;
	}
	
	.credit-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 0.75rem;
	}
	
	.credit-count {
		font-weight: 600;
		color: #374151;
	}
	
	.credit-info.near-limit .credit-count {
		color: #f59e0b;
	}
	
	.credit-info.over-limit .credit-count {
		color: #ef4444;
	}
	
	.credit-label {
		color: #6b7280;
	}
	
	.courses-container {
		min-height: 200px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.empty-semester {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		border: 2px dashed #d1d5db;
		border-radius: 0.375rem;
		color: #9ca3af;
		font-style: italic;
	}
	
	/* ===== SCHEDULED COURSES ===== */
	
	.scheduled-course {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.375rem;
		padding: 0.75rem;
		cursor: grab;
		transition: all 0.2s;
		border-left: 3px solid #3b82f6;
	}
	
	.scheduled-course:hover {
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	
	.scheduled-course:active {
		cursor: grabbing;
	}
	
	.course-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	
	.scheduled-course .course-code {
		font-family: monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1e293b;
	}
	
	.remove-btn {
		background: #ef4444;
		color: white;
		border: none;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		font-size: 0.75rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
	
	.remove-btn:hover {
		background: #dc2626;
	}
	
	.scheduled-course .course-name {
		font-size: 0.75rem;
		color: #64748b;
		line-height: 1.3;
		margin-bottom: 0.5rem;
	}
	
	.course-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.6875rem;
	}
	
	.course-info-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.scheduled-course .course-credits {
		color: #3b82f6;
		font-weight: 500;
	}
	
	.scheduled-course-semesters {
		font-size: 0.6875rem;
		color: #f59e0b;
		font-weight: 500;
		background: #fffbeb;
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		border: 1px solid #fed7aa;
		white-space: nowrap;
	}
	
	.requirement-link {
		color: #9ca3af;
		font-style: italic;
	}
	
	/* ===== RESPONSIVE ===== */
	
	@media (max-width: 768px) {
		.semester-layout {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
		}
		
		.requirements-sidebar {
			max-height: 300px;
		}
		
		.semesters-grid {
			grid-template-columns: 1fr;
		}
	}
	
	/* ===== LOADING & ERROR ===== */
	
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
</style>