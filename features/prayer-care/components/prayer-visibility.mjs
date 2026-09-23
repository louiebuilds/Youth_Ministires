export const initialPrayerVisibility = "leadership";

export const prayerVisibilityOptions = [
  { value: "public", label: "Public signed-in summary" },
  { value: "leadership", label: "Ministry leadership" },
  { value: "private", label: "Private oversight" },
];

export function normalizePrayerVisibility(value) {
  return prayerVisibilityOptions.some((option) => option.value === value)
    ? value
    : initialPrayerVisibility;
}

export function prayerVisibilityLabel(value) {
  return prayerVisibilityOptions.find((option) => option.value === value)?.label
    ?? "Ministry leadership";
}
