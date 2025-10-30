// Database migration utility to convert old course_code format to new course_options format

import { supabase } from './supabaseClient.js';

/**
 * Migrate old requirements from course_code to course_options format
 * This should be run once to update existing data
 */
export async function migrateRequirementsSchema() {
	console.log('Starting requirements schema migration...');
	
	// Get all requirements that have course_code but no course_options
	const { data: requirements, error: fetchError } = await supabase
		.from('requirements')
		.select('*')
		.not('course_code', 'is', null)
		.is('course_options', null);
	
	if (fetchError) {
		console.error('Error fetching requirements:', fetchError);
		return { success: false, error: fetchError };
	}
	
	if (!requirements || requirements.length === 0) {
		console.log('No requirements need migration.');
		return { success: true, migrated: 0 };
	}
	
	console.log(`Found ${requirements.length} requirements to migrate`);
	
	// Migrate each requirement
	const updates = requirements.map(req => ({
		id: req.id,
		course_options: [
			{
				code: req.course_code,
				name: '' // Will be filled from catalog when displayed
			}
		]
	}));
	
	const { data: updated, error: updateError } = await supabase
		.from('requirements')
		.upsert(updates)
		.select();
	
	if (updateError) {
		console.error('Error updating requirements:', updateError);
		return { success: false, error: updateError };
	}
	
	console.log(`Successfully migrated ${updated.length} requirements`);
	return { success: true, migrated: updated.length };
}

/**
 * Check if migration is needed
 */
export async function checkMigrationNeeded() {
	const { data, error } = await supabase
		.from('requirements')
		.select('id')
		.not('course_code', 'is', null)
		.is('course_options', null)
		.limit(1);
	
	if (error) return false;
	return data && data.length > 0;
}