const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function partsInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour"), minute: part("minute"), second: part("second") };
}

export function formatDateTimeLocalInTimeZone(value: string | Date, timeZone: string) {
  const parts = partsInTimeZone(new Date(value), timeZone);
  const two = (number: number) => String(number).padStart(2, "0");
  return `${parts.year}-${two(parts.month)}-${two(parts.day)}T${two(parts.hour)}:${two(parts.minute)}`;
}

export function formatScheduleDateTime(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value));
}

export function localDateTimeToInstant(value: string, timeZone: string) {
  const match = localDateTimePattern.exec(value);
  if (!match) return null;
  const expected = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4]), minute: Number(match[5]) };
  const nominal = Date.UTC(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute);
  let candidate = nominal;
  try {
    for (let index = 0; index < 3; index += 1) {
      const actual = partsInTimeZone(new Date(candidate), timeZone);
      const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
      candidate += nominal - represented;
    }
    const roundTrip = partsInTimeZone(new Date(candidate), timeZone);
    if (roundTrip.year !== expected.year || roundTrip.month !== expected.month || roundTrip.day !== expected.day || roundTrip.hour !== expected.hour || roundTrip.minute !== expected.minute) return null;
    return new Date(candidate);
  } catch {
    return null;
  }
}
