/**
 * Validates whether a date of birth meets the 18+ age requirement.
 * Explicitly accounts for leap years and exact month/day boundaries.
 */
export function calculateAge(dob: Date | string): number {
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  if (isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

export function isAtLeast18(dob: Date | string): boolean {
  return calculateAge(dob) >= 18;
}
