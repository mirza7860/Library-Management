import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, GraduationCap, User, Shield } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">College Library System</h1>
          <p className="mt-2 text-slate-600">Welcome to the library management system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col h-full">
            <CardHeader className="text-center">
              <div className="mx-auto bg-blue-100 text-blue-700 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <GraduationCap className="h-8 w-8" />
              </div>
              <CardTitle>Student Login</CardTitle>
              <CardDescription>Access your borrowing history and manage your profile</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4 text-blue-600" />
                  View available books
                </li>
                <li className="flex items-center">
                  <User className="mr-2 h-4 w-4 text-blue-600" />
                  Check your borrowing history
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/login/student">Login as Student</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col h-full">
            <CardHeader className="text-center">
              <div className="mx-auto bg-purple-100 text-purple-700 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8" />
              </div>
              <CardTitle>Librarian Login</CardTitle>
              <CardDescription>Manage books, borrowers, and assignments</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4 text-purple-600" />
                  Manage book inventory
                </li>
                <li className="flex items-center">
                  <User className="mr-2 h-4 w-4 text-purple-600" />
                  Track borrowers and assignments
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="outline">
                <Link href="/login/librarian">Login as Librarian</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col h-full">
            <CardHeader className="text-center">
              <div className="mx-auto bg-slate-100 text-slate-700 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>System administration and management</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <Shield className="mr-2 h-4 w-4 text-slate-600" />
                  Manage librarian accounts
                </li>
                <li className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4 text-slate-600" />
                  System configuration
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="secondary">
                <Link href="/login/admin">Login as Admin</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}

