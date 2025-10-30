import { json } from '@sveltejs/kit';
import { validateShareTokenServerside, updateSharedScheduledCourseServerside } from '../../../lib/supabaseServiceRole.js';

export async function POST({ request, url }) {
  const shareToken = url.searchParams.get('share');
  
  if (!shareToken) {
    return json({ success: false, error: 'Share token required' }, { status: 400 });
  }
  
  try {
    // Validate the share token and check permissions
    const validation = await validateShareTokenServerside(shareToken);
    if (!validation.success) {
      return json({ success: false, error: validation.error }, { status: 404 });
    }

    if (validation.data.permissionLevel !== 'edit') {
      return json({ success: false, error: 'Edit permission required' }, { status: 403 });
    }

    const { courseId, toSemesterId, courseData } = await request.json();

    // Update the scheduled course
    const result = await updateSharedScheduledCourseServerside(
      validation.data.ownerId,
      courseId,
      toSemesterId,
      courseData
    );

    return json(result);
  } catch (error) {
    console.error('API error:', error);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}