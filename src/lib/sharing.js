import { supabase } from './supabaseClient.js';

/**
 * Creates a new schedule share link
 * @param {string} permissionLevel - 'view' or 'edit'
 * @param {string} description - Optional description of what's being shared
 * @param {Date} expiresAt - Optional expiration date
 * @returns {Object} Share data with token
 */
export async function createScheduleShare(permissionLevel = 'view', description = null, expiresAt = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('schedule_shares')
      .insert([{
        owner_id: user.id,
        permission_level: permissionLevel,
        description,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        id: data.id,
        shareToken: data.share_token,
        permissionLevel: data.permission_level,
        description: data.description,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        shareUrl: `${window.location.origin}?share=${data.share_token}`
      }
    };
  } catch (error) {
    console.error('Error creating schedule share:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Gets all shares owned by the current user
 * @returns {Array} List of user's shares
 */
export async function getUserShares() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('schedule_shares')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data.map(share => ({
        id: share.id,
        shareToken: share.share_token,
        permissionLevel: share.permission_level,
        description: share.description,
        expiresAt: share.expires_at,
        createdAt: share.created_at,
        lastAccessed: share.last_accessed,
        accessCount: share.access_count,
        shareUrl: `${window.location.origin}?share=${share.share_token}`,
        isExpired: share.expires_at && new Date(share.expires_at) < new Date()
      }))
    };
  } catch (error) {
    console.error('Error getting user shares:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validates a share token and returns share information
 * @param {string} shareToken - The share token to validate
 * @returns {Object} Share validation result
 */
export async function validateShareToken(shareToken) {
  try {
    const { data, error } = await supabase
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
    await supabase
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
 * Gets schedule data for a shared schedule
 * @param {string} ownerId - The owner's user ID
 * @returns {Object} Complete schedule data
 */
export async function getSharedScheduleData(ownerId) {
  try {
    // Get requirements with their courses
    const { data: requirements, error: reqError } = await supabase
      .from('requirements')
      .select('*')
      .eq('user_id', ownerId)
      .order('created_at');

    if (reqError) throw reqError;

    // Get all semesters for the user
    const { data: semesters, error: semError } = await supabase
      .from('semesters')
      .select('*')
      .eq('user_id', ownerId)
      .order('year', { ascending: true })
      .order('term_type', { ascending: true });

    if (semError) throw semError;

    // Get all scheduled courses
    const { data: scheduledCourses, error: schedError } = await supabase
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
 * Updates a scheduled course in a shared schedule (edit permission required)
 * @param {string} shareToken - The share token
 * @param {string} courseId - Course identifier
 * @param {string} fromSemesterId - Source semester ID (null if from requirements)
 * @param {string} toSemesterId - Target semester ID (null if removing from schedule)
 * @returns {Object} Update result
 */
export async function updateSharedScheduledCourse(shareToken, courseId, fromSemesterId, toSemesterId) {
  try {
    // First validate the share token and check permissions
    const validation = await validateShareToken(shareToken);
    if (!validation.success) {
      return validation;
    }

    if (validation.data.permissionLevel !== 'edit') {
      return { success: false, error: 'Edit permission required' };
    }

    const ownerId = validation.data.ownerId;

    if (toSemesterId) {
      // Adding/moving course to a semester
      const { data, error } = await supabase
        .from('scheduled_courses')
        .upsert([{
          user_id: ownerId,
          course_code: courseId,
          semester_id: toSemesterId
        }], {
          onConflict: 'user_id,course_code'
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } else {
      // Removing course from schedule
      const { error } = await supabase
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

/**
 * Deletes a schedule share
 * @param {string} shareId - The share ID to delete
 * @returns {Object} Delete result
 */
export async function deleteScheduleShare(shareId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('schedule_shares')
      .delete()
      .eq('id', shareId)
      .eq('owner_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting schedule share:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates a schedule share's settings
 * @param {string} shareId - The share ID to update
 * @param {Object} updates - Updates to apply
 * @returns {Object} Update result
 */
export async function updateScheduleShare(shareId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('schedule_shares')
      .update(updates)
      .eq('id', shareId)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        id: data.id,
        shareToken: data.share_token,
        permissionLevel: data.permission_level,
        description: data.description,
        expiresAt: data.expires_at,
        shareUrl: `${window.location.origin}?share=${data.share_token}`
      }
    };
  } catch (error) {
    console.error('Error updating schedule share:', error);
    return { success: false, error: error.message };
  }
}