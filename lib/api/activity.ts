import activityData from "@/lib/data/mock-activity.json";
import type { Activity } from "@/lib/types/activity";
import { mockFetch } from "./client";

const activities = activityData as Activity[];
const DEFAULT_LIMIT = 10;

export async function getRecentActivity(limit: number = DEFAULT_LIMIT): Promise<Activity[]> {
  // Already sorted most-recent-first by the mock-data generator (step 7).
  return mockFetch(activities.slice(0, limit));
}

// An order's own timeline (Phase 4) needs every logged event that
// mentions it, wherever it falls in the full log — not the newest-N
// global slice getRecentActivity() returns for the dashboard feed.
// Chronological (oldest first): a timeline reads top-to-bottom as
// "what happened, in order," the reverse of the dashboard feed's
// newest-first convention.
export async function getActivityForOrder(orderId: string): Promise<Activity[]> {
  const related = activities
    .filter((activity) => activity.relatedOrderId === orderId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return mockFetch(related);
}
