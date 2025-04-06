import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const title = searchParams.get("title")
    const author = searchParams.get("author")
    const category = searchParams.get("category")
    const availability = searchParams.get("availability")

    let query = supabase.from("books").select("*")

    if (title) {
      query = query.ilike("title", `%${title}%`)
    }

    if (author) {
      query = query.ilike("author", `%${author}%`)
    }

    if (category && category !== "All Categories") {
      query = query.eq("category", category)
    }

    if (availability === "Available") {
      query = query.gt("copies_available", 0)
    } else if (availability === "Unavailable") {
      query = query.eq("copies_available", 0)
    }

    const { data, error } = await query.order("title")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching books:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { title, author, isbn, category, total_copies } = body
    if (!title || !author || !isbn || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Set copies_available to total_copies if not provided
    const copies_available = body.copies_available ?? total_copies

    const { data, error } = await supabase
      .from("books")
      .insert([{ ...body, copies_available }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating book:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

