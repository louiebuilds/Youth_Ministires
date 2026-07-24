export type PersonDisplayName = Readonly<{
  firstName: string;
  lastName: string;
  preferredName?: string | null;
}>;

function normalizeNamePart(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function formatMinimizedStudentName({
  firstName,
  lastName,
  preferredName,
}: PersonDisplayName) {
  const givenName = normalizeNamePart(preferredName || firstName);
  const normalizedLastName = normalizeNamePart(lastName);
  const lastInitial = Array.from(normalizedLastName)[0]?.toLocaleUpperCase();

  if (!givenName || !lastInitial) {
    return "Student";
  }

  return `${givenName} ${lastInitial}.`;
}
