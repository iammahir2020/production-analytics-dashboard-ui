import activityData from "@/lib/data/mock-activity.json";
import type { Activity } from "@/lib/types/activity";
import { mockFetch } from "./client";

const activities = activityData as Activity[];
const DEFAULT_LIMIT = 10;

export async function getRecentActivity(limit: number = DEFAULT_LIMIT): Promise<Activity[]> {
  // Already sorted most-recent-first by the mock-data generator (step 7).
  return mockFetch(activities.slice(0, limit));
}
