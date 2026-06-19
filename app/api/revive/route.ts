import { NextResponse } from "next/server"
import { reviveRose } from "@/lib/supabase/queries"

export async function POST() {
  try {
    const result = await reviveRose()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
