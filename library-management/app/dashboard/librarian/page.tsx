"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Clock, AlertTriangle, BookCopy } from "lucide-react";
import Link from "next/link";

export default function LibrarianDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="librarian">
        <div className="flex items-center justify-center h-64">
          <p>Loading dashboard data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="librarian">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout role="librarian">
        <div className="flex items-center justify-center h-64">
          <p>No data available.</p>
        </div>
      </DashboardLayout>
    );
  }

  const { stats, recentActivities, overdueAlerts } = dashboardData;

  return (
    <DashboardLayout role="librarian">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Librarian Dashboard
          </h1>
          <p className="text-slate-500">
            Welcome back! Here's an overview of the library system.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Books
                  </p>
                  <p className="text-3xl font-bold">{stats.totalBooks}</p>
                </div>
                <div className="rounded-full p-2 bg-blue-100 text-blue-700">
                  <BookOpen className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Borrowed Books
                  </p>
                  <p className="text-3xl font-bold">{stats.borrowedBooks}</p>
                </div>
                <div className="rounded-full p-2 bg-green-100 text-green-700">
                  <BookCopy className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Overdue Books
                  </p>
                  <p className="text-3xl font-bold">{stats.overdueBooks}</p>
                </div>
                <div className="rounded-full p-2 bg-amber-100 text-amber-700">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Active Borrowers
                  </p>
                  <p className="text-3xl font-bold">{stats.activeBorrowers}</p>
                </div>
                <div className="rounded-full p-2 bg-purple-100 text-purple-700">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/librarian/books">
            <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-100 text-blue-700 rounded-full p-3">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Books</h3>
                  <p className="text-sm text-slate-500">
                    Add, edit, or remove books
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/librarian/borrowers">
            <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-purple-100 text-purple-700 rounded-full p-3">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Borrowers</h3>
                  <p className="text-sm text-slate-500">
                    Add, edit, or remove borrowers
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/librarian/assignments">
            <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-green-100 text-green-700 rounded-full p-3">
                  <BookCopy className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Book Assignments</h3>
                  <p className="text-sm text-slate-500">
                    Assign or return books
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>
                Latest book assignments and returns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <p className="text-center text-slate-500">
                    No recent activities
                  </p>
                ) : (
                  recentActivities.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div
                        className={`rounded-full p-2 ${
                          activity.status === "borrowed"
                            ? "bg-green-100 text-green-700"
                            : activity.status === "returned"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {activity.status === "borrowed" ? (
                          <BookCopy className="h-4 w-4" />
                        ) : activity.status === "returned" ? (
                          <BookOpen className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{activity.book}</p>
                        <p className="text-sm text-slate-500 truncate">
                          {activity.borrower}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-slate-500">
                          {activity.date}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          {/* Overdue Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Overdue Alerts</CardTitle>
                <CardDescription>
                  Books that need to be returned
                </CardDescription>
              </div>
              <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overdueAlerts.length === 0 ? (
                  <p className="text-center text-slate-500">No overdue books</p>
                ) : (
                  overdueAlerts.map((alert: any) => (
                    <div
                      key={alert.id}
                      className="flex items-center gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{alert.book}</p>
                        <p className="text-sm text-slate-500 truncate">
                          {alert.borrower}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-amber-600">
                          {alert.daysOverdue} days overdue
                        </p>
                        <p className="text-xs text-slate-500">
                          Due: {alert.dueDate}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/librarian/assignments">
                    View All Overdue Books
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
