export async function load({ locals, url }) {
  // Check if we have shared schedule data from hooks
  if (locals.sharedSchedule) {
    return {
      sharedSchedule: locals.sharedSchedule
    };
  }

  // Normal page load - no shared data
  return {};
}