import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const { data, error } = await supabase
      .from("assignments")
      .select(`
        *,
        books:book_id (
          id,
          title,
          author,
          category
        ),
        borrowers:borrower_id (
          id,
          name,
          type,
          email,
          phone
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Transform the data to a more usable format
    const formattedData = {
      id: data.id,
      bookId: data.book_id,
      book: data.books,
      borrowerId: data.borrower_id,
      borrower: data.borrowers,
      assignedDate: data.assigned_date,
      dueDate: data.due_date,
      returnDate: data.return_date,
      status: data.status,
    }

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error fetching assignment:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    // If marking as returned, set the return date to today
    if (body.status === "returned" && !body.return_date) {
      body.return_date = new Date().toISOString().split("T")[0]
    }

    const { data, error } = await supabase.from("assignments").update(body).eq("id", id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating assignment:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const { error } = await supabase.from("assignments").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

