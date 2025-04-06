"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { BookOpen, Users, Home, LogOut, BookCopy, History, User, Shield, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface DashboardLayoutProps {
  children: React.ReactNode
  role: "librarian" | "student" | "admin"
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  const [isMobile, setIsMobile] = useState(false)

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)

    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [])

  // Redirect if user is not authenticated or has wrong role
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
      return
    }

    if (!authLoading && user) {
      // Admin can access all dashboards
      if (user.role === "admin") {
        return
      }

      // Librarian can only access librarian dashboard
      if (user.role === "librarian" && role !== "librarian") {
        router.push("/dashboard/librarian")
        return
      }

      // Student can only access student dashboard
      if (user.role === "student" && role !== "student") {
        router.push("/dashboard/student")
        return
      }
    }
  }, [authLoading, user, role, router])

  const handleLogout = async () => {
    await signOut()
  }

  const adminNavItems = [
    { href: "/dashboard/admin", label: "Dashboard", icon: Home },
    { href: "/dashboard/admin/librarians", label: "Manage Librarians", icon: Shield },
  ]

  const librarianNavItems = [
    { href: "/dashboard/librarian", label: "Dashboard", icon: Home },
    { href: "/dashboard/librarian/books", label: "Manage Books", icon: BookOpen },
    { href: "/dashboard/librarian/borrowers", label: "Manage Borrowers", icon: Users },
    { href: "/dashboard/librarian/assignments", label: "Book Assignments", icon: BookCopy },
  ]

  const studentNavItems = [
    { href: "/dashboard/student", label: "My Books", icon: BookOpen },
    { href: "/dashboard/student/history", label: "Borrowing History", icon: History },
  ]

  let navItems = studentNavItems
  if (role === "librarian") navItems = librarianNavItems
  if (role === "admin") navItems = adminNavItems

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen bg-slate-50">
        <Sidebar className="border-r border-slate-200">
          <SidebarHeader className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              {role === "admin" ? (
                <Shield className="h-6 w-6 text-purple-600" />
              ) : role === "librarian" ? (
                <BookOpen className="h-6 w-6 text-blue-600" />
              ) : (
                <User className="h-6 w-6 text-slate-800" />
              )}
              <span className="text-xl font-bold">{role === "admin" ? "Admin Panel" : "Library System"}</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                        <Link href={item.href} className="flex items-center gap-2 px-3 py-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full h-8 w-8 flex items-center justify-center text-white ${
                    role === "admin" ? "bg-purple-600" : role === "librarian" ? "bg-blue-600" : "bg-slate-600"
                  }`}
                >
                  {user?.username?.charAt(0) || "U"}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{user?.username || "User"}</p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role || "Role"}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Log out</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleLogout} className="hidden sm:flex">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

