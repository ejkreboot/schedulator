import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Service role client - bypasses RLS for server-side operations
export const supabaseServiceRole = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Validates share token and returns owner data (server-side only)
 * @param {string} shareToken - The share token to validate
 * @returns {Object} Validation result with owner data
 */
export async function validateShareTokenServerside(shareToken) {
  try {
    const { data, error } = await supabaseServiceRole
      .from('schedule_shares')
      .select(`
        id,
        owner_id,
        permission_level,
        description,
        expires_at,
        created_at,
        access_count
      `)
      .eq('share_token', shareToken)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Share link not found' };
      }
      throw error;
    }

    // Check if share has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { success: false, error: 'Share link has expired' };
    }

    // Update access tracking
    await supabaseServiceRole
      .from('schedule_shares')
      .update({
        last_accessed: new Date().toISOString(),
        access_count: data.access_count + 1
      })
      .eq('id', data.id);

    return {
      success: true,
      data: {
        ownerId: data.owner_id,
        permissionLevel: data.permission_level,
        description: data.description,
        expiresAt: data.expires_at,
        createdAt: data.created_at
      }
    };
  } catch (error) {
    console.error('Error validating share token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Gets complete schedule data for sharing (server-side only)
 * @param {string} ownerId - The owner's user ID
 * @returns {Object} Complete schedule data
 */
export async function getSharedScheduleDataServerside(ownerId) {
  try {
    // Get requirements with their courses
    const { data: requirements, error: reqError } = await supabaseServiceRole
      .from('requirements')
      .select('*')
      .eq('user_id', ownerId)
      .order('created_at');

    if (reqError) throw reqError;

    // Get all semesters for the user
    const { data: semesters, error: semError } = await supabaseServiceRole
      .from('semesters')
      .select('*')
      .eq('user_id', ownerId)
      .order('year', { ascending: true })
      .order('term_type', { ascending: true });

    if (semError) throw semError;

    // Get all scheduled courses
    const { data: scheduledCourses, error: schedError } = await supabaseServiceRole
      .from('scheduled_courses')
      .select('*')
      .eq('user_id', ownerId);

    if (schedError) throw schedError;

    return {
      success: true,
      data: {
        requirements,
        semesters,
        scheduledCourses
      }
    };
  } catch (error) {
    console.error('Error getting shared schedule data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates a scheduled course in shared schedule (server-side only)
 * @param {string} ownerId - Owner's user ID
 * @param {string} courseId - Course identifier
 * @param {string} toSemesterId - Target semester ID (null if removing)
 * @returns {Object} Update result
 */
export async function updateSharedScheduledCourseServerside(ownerId, courseId, toSemesterId, courseData = null) {
  try {
    if (toSemesterId) {
      // First, check if course is already scheduled and remove it
      await supabaseServiceRole
        .from('scheduled_courses')
        .delete()
        .eq('user_id', ownerId)
        .eq('course_code', courseId);

      // Then add the course to the new semester
      const { data, error } = await supabaseServiceRole
        .from('scheduled_courses')
        .insert([{
          user_id: ownerId,
          course_code: courseId,
          course_name: courseData?.name || courseData?.title || courseId,
          semester_id: toSemesterId,
          credits: courseData?.credits || courseData?.credit_hours || 3,
          status: 'planned'
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } else {
      // Removing course from schedule
      const { error } = await supabaseServiceRole
        .from('scheduled_courses')
        .delete()
        .eq('user_id', ownerId)
        .eq('course_code', courseId);

      if (error) throw error;
      return { success: true };
    }
  } catch (error) {
    console.error('Error updating shared scheduled course:', error);
    return { success: false, error: error.message };
  }
}