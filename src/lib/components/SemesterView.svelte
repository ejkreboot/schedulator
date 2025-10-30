<script>
	import { onMount } from 'svelte';
	import { loadUserRequirements } from '../requirements.js';
	import { isCourseOfferedInSemester, getCourseByNumber } from '../catalog.js';
	import { 
		createAcademicYear, 
		createSemester, 
		scheduleCourse, 
		deleteScheduledCourse,
		getAllSemestersWithCourses 
	} from '../semesters.js';
	import { supabase } from '../supabaseClient.js';

	// Props for shared mode
	export let sharedMode = false;
	export let shareData = null;
	export let scheduleData = null;
	export let shareToken = null;

	// State variables
	let requirements = [];
	let academicYears = [];
	let currentYear = new Date().getFullYear();
	let loading = true;
	let error = null;
	let draggedCourse = null;
	let dragOverSemester = null;

	// Computed properties for shared mode
	$: isReadOnly = sharedMode && shareData?.permissionLevel === 'view';

	// Load schedule data from database
	async function loadScheduleData(userId) {
		// Try to load existing academic years and semesters
		const { data: existingSemesters, error: loadError } = await getAllSemestersWithCourses();
		
		if (loadError) {
			console.error('Error loading schedule:', loadError);
			// If no existing data, create default academic year
			await createDefaultSchedule(userId);
			return;
		}
		
		if (!existingSemesters || existingSemesters.length === 0) {
			// No existing schedule, create default
			await createDefaultSchedule(userId);
			return;
		}
		
		// Group semesters by academic year
		const yearGroups = {};
		existingSemesters.forEach(semester => {
			const year = semester.term_type === 'Fall' ? semester.year : semester.year - 1;
			if (!yearGroups[year]) {
				yearGroups[year] = {
					year: year,
					semesters: []
				};
			}
			
			yearGroups[year].semesters.push({
				id: semester.id,
				type: semester.term_type,
				year: semester.year,
				maxCredits: semester.max_credits,
				courses: semester.courses?.map(course => {
					// Get catalog data for description and semester info
					const catalogCourse = getCourseByNumber(course.course_code);
					return {
						id: course.id,
						code: course.course_code,
						name: course.course_name,
						credits: course.credits,
						semesters: catalogCourse?.semester || [],
						description: catalogCourse?.description || '',
						requirementId: course.requirement_id,
						scheduled: true,
						scheduledSemester: `${semester.term_type} ${semester.year}`
					};
				}) || []
			});
		});
		
		// Sort semesters within each year
		Object.values(yearGroups).forEach(yearGroup => {
			yearGroup.semesters.sort((a, b) => {
				const order = { 'Fall': 0, 'Spring': 1, 'Summer': 2 };
				return order[a.type] - order[b.type];
			});
		});
		
		academicYears = Object.values(yearGroups).sort((a, b) => a.year - b.year);
		
		// Mark scheduled courses in requirements to prevent duplicates
		markScheduledCoursesInRequirements();
	}
	
	// Create default academic year and semesters in database
	async function createDefaultSchedule(userId, year = currentYear) {
		try {
			// Create academic year
			const { data: academicYear, error: yearError } = await createAcademicYear({
				user_id: userId,
				name: `${year}-${year + 1}`,
				start_date: `${year}-08-15`,
				end_date: `${year + 1}-05-15`,
				is_active: year === currentYear
			});
			
			if (yearError) throw yearError;
			
			// Create semesters
			const semesterData = [
				{
					user_id: userId,
					academic_year_id: academicYear.id,
					name: `Fall ${year}`,
					term_type: 'Fall',
					year: year,
					start_date: `${year}-08-15`,
					end_date: `${year}-12-15`,
					max_credits: 18
				},
				{
					user_id: userId,
					academic_year_id: academicYear.id,
					name: `Spring ${year + 1}`,
					term_type: 'Spring',
					year: year + 1,
					start_date: `${year + 1}-01-15`,
					end_date: `${year + 1}-05-15`,
					max_credits: 18
				},
				{
					user_id: userId,
					academic_year_id: academicYear.id,
					name: `Summer ${year + 1}`,
					term_type: 'Summer',
					year: year + 1,
					start_date: `${year + 1}-06-01`,
					end_date: `${year + 1}-08-01`,
					max_credits: 12
				}
			];
			
			const createdSemesters = [];
			for (const semester of semesterData) {
				const { data: createdSemester, error: semesterError } = await createSemester(semester);
				if (semesterError) throw semesterError;
				createdSemesters.push(createdSemester);
			}
			
			// Create client-side structure (only for initial load)
			if (year === currentYear) {
				academicYears = [{
					year: year,
					semesters: createdSemesters.map(semester => ({
						id: semester.id,
						type: semester.term_type,
						year: semester.year,
						maxCredits: semester.max_credits,
						courses: []
					}))
				}];
			}
			
		} catch (err) {
			console.error('Error creating default schedule:', err);
			throw err;
		}
	}
	
	// Mark courses that are already scheduled to prevent duplicates in requirements
	function markScheduledCoursesInRequirements() {
		// Get all scheduled course codes with their semester info
		const scheduledCourses = new Map();
		
		academicYears.forEach(year => {
			year.semesters.forEach(semester => {
				semester.courses.forEach(course => {
					scheduledCourses.set(course.code, {
						semester: `${semester.type} ${semester.year}`,
						semesterType: semester.type,
						semesterYear: semester.year
					});
				});
			});
		});
		
		// Update requirements to mark scheduled courses
		requirements = requirements.map(req => {
			// Handle both data formats: req.courses (normal mode) vs req.course_options (shared mode)
			const courses = req.courses || req.course_options || [];
			
			return {
				...req,
				courses: courses.map(course => {
					const courseCode = course.code || course.course_id;
					const scheduledInfo = scheduledCourses.get(courseCode);
					if (scheduledInfo) {
						return {
							...course,
							scheduled: true,
							scheduledSemester: scheduledInfo.semester
						};
					}
					return {
						...course,
						scheduled: false,
						scheduledSemester: null
					};
				})
			};
		});
	}

	// Build academic year structure from shared data
	async function buildAcademicYearStructureFromSharedData() {
		if (!scheduleData.semesters) return;

		const yearMap = new Map();
		
		// Group semesters by year
		scheduleData.semesters.forEach(semester => {
			const academicYear = semester.term_type === 'Fall' ? semester.year : semester.year - 1;
			
			if (!yearMap.has(academicYear)) {
				yearMap.set(academicYear, {
					year: academicYear,
					semesters: []
				});
			}
			
			// Add scheduled courses to semester and normalize the format
			const semesterWithCourses = {
				...semester,
				type: semester.term_type, // Normalize term_type to type
				courses: getScheduledCoursesForSharedSemester(semester.id)
			};
			
			yearMap.get(academicYear).semesters.push(semesterWithCourses);
		});

		academicYears = Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
	}

	// Get scheduled courses for a semester in shared mode
	function getScheduledCoursesForSharedSemester(semesterId) {
		if (!scheduleData.scheduledCourses) return [];
		
		return scheduleData.scheduledCourses
			.filter(sc => sc.semester_id === semesterId)
			.map(sc => {
				// Find the course details from the original requirements data (before normalization)
				for (let req of scheduleData.requirements || []) {
					const course = req.course_options?.find(c => c.course_id === sc.course_code);
					if (course) {
						return { 
							...course, 
							code: course.course_id, // Normalize field names
							name: course.title,
							scheduled_course_id: sc.id 
						};
					}
				}
				// If not found in requirements, create a basic course object
				return { 
					code: sc.course_code, 
					name: sc.course_name || `${sc.course_code} - Course Details Missing`, 
					title: sc.course_name || `${sc.course_code} - Course Details Missing`,
					course_id: sc.course_code,
					scheduled_course_id: sc.id,
					credits: sc.credits || 3
				};
			});
	}

	// Load user requirements and existing schedule data
	onMount(async () => {
		try {
			loading = true;
			
			if (sharedMode && scheduleData) {
				// Shared mode: use provided data and normalize the structure
				requirements = (scheduleData.requirements || []).map(req => ({
					...req,
					courses: (req.course_options || []).map(course => ({
						...course,
						code: course.course_id, // Normalize course_id to code
						name: course.title // Normalize title to name
					}))
				}));
				await buildAcademicYearStructureFromSharedData();
				markScheduledCoursesInRequirements();
			} else {
				// Normal mode: load user data
				const { data: { user } } = await supabase.auth.getUser();
				if (!user) {
					error = 'Please log in to view your schedule.';
					loading = false;
					return;
				}
				
				// Load user requirements
				requirements = await loadUserRequirements();
				
				// Load existing schedule data
				await loadScheduleData(user.id);
				
				// Mark any scheduled courses in requirements
				markScheduledCoursesInRequirements();
			}
			
			loading = false;
		} catch (err) {
			console.error('Error loading data:', err);
			error = 'Failed to load requirements and schedule data.';
			loading = false;
		}
	});

	// Add a new academic year
	async function addAcademicYear() {
		try {
			// Get current user
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;
			
			const nextYear = Math.max(...academicYears.map(year => year.year)) + 1;
			
			// Create in database
			await createDefaultSchedule(user.id, nextYear);
			
			// Reload data to get the new year
			await loadScheduleData(user.id);
			
			// Mark any scheduled courses in requirements
			markScheduledCoursesInRequirements();
			
		} catch (err) {
			console.error('Error adding academic year:', err);
			alert('Failed to add academic year. Please try again.');
		}
	}

	// Drag and drop handlers
	function handleDragStart(event, course) {
		if (isReadOnly) {
			event.preventDefault();
			return;
		}
		
		draggedCourse = course;
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', course.code || course.course_id);
		
		// Add visual feedback
		event.target.style.opacity = '0.5';
	}

	function handleDragEnd(event) {
		event.target.style.opacity = '1';
		// Don't reset draggedCourse immediately to allow drop handler to complete
		setTimeout(() => {
			draggedCourse = null;
		}, 100);
	}

	function handleDragOver(event, semester) {
		if (!draggedCourse || isReadOnly) return;
		
		// Check if course can be offered in this semester
		if (isCourseOfferedInSemester(draggedCourse.code || draggedCourse.course_id, semester.term_type || semester.type)) {
			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';
			
			// Add visual feedback for valid drop zone
			dragOverSemester = semester;
		}
	}

	function handleDragLeave(event) {
		dragOverSemester = null;
	}

	async function handleDrop(event, semester) {
		event.preventDefault();
		dragOverSemester = null;
		
		// Prevent drops in read-only mode
		if (isReadOnly) return;
		
		// Store dragged course locally before it gets reset
		const courseToSchedule = draggedCourse;
		
		if (!courseToSchedule) return;
		
		// Validate that course can be offered in this semester
		const courseCode = courseToSchedule.code || courseToSchedule.course_id;
		if (!isCourseOfferedInSemester(courseCode, semester.term_type || semester.type)) {
			alert(`${courseCode} is not offered in ${semester.term_type || semester.type} semester.`);
			return;
		}
		
		// Check if course is already scheduled in this semester
		if (semester.courses.some(course => (course.code || course.course_id) === courseCode)) {
			alert(`${courseCode} is already scheduled for ${semester.term_type || semester.type} ${semester.year}.`);
			return;
		}
		
		try {
			if (sharedMode) {
				// Shared mode: use API endpoint
				const response = await fetch(`/api/update-shared-course?share=${shareToken}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						courseId: courseToSchedule.code || courseToSchedule.course_id,
						toSemesterId: semester.id,
						courseData: {
							name: courseToSchedule.name || courseToSchedule.title,
							title: courseToSchedule.title || courseToSchedule.name,
							credits: courseToSchedule.credits || courseToSchedule.credit_hours,
							credit_hours: courseToSchedule.credit_hours || courseToSchedule.credits
						}
					})
				});

				const result = await response.json();
				if (!result.success) {
					console.error('Error scheduling course:', result.error);
					alert(`Failed to schedule course: ${result.error}`);
					return;
				}
			} else {
				// Normal mode: direct database call
				const { data: { user } } = await supabase.auth.getUser();
				if (!user) return;
				
				const { data: scheduledCourse, error } = await scheduleCourse({
					user_id: user.id,
					semester_id: semester.id,
					requirement_id: courseToSchedule.requirementId || null,
					course_code: courseToSchedule.code,
					course_name: courseToSchedule.name,
					credits: courseToSchedule.credits,
					status: 'planned'
				});
				
				if (error) {
					console.error('Error scheduling course:', error);
					alert('Failed to schedule course. Please try again.');
					return;
				}
			}
			
			// Add course to semester in UI
			const newCourse = { 
				...courseToSchedule
			};
			semester.courses = [...semester.courses, newCourse];
			
			// Remove course from requirements (mark as scheduled)
			requirements = requirements.map(req => ({
				...req,
				courses: req.courses.map(course => 
					course.code === courseToSchedule.code 
						? { ...course, scheduled: true, scheduledSemester: `${semester.type} ${semester.year}` }
						: course
				)
			}));
			
			// Force reactivity
			academicYears = [...academicYears];
			
		} catch (err) {
			console.error('Error scheduling course:', err);
			alert('Failed to schedule course. Please try again.');
		}
	}

	async function removeCourseFromSemester(course, semester) {
		try {
			// Delete from database
			if (course.id) {
				const { error } = await deleteScheduledCourse(course.id);
				if (error) {
					console.error('Error removing course:', error);
					alert('Failed to remove course. Please try again.');
					return;
				}
			}
			
			// Remove course from semester
			semester.courses = semester.courses.filter(c => c.code !== course.code);
			
			// Mark course as unscheduled in requirements
			requirements = requirements.map(req => ({
				...req,
				courses: req.courses.map(c => 
					c.code === course.code 
						? { ...c, scheduled: false, scheduledSemester: null }
						: c
				)
			}));
			
			// Force reactivity
			academicYears = [...academicYears];
			
		} catch (err) {
			console.error('Error removing course:', err);
			alert('Failed to remove course. Please try again.');
		}
	}

	function getSemesterTitle(semester) {
		return `${semester.type} ${semester.year}`;
	}

	function getCourseCredits(course) {
		return course.credits || 3; // Default to 3 credits if not specified
	}

	function getSemesterCredits(semester) {
		return semester.courses.reduce((total, course) => total + getCourseCredits(course), 0);
	}
</script>

<div class="semester-view">
	{#if loading}
		<div class="loading">Loading your schedule...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else}
		<div class="schedule-container">
			<!-- Requirements Panel -->
			<div class="requirements-panel">
				<h2>Course Requirements</h2>
				
				{#each requirements as requirement}
					<div class="requirement-group">
						<div class="requirement-header">
							<h3>{requirement.name}</h3>
							<span class="category-badge" class:core={requirement.category === 'Core'} class:major={requirement.category === 'Major'} class:pre-graduate={requirement.category === 'Pre-graduate'}>
								{requirement.category}
							</span>
						</div>
						{#if requirement.description}
							<p class="requirement-description">{requirement.description}</p>
						{/if}
						<div class="courses-grid">
							{#each requirement.courses.filter(course => !course.scheduled) as course}
							<div 
								class="course-card {isReadOnly ? 'read-only' : 'draggable'}"
								draggable={!isReadOnly}
								role={isReadOnly ? "" : "button"}
								tabindex={isReadOnly ? "" : "0"}
								on:dragstart={(e) => handleDragStart(e, course)}
								on:dragend={handleDragEnd}
								title="{course.description || (course.name + ' - ' + getCourseCredits(course) + ' credits')}"
							>
								<div class="course-code">{course.code || course.course_id}</div>
								<div class="course-name">{course.name || course.title}</div>
								<div class="course-meta">
									<span class="course-credits">{getCourseCredits(course)} cr</span>
									{#if course.semesters && course.semesters.length > 0}
										<div class="semester-badges">
											{#each course.semesters as semester}
												<span class="semester-badge" class:fall={semester === 'Fall'} class:spring={semester === 'Spring'} class:summer={semester === 'Summer'}>
													{semester.toUpperCase()}
												</span>
											{/each}
										</div>
									{/if}
								</div>
								{#if course.prerequisites}
									<div class="prerequisites">
										Prereq: {course.prerequisites}
									</div>
								{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<!-- Schedule Panel -->
			<div class="schedule-panel">
				<div class="schedule-header">
					<h2>Academic Schedule</h2>
					{#if !sharedMode}
						<button class="add-year-btn" on:click={addAcademicYear}>
							+ Add Academic Year
						</button>
					{/if}
				</div>

				{#each academicYears as year}
					<div class="academic-year">
						<h3 class="year-title">Academic Year {year.year}-{year.year + 1}</h3>
						
						<div class="semesters-grid">
							{#each year.semesters as semester}
							<div 
								class="semester-container"
								class:summer-semester={semester.type === 'Summer'}
							>
									<div class="semester-header">
										<h4>{getSemesterTitle(semester)}</h4>
										<span class="credit-count">{getSemesterCredits(semester)} credits</span>
									</div>
									
									<div 
										class="semester-courses"
										class:drag-over={dragOverSemester === semester}
										role="region"
										aria-label="Drop zone for {getSemesterTitle(semester)}"
										on:dragover={(e) => handleDragOver(e, semester)}
										on:dragleave={handleDragLeave}
										on:drop={(e) => handleDrop(e, semester)}
									>
										{#each semester.courses as course}
											<div class="scheduled-course" title="{course.description || (course.name + ' - ' + getCourseCredits(course) + ' credits')}">
											<div class="course-info">
												<span class="course-code">{course.code || course.course_id}</span>
												<span class="course-name">{course.name || course.title}</span>
												<div class="course-meta-scheduled">
													<span class="course-credits">{getCourseCredits(course)} cr</span>
													{#if course.semesters && course.semesters.length > 0}
														<div class="semester-badges">
															{#each course.semesters as semester}
																<span class="semester-badge" class:fall={semester === 'Fall'} class:spring={semester === 'Spring'} class:summer={semester === 'Summer'}>
																	{semester.toUpperCase()}
																</span>
															{/each}
														</div>
													{/if}
												</div>
											</div>
												<button 
													class="remove-btn"
													on:click={() => removeCourseFromSemester(course, semester)}
													title="Remove from schedule"
												>
													×
												</button>
											</div>
										{/each}
										
										{#if semester.courses.length === 0}
											<div class="empty-semester">
												Drop courses here
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.semester-view {
		padding: 20px;
		max-width: 1280px;
		margin: 0 auto;
	}

	.loading, .error {
		text-align: center;
		padding: 40px;
		font-size: 18px;
	}

	.error {
		color: #e74c3c;
		background: #fdf2f2;
		border: 1px solid #f5c6cb;
		border-radius: 8px;
	}

	.schedule-container {
		display: grid;
		grid-template-columns: 350px 1fr;
		gap: 30px;
		height: calc(100vh - 120px);
	}

	/* Requirements Panel */
	.requirements-panel {
		background: #f8f9fa;
		border-radius: 12px;
		padding: 20px;
		overflow-y: auto;
		border: 1px solid #e9ecef;
	}

	.requirements-panel h2 {
		margin: 0 0 10px 0;
		color: #2c3e50;
		font-size: 24px;
	}

	.instructions {
		color: #6c757d;
		font-size: 14px;
		margin-bottom: 20px;
		font-style: italic;
	}

	.requirement-group {
		margin-bottom: 25px;
	}

	.requirement-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 2px solid #dee2e6;
	}

	.requirement-group h3 {
		margin: 0;
		color: #495057;
		font-size: 18px;
		flex: 1;
	}

	.category-badge {
		font-size: 11px;
		font-weight: bold;
		padding: 4px 8px;
		border-radius: 12px;
		color: #6c757d; /* Gray text */
		background-color: transparent; /* Transparent background */
		text-transform: uppercase;
		line-height: 1;
		flex-shrink: 0;
		margin-left: 12px;
	}

	.requirement-description {
		font-size: 13px;
		color: #6c757d;
		margin: 0 0 12px 0;
		font-style: italic;
		line-height: 1.4;
	}

	.courses-grid {
		display: grid;
		gap: 8px;
	}

	.course-card {
		background: white;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		padding: 12px;
		cursor: grab;
		transition: all 0.2s ease;
		position: relative;
		max-width: 85%;
	}

	.course-card:hover {
		border-color: #007bff;
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
		transform: translateY(-1px);
	}

	.course-card:active {
		cursor: grabbing;
	}

	.course-card.read-only {
		cursor: default;
		opacity: 0.7;
	}

	.course-card.read-only:hover {
		border-color: #e9ecef;
		box-shadow: none;
		transform: none;
	}

	.course-code {
		font-weight: bold;
		color: #007bff;
		font-size: 14px;
	}

	
	.course-name {
		font-size: 0.875rem;
		color: #64748b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 1;
		padding-bottom: 10px;
	}

	.course-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 4px 0;
	}

	.course-credits {
		font-size: 9px;
		font-weight: bold;
		padding: 2px 4px;
		border-radius: 3px;
		background-color: #007bff;
		color: white;
		text-transform: uppercase;
		line-height: 1;
	}

	.semester-badges {
		display: flex;
		gap: 2px;
	}

	.semester-badge {
		font-size: 9px;
		font-weight: bold;
		padding: 2px 4px;
		border-radius: 3px;
		color: white;
		text-transform: uppercase;
		line-height: 1;
	}

	.semester-badge.fall {
		background-color: #e67e22; /* Deep orange */
	}

	.semester-badge.spring {
		background-color: #28a745; /* Green */
	}

	.semester-badge.summer {
		background-color: #f39c12; /* Warmer yellow-orange */
		color: white;
	}

	.prerequisites {
		font-size: 10px;
		color: #dc3545;
		margin-top: 4px;
		font-style: italic;
	}

	/* Schedule Panel */
	.schedule-panel {
		background: white;
		border-radius: 12px;
		padding: 20px;
		overflow-y: auto;
		border: 1px solid #e9ecef;
	}

	.schedule-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 25px;
		border-bottom: 2px solid #f8f9fa;
		padding-bottom: 15px;
	}

	.schedule-header h2 {
		margin: 0;
		color: #2c3e50;
		font-size: 28px;
	}

	.add-year-btn {
		background: #28a745;
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s ease;
	}

	.add-year-btn:hover {
		background: #218838;
	}

	.academic-year {
		margin-bottom: 40px;
	}

	.year-title {
		color: #495057;
		font-size: 22px;
		margin: 0 0 20px 0;
		text-align: center;
		background: #f8f9fa;
		padding: 12px;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.semesters-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr auto;
		gap: 20px;
		width: 100%;
	}

	.semester-container {
		background: #f8f9fa;
		border: 2px solid #dee2e6;
		border-radius: 12px;
		padding: 15px;
		min-height: 200px;
		width: 100%;
		min-width: 0; /* Allow content to shrink */
		transition: all 0.2s ease;
	}

	.semester-courses.drag-over {
		border-color: #28a745;
		background: #f8fff9;
		transform: scale(1.02);
	}

	.semester-container.summer-semester {
		grid-column: 1 / -1; /* Span both columns */
		min-height: 200px; /* Even taller to accommodate content */
		max-height: 220px;
	}

	.semester-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
		padding-bottom: 8px;
		border-bottom: 1px solid #dee2e6;
	}

	.semester-header h4 {
		margin: 0;
		color: #495057;
		font-size: 16px;
	}

	.credit-count {
		font-size: 12px;
		color: #6c757d;
		font-weight: 500;
		background: #e9ecef;
		padding: 4px 8px;
		border-radius: 12px;
	}

	.semester-courses {
		min-height: 120px;
		border: 2px dashed #dee2e6;
		border-radius: 8px;
		padding: 8px;
		background: white;
		transition: all 0.2s ease;
		width: 100%;
		overflow: hidden;
	}

	.scheduled-course {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 6px;
		padding: 10px;
		margin-bottom: 8px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: all 0.2s ease;
	}

	.scheduled-course:hover {
		border-color: #007bff;
		box-shadow: 0 1px 4px rgba(0, 123, 255, 0.1);
	}

	.course-info {
		flex: 1;
		min-width: 0; /* Allow content to shrink */
		overflow: hidden;
	}

	.scheduled-course .course-code {
		display: block;
		font-weight: bold;
		color: #007bff;
		font-size: 13px;
	}

	.scheduled-course .course-name {
		display: block;
		font-size: 11px;
		color: #495057;
		margin: 2px 0;
		line-height: 1.3;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.scheduled-course .course-credits {
		font-size: 9px;
		font-weight: bold;
		padding: 2px 4px;
		border-radius: 3px;
		background-color: #007bff;
		color: white;
		text-transform: uppercase;
		line-height: 1;
	}

	.course-meta-scheduled {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 2px;
	}

	.remove-btn {
		background: #dc3545;
		color: white;
		border: none;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s ease;
		flex-shrink: 0;
		margin-left: 8px;
	}

	.remove-btn:hover {
		background: #c82333;
	}

	.empty-semester {
		color: #6c757d;
		text-align: center;
		padding: 40px 20px;
		font-style: italic;
		border: none; /* Remove border since parent already has dashed border */
		border-radius: 6px;
		background: transparent;
	}

	/* Responsive Design */
	@media (max-width: 1200px) {
		.schedule-container {
			grid-template-columns: 300px 1fr;
			gap: 20px;
		}
		
		.semesters-grid {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: 1fr auto;
		}
	}

	@media (max-width: 900px) {
		.schedule-container {
			grid-template-columns: 1fr;
			height: auto;
		}
		
		.requirements-panel {
			order: 2;
			max-height: 400px;
		}
		
		.semesters-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 600px) {
		.semester-view {
			padding: 10px;
		}
		
		.schedule-header {
			flex-direction: column;
			gap: 15px;
			align-items: stretch;
		}
		
		.schedule-header h2 {
			text-align: center;
		}
	}
</style>