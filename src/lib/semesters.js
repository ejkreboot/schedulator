import { supabase } from './supabaseClient.js';

// ===== ACADEMIC YEARS =====

export async function createAcademicYear(yearData) {
	const { data, error } = await supabase
		.from('academic_years')
		.insert([yearData])
		.select()
		.single();
	
	return { data, error };
}

export async function getAcademicYears() {
	const { data, error } = await supabase
		.from('academic_years')
		.select('*')
		.order('start_date', { ascending: true });
	
	return { data, error };
}

export async function updateAcademicYear(id, updates) {
	const { data, error } = await supabase
		.from('academic_years')
		.update(updates)
		.eq('id', id)
		.select()
		.single();
	
	return { data, error };
}

export async function deleteAcademicYear(id) {
	const { data, error } = await supabase
		.from('academic_years')
		.delete()
		.eq('id', id);
	
	return { data, error };
}

export async function setActiveAcademicYear(id) {
	// First, set all years to inactive
	await supabase
		.from('academic_years')
		.update({ is_active: false })
		.neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows
	
	// Then set the specified year to active
	const { data, error } = await supabase
		.from('academic_years')
		.update({ is_active: true })
		.eq('id', id)
		.select()
		.single();
	
	return { data, error };
}

// ===== SEMESTERS =====

export async function createSemester(semesterData) {
	const { data, error } = await supabase
		.from('semesters')
		.insert([semesterData])
		.select()
		.single();
	
	return { data, error };
}

export async function getSemesters(academicYearId = null) {
	let query = supabase
		.from('semesters')
		.select(`
			*,
			academic_year:academic_years(name)
		`)
		.order('year', { ascending: true })
		.order('term_type', { ascending: true });
	
	if (academicYearId) {
		query = query.eq('academic_year_id', academicYearId);
	}
	
	const { data, error } = await query;
	return { data, error };
}

export async function updateSemester(id, updates) {
	const { data, error } = await supabase
		.from('semesters')
		.update(updates)
		.eq('id', id)
		.select()
		.single();
	
	return { data, error };
}

export async function deleteSemester(id) {
	const { data, error } = await supabase
		.from('semesters')
		.delete()
		.eq('id', id);
	
	return { data, error };
}

// ===== SCHEDULED COURSES =====

export async function scheduleCourse(courseData) {
	const { data, error } = await supabase
		.from('scheduled_courses')
		.insert([courseData])
		.select()
		.single();
	
	return { data, error };
}

export async function getScheduledCourses(semesterId = null) {
	let query = supabase
		.from('scheduled_courses')
		.select(`
			*,
			semester:semesters(name, term_type, year),
			requirement:requirements(title, category)
		`)
		.order('position_index', { ascending: true })
		.order('created_at', { ascending: true });
	
	if (semesterId) {
		query = query.eq('semester_id', semesterId);
	}
	
	const { data, error } = await query;
	return { data, error };
}

export async function updateScheduledCourse(id, updates) {
	const { data, error } = await supabase
		.from('scheduled_courses')
		.update(updates)
		.eq('id', id)
		.select()
		.single();
	
	return { data, error };
}

export async function deleteScheduledCourse(id) {
	const { data, error } = await supabase
		.from('scheduled_courses')
		.delete()
		.eq('id', id);
	
	return { data, error };
}

export async function moveCourseBetweenSemesters(courseId, newSemesterId, newPosition = 0) {
	const { data, error } = await supabase
		.from('scheduled_courses')
		.update({ 
			semester_id: newSemesterId,
			position_index: newPosition
		})
		.eq('id', courseId)
		.select()
		.single();
	
	return { data, error };
}

// ===== UTILITY FUNCTIONS =====

export async function getSemesterWithCourses(semesterId) {
	const { data: semester, error: semesterError } = await supabase
		.from('semesters')
		.select(`
			*,
			academic_year:academic_years(name)
		`)
		.eq('id', semesterId)
		.single();
	
	if (semesterError) return { data: null, error: semesterError };
	
	const { data: courses, error: coursesError } = await getScheduledCourses(semesterId);
	
	if (coursesError) return { data: null, error: coursesError };
	
	return { 
		data: { 
			...semester, 
			courses: courses || [] 
		}, 
		error: null 
	};
}

export async function getAllSemestersWithCourses(academicYearId = null) {
	const { data: semesters, error: semestersError } = await getSemesters(academicYearId);
	
	if (semestersError) return { data: null, error: semestersError };
	
	// Get all courses for all semesters in one query
	let coursesQuery = supabase
		.from('scheduled_courses')
		.select(`
			*,
			requirement:requirements(title, category)
		`)
		.order('position_index', { ascending: true });
	
	if (academicYearId) {
		const semesterIds = semesters.map(s => s.id);
		coursesQuery = coursesQuery.in('semester_id', semesterIds);
	}
	
	const { data: allCourses, error: coursesError } = await coursesQuery;
	
	if (coursesError) return { data: null, error: coursesError };
	
	// Group courses by semester
	const coursesBySemester = {};
	allCourses?.forEach(course => {
		if (!coursesBySemester[course.semester_id]) {
			coursesBySemester[course.semester_id] = [];
		}
		coursesBySemester[course.semester_id].push(course);
	});
	
	// Combine semesters with their courses
	const semestersWithCourses = semesters?.map(semester => ({
		...semester,
		courses: coursesBySemester[semester.id] || []
	})) || [];
	
	return { data: semestersWithCourses, error: null };
}

// ===== VALIDATION FUNCTIONS =====

export function validateCreditLimit(semester, newCourseCredits) {
	const totalCredits = semester.current_credits + newCourseCredits;
	return totalCredits <= semester.max_credits;
}

export function calculateSemesterCredits(courses) {
	return courses
		.filter(course => ['planned', 'enrolled', 'completed'].includes(course.status))
		.reduce((total, course) => total + (course.credits || 0), 0);
}

// ===== QUICK SETUP FUNCTIONS =====

export async function createDefaultAcademicYear(userId, startYear = new Date().getFullYear()) {
	const yearData = {
		user_id: userId,
		name: `${startYear}-${startYear + 1}`,
		start_date: `${startYear}-08-15`,
		end_date: `${startYear + 1}-05-15`,
		is_active: true
	};
	
	return await createAcademicYear(yearData);
}

export async function createDefaultSemesters(userId, academicYearId, startYear = new Date().getFullYear()) {
	const semesters = [
		{
			user_id: userId,
			academic_year_id: academicYearId,
			name: `Fall ${startYear}`,
			term_type: 'Fall',
			year: startYear,
			start_date: `${startYear}-08-15`,
			end_date: `${startYear}-12-15`,
			max_credits: 18
		},
		{
			user_id: userId,
			academic_year_id: academicYearId,
			name: `Spring ${startYear + 1}`,
			term_type: 'Spring',
			year: startYear + 1,
			start_date: `${startYear + 1}-01-15`,
			end_date: `${startYear + 1}-05-15`,
			max_credits: 18
		},
		{
			user_id: userId,
			academic_year_id: academicYearId,
			name: `Summer ${startYear + 1}`,
			term_type: 'Summer',
			year: startYear + 1,
			start_date: `${startYear + 1}-06-01`,
			end_date: `${startYear + 1}-08-01`,
			max_credits: 12
		}
	];
	
	const results = [];
	for (const semester of semesters) {
		const result = await createSemester(semester);
		results.push(result);
	}
	
	return results;
}