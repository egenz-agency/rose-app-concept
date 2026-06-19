import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"

const ROSE_ID = "00000000-0000-0000-0000-000000000001"

export async function GET() {
  const sb = await getSupabaseServer()
  const { data, error } = await sb.from("rose_state").select("*").eq("id", ROSE_ID).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
