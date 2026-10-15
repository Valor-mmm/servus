/**
 * Returns true if username is allowed to perform destructive admin operations
 * (delete-all, etc.).
 *
 * Rules (first match wins):
 * 1. If SERVUS_ADMIN_USERS is set (comma-separated), only those users are admin.
 * 2. Helper accounts (username starts with "helper-") are never admin.
 * 3. All other accounts are admin by default.
 *
 * Set SERVUS_ADMIN_USERS on Deno Deploy to lock down to a specific set of users,
 * e.g. SERVUS_ADMIN_USERS=monster
 */
export function isAdminUser(username: string): boolean {
  const explicit = Deno.env.get("SERVUS_ADMIN_USERS");
  if (explicit) {
    return explicit.split(",").map((s) => s.trim()).includes(username);
  }
  // Helper accounts created via invite must never have admin access.
  return !username.startsWith("helper-");
}
