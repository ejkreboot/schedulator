// Course scheduling utilities and data structures for future schedule builder

/**
 * Course data structure for schedule planning
 */
export class Course {
	constructor({
		code,
		name,
		credits,
		prerequisites = [],
		sections = [],
		category = 'Elective'
	}) {
		this.code = code;
		this.name = name;
		this.credits = credits;
		this.prerequisites = prerequisites;
		this.sections = sections;
		this.category = category;
	}
}

/**
 * Course section with time/location details
 */
export class CourseSection {
	constructor({
		sectionNumber,
		instructor,
		days,
		startTime,
		endTime,
		location,
		capacity,
		enrolled = 0
	}) {
		this.sectionNumber = sectionNumber;
		this.instructor = instructor;
		this.days = days; // ['M', 'W', 'F'] or ['T', 'R']
		this.startTime = startTime; // '09:00'
		this.endTime = endTime; // '09:50'
		this.location = location;
		this.capacity = capacity;
		this.enrolled = enrolled;
	}
}

/**
 * Find which requirements a course can satisfy
 */
export function getRequirementMatches(course, requirements) {
	return requirements.filter(req => 
		req.course_options?.some(option => 
			option.code === course.code || 
			option.code.includes(course.code.split(' ')[0]) // Match by department
		)
	);
}

/**
 * Check for schedule conflicts between courses
 */
export function hasTimeConflict(section1, section2) {
	// Check if any days overlap
	const daysOverlap = section1.days.some(day => section2.days.includes(day));
	if (!daysOverlap) return false;
	
	// Check if times overlap
	const start1 = timeToMinutes(section1.startTime);
	const end1 = timeToMinutes(section1.endTime);
	const start2 = timeToMinutes(section2.startTime);
	const end2 = timeToMinutes(section2.endTime);
	
	return (start1 < end2 && start2 < end1);
}

/**
 * Convert time string to minutes for comparison
 */
function timeToMinutes(timeStr) {
	const [hours, minutes] = timeStr.split(':').map(Number);
	return hours * 60 + minutes;
}

/**
 * Generate possible schedules that satisfy requirements
 */
export function generateScheduleOptions(requirements, availableCourses, maxCredits = 18) {
	const incompleteRequirements = requirements.filter(req => !req.is_completed);
	const possibleCourses = [];
	
	// Find all courses that can satisfy incomplete requirements
	incompleteRequirements.forEach(req => {
		req.course_options?.forEach(option => {
			const course = availableCourses.find(c => c.code === option.code);
			if (course) {
				possibleCourses.push({
					course,
					requirement: req,
					priority: req.priority
				});
			}
		});
	});
	
	// Sort by priority and try to build schedules
	possibleCourses.sort((a, b) => b.priority - a.priority);
	
	// This is where the real scheduling algorithm would go
	// For now, just return the structure for future implementation
	return {
		possibleCourses,
		highPriority: possibleCourses.filter(pc => pc.priority >= 4),
		mediumPriority: possibleCourses.filter(pc => pc.priority === 3),
		lowPriority: possibleCourses.filter(pc => pc.priority <= 2)
	};
}

/**
 * Sample course data for demonstration
 */
export const sampleCourses = [
	new Course({
		code: 'MATH 101',
		name: 'Calculus I',
		credits: 4,
		sections: [
			new CourseSection({
				sectionNumber: '001',
				instructor: 'Dr. Smith',
				days: ['M', 'W', 'F'],
				startTime: '09:00',
				endTime: '09:50',
				location: 'MATH 150',
				capacity: 30
			})
		]
	}),
	new Course({
		code: 'PHYS 201',
		name: 'Physics I',
		credits: 4,
		prerequisites: ['MATH 101'],
		sections: [
			new CourseSection({
				sectionNumber: '001',
				instructor: 'Dr. Johnson',
				days: ['T', 'R'],
				startTime: '11:00',
				endTime: '12:30',
				location: 'PHYS 101',
				capacity: 25
			})
		]
	})
];