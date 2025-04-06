import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const { data, error } = await supabase.from("borrowers").select("*").eq("id", id).single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Borrower not found" }, { status: 404 })
    }

    // Get borrowing history
    const { data: history, error: historyError } = await supabase
      .from("assignments")
      .select(`
        id,
        assigned_date,
        due_date,
        return_date,
        status,
        books (
          id,
          title,
          author,
          category
        )
      `)
      .eq("borrower_id", id)
      .order("assigned_date", { ascending: false })

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 })
    }

    return NextResponse.json({
      ...data,
      borrowingHistory: history,
    })
  } catch (error) {
    console.error("Error fetching borrower:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    // Validate required fields
    const { name, student_or_faculty_id, email, department, type } = body
    if (!name || !student_or_faculty_id || !email || !department || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data, error } = await supabase.from("borrowers").update(body).eq("id", id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Borrower not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating borrower:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Check if borrower has active assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("id")
      .eq("borrower_id", id)
      .in("status", ["borrowed", "overdue"])
      .limit(1)

    if (assignmentsError) {
      return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
    }

    if (assignments && assignments.length > 0) {
      return NextResponse.json({ error: "Cannot delete borrower with active assignments" }, { status: 400 })
    }

    const { error } = await supabase.from("borrowers").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting borrower:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

