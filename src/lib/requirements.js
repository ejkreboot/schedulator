import { supabase } from './supabaseClient.js';
import { getCourseByNumber } from './catalog.js';

// Create a new requirement
export async function createRequirement(requirement) {
	const { data, error } = await supabase
		.from('requirements')
		.insert([requirement])
		.select()
		.single();
	
	return { data, error };
}

// Get all requirements for the current user
export async function getRequirements() {
	const { data, error } = await supabase
		.from('requirements')
		.select('*')
		.order('created_at', { ascending: false });
	
	return { data, error };
}

// Get requirements by category
export async function getRequirementsByCategory(category) {
	const { data, error } = await supabase
		.from('requirements')
		.select('*')
		.eq('category', category)
		.order('priority', { ascending: false });
	
	return { data, error };
}

// Update a requirement
export async function updateRequirement(id, updates) {
	const { data, error } = await supabase
		.from('requirements')
		.update(updates)
		.eq('id', id)
		.select()
		.single();
	
	return { data, error };
}

// Delete a requirement
export async function deleteRequirement(id) {
	const { data, error } = await supabase
		.from('requirements')
		.delete()
		.eq('id', id);
	
	return { data, error };
}

// Toggle completion status
export async function toggleRequirementCompletion(id, isCompleted) {
	return updateRequirement(id, { is_completed: isCompleted });
}

// Load user requirements formatted for the semester view
export async function loadUserRequirements() {
	const { data: requirements, error } = await supabase
		.from('requirements')
		.select('*')
		.eq('is_completed', false) // Only get uncompleted requirements
		.order('category', { ascending: true })
		.order('priority', { ascending: false });
	
	if (error) {
		console.error('Error loading requirements:', error);
		throw error;
	}
	
	// Group requirements by individual requirement (not by category)
	const groupedRequirements = [];
	
	requirements?.forEach(req => {
		const courseOptions = req.course_options || [];
		
		if (courseOptions.length > 0) {
			const requirementGroup = {
				id: req.id,
				name: req.title, // Use the actual requirement title
				category: req.category, // Keep category for badge display
				description: req.description,
				credits: req.credits,
				courses: []
			};
			
			// Add each course option as a separate course
			courseOptions.forEach(courseOption => {
				// Get catalog data for this course
				const catalogCourse = getCourseByNumber(courseOption.code);
				
				requirementGroup.courses.push({
					code: courseOption.code,
					name: courseOption.name || catalogCourse?.title || courseOption.code,
					credits: catalogCourse?.semester_hours ? parseInt(catalogCourse.semester_hours) : (req.credits || 3),
					semesters: catalogCourse?.semester || [],
					description: catalogCourse?.description || '',
					category: req.category,
					requirementId: req.id,
					requirementTitle: req.title,
					scheduled: false,
					scheduledSemester: null,
					fromCatalog: !!catalogCourse
				});
			});
			
			groupedRequirements.push(requirementGroup);
		}
	});
	
	// Sort by category, then by requirement title
	return groupedRequirements.sort((a, b) => {
		if (a.category !== b.category) {
			return a.category.localeCompare(b.category);
		}
		return a.name.localeCompare(b.name);
	});
}