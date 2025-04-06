import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"

export async function middleware(req: NextRequest) {
  // Update the Supabase session
  const res = await updateSession(req)

  // Skip auth check for auth callback route and public routes
  if (
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname.startsWith("/login")
  ) {
    return res
  }

  // Check if the user is authenticated using a custom cookie
  const authCookie = req.cookies.get("library_auth_token")

  // If the user is not authenticated and trying to access a protected route, redirect to login
  if (!authCookie && req.nextUrl.pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/", req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Check if the user is trying to access the correct dashboard based on their role
  if (authCookie) {
    try {
      const userData = JSON.parse(decodeURIComponent(authCookie.value))

      // If a student tries to access librarian dashboard
      if (userData.role === "student" && req.nextUrl.pathname.startsWith("/dashboard/librarian")) {
        return NextResponse.redirect(new URL("/dashboard/student", req.url))
      }

      // If a librarian tries to access student dashboard
      if (
        (userData.role === "librarian" || userData.role === "admin") &&
        req.nextUrl.pathname.startsWith("/dashboard/student")
      ) {
        return NextResponse.redirect(new URL("/dashboard/librarian", req.url))
      }
    } catch (error) {
      // If there's an error parsing the cookie, clear it and redirect to login
      const response = NextResponse.redirect(new URL("/", req.url))
      response.cookies.set("library_auth_token", "", { maxAge: 0 })
      return response
    }
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

