import type { PrayerRequestVisibility } from "@/lib/supabase/database.types";

export const initialPrayerVisibility: PrayerRequestVisibility;
export const prayerVisibilityOptions: ReadonlyArray<{
  value: PrayerRequestVisibility;
  label: string;
}>;
export function normalizePrayerVisibility(value: string): PrayerRequestVisibility;
export function prayerVisibilityLabel(value: PrayerRequestVisibility): string;
