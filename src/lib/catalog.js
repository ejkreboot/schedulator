import catalogData from '$lib/assets/catalog.json';

/**
 * Course catalog utilities for searching and autocomplete
 */

// Cache the catalog data for quick access
let catalog = catalogData;

/**
 * Search courses by code or title
 * @param {string} query - Search term
 * @param {number} limit - Maximum results to return
 * @returns {Array} Array of matching courses
 */
export function searchCourses(query, limit = 10) {
	if (!query || query.length < 2) return [];
	
	const queryLower = query.toLowerCase().trim();
	const results = [];
	
	// First, find exact matches in course number
	catalog.forEach(course => {
		if (course.course_number?.toLowerCase().includes(queryLower)) {
			results.push({
				...course,
				matchType: 'code',
				score: getMatchScore(course.course_number, queryLower)
			});
		}
	});
	
	// Then, find matches in title (if we haven't hit the limit)
	if (results.length < limit) {
		catalog.forEach(course => {
			// Skip if already added from code match
			if (results.some(r => r.course_number === course.course_number)) return;
			
			if (course.title.toLowerCase().includes(queryLower)) {
				results.push({
					...course,
					matchType: 'title',
					score: getMatchScore(course.title, queryLower)
				});
			}
		});
	}
	
	// Sort by relevance (exact matches first, then by score)
	results.sort((a, b) => {
		if (a.matchType === 'code' && b.matchType === 'title') return -1;
		if (a.matchType === 'title' && b.matchType === 'code') return 1;
		return b.score - a.score;
	});
	
	return results.slice(0, limit);
}

/**
 * Get match score for sorting results
 * @param {string} text - Text to match against
 * @param {string} query - Search query
 * @returns {number} Match score (higher is better)
 */
function getMatchScore(text, query) {
	const textLower = text.toLowerCase();
	
	// Exact match gets highest score
	if (textLower === query) return 100;
	
	// Starts with query gets high score
	if (textLower.startsWith(query)) return 80;
	
	// Contains query as whole word gets medium score
	if (textLower.includes(` ${query}`) || textLower.includes(`${query} `)) return 60;
	
	// Contains query gets lower score
	if (textLower.includes(query)) return 40;
	
	return 0;
}

/**
 * Get course by exact course number
 * @param {string} courseNumber - Exact course number (e.g., "MATH 101")
 * @returns {Object|null} Course object or null if not found
 */
export function getCourseByNumber(courseNumber) {
	return catalog.find(course => 
		course.course_number?.toLowerCase() === courseNumber.toLowerCase()
	) || null;
}

/**
 * Get all unique departments from the catalog
 * @returns {Array} Array of department codes
 */
export function getDepartments() {
	const departments = new Set();
	catalog.forEach(course => {
		const dept = course.course_number.split(' ')[0];
		departments.add(dept);
	});
	return Array.from(departments).sort();
}

/**
 * Get courses by department
 * @param {string} department - Department code (e.g., "MATH")
 * @returns {Array} Array of courses in the department
 */
export function getCoursesByDepartment(department) {
	return catalog.filter(course => 
		course.course_number.startsWith(department.toUpperCase())
	);
}

/**
 * Format course for display
 * @param {Object} course - Course object
 * @returns {Object} Formatted course with display properties
 */
export function formatCourseForDisplay(course) {
	return {
		code: course.course_number,
		name: course.title,
		credits: course.semester_hours,
		description: course.description,
		url: course.url
	};
}

/**
 * Enhance course option with catalog data
 * @param {Object} courseOption - Course option from requirements
 * @returns {Object} Enhanced course option with catalog details
 */
export function enhanceCourseOption(courseOption) {
	const catalogCourse = getCourseByNumber(courseOption.code);
	
	if (catalogCourse) {
		return {
			...courseOption,
			name: courseOption.name || catalogCourse.title,
			credits: catalogCourse.semester_hours,
			semesters: catalogCourse.semester || [],
			description: catalogCourse.description || '',
			fromCatalog: true
		};
	}
	
	return {
		...courseOption,
		semesters: [],
		description: '',
		fromCatalog: false
	};
}

/**
 * Check if a course is offered in a specific semester
 * @param {string} courseCode - Course code (e.g., "MATH 101") 
 * @param {string} semesterType - Semester type ("Fall", "Spring", "Summer", "Winter")
 * @returns {boolean} True if course is offered in that semester
 */
export function isCourseOfferedInSemester(courseCode, semesterType) {
	const catalogCourse = getCourseByNumber(courseCode);
	if (!catalogCourse || !catalogCourse.semester) return true; // Allow if no data
	
	return catalogCourse.semester.includes(semesterType);
}

/**
 * Get formatted semester list for display
 * @param {Array} semesters - Array of semester strings
 * @returns {string} Formatted semester list
 */
export function formatSemesterList(semesters) {
	if (!semesters || semesters.length === 0) return '';
	
	// Sort semesters in academic order
	const order = { 'Fall': 1, 'Spring': 2, 'Summer': 3, 'Winter': 4 };
	const sorted = semesters.sort((a, b) => (order[a] || 5) - (order[b] || 5));
	
	return sorted.join(', ');
}