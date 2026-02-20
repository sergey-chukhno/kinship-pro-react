/**
 * Compute age in full years from a birthday string (YYYY-MM-DD).
 * Returns null if birthday is missing or invalid.
 */
export function getAge(birthday: string | null | undefined): number | null {
  if (birthday == null || typeof birthday !== 'string' || !birthday.trim()) {
    return null;
  }
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/**
 * Returns true if the given birthday corresponds to a person under 15 years old.
 * Same rule as "membre mineur" (BLEU Premium < 15).
 */
export function isUnder15(birthday: string | null | undefined): boolean {
  const age = getAge(birthday);
  return age !== null && age < 15;
}
