/**
 * Utilidades para CourseDetail
 */

export function getVimeoId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  const match = videoUrl.match(/(?:vimeo\.com\/|video\/)(\d+)/);
  return match ? match[1] : null;
}

export function getThumbnailUrl(vimeoId: string | null): string {
  return vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : "";
}

export function calculateCourseProgress(
  completedCount: number,
  totalActivities: number
): number {
  if (totalActivities === 0) return 0;
  return Math.round((completedCount / totalActivities) * 100);
}

export function getModuleAverageProgress(
  moduleActivities: any[],
  activityAttendees: any[]
): number {
  if (!moduleActivities.length) return 0;
  const total = moduleActivities.reduce((acc, act) => {
    const progress = getActivityProgress(activityAttendees, act._id);
    return acc + progress;
  }, 0);
  return total / moduleActivities.length;
}

export function getActivityProgress(
  activityAttendees: any[],
  activityId: string
): number {
  const attendee = activityAttendees.find((a) => {
    const rawId =
      typeof a?.activity_id === "object"
        ? a?.activity_id?._id || a?.activity_id?.id
        : a?.activity_id;

    return rawId?.toString?.() === activityId?.toString?.();
  });

  const numericProgress = Number(attendee?.progress ?? 0);
  if (!Number.isFinite(numericProgress)) return 0;
  return Math.max(0, Math.min(100, numericProgress));
}

export function getProgressColor(progress: number): string {
  if (progress === 100) return "green";
  if (progress > 0) return "yellow";
  return "gray";
}

export function sortActivitiesByDate(activities: any[]): any[] {
  return [...activities].sort(
    (a, b) =>
      new Date(a.create_at || a.created_at || a.createdAt || 0).getTime() -
      new Date(b.create_at || b.created_at || b.createdAt || 0).getTime()
  );
}

export function sortModulesByOrder(modules: any[]): any[] {
  return [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
