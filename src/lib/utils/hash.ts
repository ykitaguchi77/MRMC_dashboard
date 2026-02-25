/**
 * Deterministic hash function from the study specification.
 * Produces a non-negative 32-bit integer from a string.
 */
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // 32bit integer
  }
  return Math.abs(hash);
}
