import { validateShareTokenServerside, getSharedScheduleDataServerside } from '$lib/supabaseServiceRole.js';
import { enhanceCourseOption } from '$lib/catalog.js';

export async function handle({ event, resolve }) {
  // Check if this is a shared schedule request
  const shareToken = event.url.searchParams.get('share');
  
  if (shareToken) {
    try {
      // Validate the share token
      const validation = await validateShareTokenServerside(shareToken);
      if (validation.success) {
        // Get the shared schedule data
        const scheduleResult = await getSharedScheduleDataServerside(validation.data.ownerId);
        if (scheduleResult.success) {
          // Process requirements with catalog data
          const processedRequirements = scheduleResult.data.requirements.map(requirement => {
            if (requirement.course_options) {
              requirement.course_options = requirement.course_options.map(course => 
                enhanceCourseOption(course)
              );
            }
            return requirement;
          });

          // Store shared data in locals for the page to access
          event.locals.sharedSchedule = {
            shareData: validation.data,
            scheduleData: {
              requirements: processedRequirements,
              semesters: scheduleResult.data.semesters,
              scheduledCourses: scheduleResult.data.scheduledCourses
            },
            shareToken,
            isSharedMode: true
          };
        }
      }
    } catch (error) {
      console.error('Error processing shared schedule:', error);
      // Don't block the request, just continue without shared data
    }
  }
  
  return resolve(event);
}