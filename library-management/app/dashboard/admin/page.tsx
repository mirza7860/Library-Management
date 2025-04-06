"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, Shield, Clock } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export default function AdminDashboard() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalLibrarians: 0,
    totalBorrowers: 0,
    totalBooks: 0,
    overdueBooks: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get librarians count
        const { count: librariansCount, error: librariansError } = await supabase
          .from("librarians")
          .select("*", { count: "exact", head: true })

        if (librariansError) throw librariansError

        // Get borrowers count
        const { count: borrowersCount, error: borrowersError } = await supabase
          .from("borrowers")
          .select("*", { count: "exact", head: true })

        if (borrowersError) throw borrowersError

        // Get books count
        const { count: booksCount, error: booksError } = await supabase
          .from("books")
          .select("*", { count: "exact", head: true })

        if (booksError) throw booksError

        // Get overdue books count
        const { count: overdueCount, error: overdueError } = await supabase
          .from("assignments")
          .select("*", { count: "exact", head: true })
          .eq("status", "overdue")

        if (overdueError) throw overdueError

        setStats({
          totalLibrarians: librariansCount || 0,
          totalBorrowers: borrowersCount || 0,
          totalBooks: booksCount || 0,
          overdueBooks: overdueCount || 0,
        })
      } catch (error) {
        console.error("Error fetching admin stats:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [toast])

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500">Welcome to the admin panel. Manage librarians and system settings.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Librarians</p>
                  <p className="text-3xl font-bold">{stats.totalLibrarians}</p>
                </div>
                <div className="rounded-full p-2 bg-purple-100 text-purple-700">
                  <Shield className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Borrowers</p>
                  <p className="text-3xl font-bold">{stats.totalBorrowers}</p>
                </div>
                <div className="rounded-full p-2 bg-blue-100 text-blue-700">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Books</p>
                  <p className="text-3xl font-bold">{stats.totalBooks}</p>
                </div>
                <div className="rounded-full p-2 bg-green-100 text-green-700">
                  <BookOpen className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Overdue Books</p>
                  <p className="text-3xl font-bold">{stats.overdueBooks}</p>
                </div>
                <div className="rounded-full p-2 bg-amber-100 text-amber-700">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/dashboard/admin/librarians">
            <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-purple-100 text-purple-700 rounded-full p-3">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Librarians</h3>
                  <p className="text-sm text-slate-500">Add, edit, or remove librarian accounts</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Important information about the library system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">System Version</h3>
              <p className="text-sm text-slate-500">Library Management System v1.0.0</p>
            </div>
            <div>
              <h3 className="font-medium">Support Contact</h3>
              <p className="text-sm text-slate-500">Email: admin@library.edu</p>
              <p className="text-sm text-slate-500">Phone: (123) 456-7890</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

