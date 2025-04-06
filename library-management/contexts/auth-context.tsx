"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

type User = {
  id: string
  username: string
  role: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (
    usernameOrEmail: string,
    password: string,
    userType?: "student" | "librarian" | "admin",
  ) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a stored auth token
        const authCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("library_auth_token="))
          ?.split("=")[1]

        if (authCookie) {
          const userData = JSON.parse(decodeURIComponent(authCookie))
          setUser(userData)

          // Verify the user still exists in the database
          if (userData.role === "librarian" || userData.role === "admin") {
            const { data, error } = await supabase.from("librarians").select("id").eq("id", userData.id).single()

            if (error || !data) {
              // User no longer exists, sign them out
              await signOut()
            }
          } else {
            const { data, error } = await supabase.from("borrowers").select("id").eq("id", userData.id).single()

            if (error || !data) {
              // User no longer exists, sign them out
              await signOut()
            }
          }
        }
      } catch (error) {
        console.error("Error checking session:", error)
        // If there's an error, clear the session to be safe
        document.cookie = "library_auth_token=; path=/; max-age=0"
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const signIn = async (usernameOrEmail: string, password: string, userType?: "student" | "librarian" | "admin") => {
    try {
      // Check if it's a librarian or admin login
      if (!userType || userType === "librarian" || userType === "admin") {
        // Try to find the librarian by username
        const { data: librarians, error: librarianError } = await supabase
          .from("librarians")
          .select("id, username, role, password")
          .eq("username", usernameOrEmail)
          .single()

        if (librarianError) {
          console.error("Error finding librarian:", librarianError)
        }

        if (librarians && librarians.password === password) {
          const userData = {
            id: librarians.id,
            username: librarians.username,
            role: librarians.role,
          }

          setUser(userData)
          setAuthCookie(userData)

          // Redirect based on role
          if (librarians.role === "admin") {
            router.push("/dashboard/admin")
          } else {
            router.push("/dashboard/librarian")
          }

          return { error: null }
        }
      }

      // Check if it's a student login
      if (!userType || userType === "student") {
        // Try to find the student by student_or_faculty_id
        const { data: students, error: studentError } = await supabase
          .from("borrowers")
          .select("id, name, student_or_faculty_id, password")
          .eq("student_or_faculty_id", usernameOrEmail)
          .single()

        if (studentError) {
          console.error("Error finding student:", studentError)
        }

        if (students && students.password === password) {
          const userData = {
            id: students.id,
            username: students.student_or_faculty_id,
            role: "student",
          }

          setUser(userData)
          setAuthCookie(userData)
          router.push("/dashboard/student")
          return { error: null }
        }
      }

      // If we get here, authentication failed
      return { error: new Error("Invalid username or password") }
    } catch (error) {
      console.error("Error during sign in:", error)
      return { error }
    }
  }

  const setAuthCookie = (user: User) => {
    // In a real app, you'd want to encrypt this and use HttpOnly cookies
    document.cookie = `library_auth_token=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Strict`
  }

  const signOut = async () => {
    setUser(null)
    document.cookie = "library_auth_token=; path=/; max-age=0"
    router.push("/")
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

