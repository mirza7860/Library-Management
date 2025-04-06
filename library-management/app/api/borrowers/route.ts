import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const name = searchParams.get("name")
    const department = searchParams.get("department")
    const type = searchParams.get("type")

    let query = supabase.from("borrowers").select("*")

    if (name) {
      query = query.ilike("name", `%${name}%`)
    }

    if (department && department !== "All Departments") {
      query = query.eq("department", department)
    }

    if (type && type !== "All") {
      query = query.eq("type", type.toLowerCase())
    }

    const { data, error } = await query.order("name")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // For each borrower, count their borrowed books
    const borrowersWithCounts = await Promise.all(
      data.map(async (borrower) => {
        const { count, error: countError } = await supabase
          .from("assignments")
          .select("id", { count: "exact", head: true })
          .eq("borrower_id", borrower.id)
          .in("status", ["borrowed", "overdue"])

        return {
          ...borrower,
          borrowedBooks: count || 0,
        }
      }),
    )

    return NextResponse.json(borrowersWithCounts)
  } catch (error) {
    console.error("Error fetching borrowers:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { name, student_or_faculty_id, email, department, type } = body
    if (!name || !student_or_faculty_id || !email || !department || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data, error } = await supabase.from("borrowers").insert([body]).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating borrower:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

