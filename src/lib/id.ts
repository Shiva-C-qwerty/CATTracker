/** Generate a unique id. Uses the platform crypto UUID (available in all
 * modern browsers and Node 19+). */
export function newId(): string {
  return crypto.randomUUID();
}
