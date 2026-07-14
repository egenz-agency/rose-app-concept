import { redirect } from "next/navigation"

// In the multi-tenant product the root isn't a gift — send visitors to sign in.
// (Recipients reach their gift via the private /g/<token> link, never "/".)
export default function Home() {
  redirect("/login")
}
