/** Keeps context identities stable when server checks return the same
 * flat profile/goal/entitlement data. No deep JSON serialization. */
export function sameSessionRecord<T extends object>(a: T | null, b: T | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a) as Array<keyof T>;
  const bKeys = Object.keys(b);
  return aKeys.length === bKeys.length && aKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(b, key) && Object.is(a[key], b[key]));
}
