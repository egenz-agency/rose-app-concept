import "server-only"
import { getAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/saasServer"

// ────────────────────────────────────────────────────────────────────────────
// Operator (masteradmin) access.
//
// The check is on user_id via the app_admins table — never on an email string.
// Emails change, and an email comparison would hand admin to whoever later
// registers the old address. It also can't be spoofed by a client: the identity
// comes from the validated session, and app_admins is RLS-locked with no policy
// so a signed-in customer can't even see the table exists.
//
// There is exactly one masteradmin, enforced by a unique index in the database
// rather than by remembering to check here.
// ────────────────────────────────────────────────────────────────────────────

export interface Operator {
  userId: string
  email: string
}

// Returns the operator, or null for everyone else. Never throws — callers decide
// whether a non-admin gets a 404 (preferred: don't confirm the page exists) or
// a redirect.
export async function getOperator(): Promise<Operator | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await getAdminClient()
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("role", "masteradmin")
    .maybeSingle()

  if (error || !data) return null
  return { userId: user.id, email: user.email ?? "" }
}

// Use at the top of every admin server action. Throws rather than returning a
// falsy value so a forgotten `if` can't silently permit the action.
export async function requireOperator(): Promise<Operator> {
  const op = await getOperator()
  if (!op) throw new Error("Not authorised.")
  return op
}
