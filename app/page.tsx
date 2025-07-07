"use client"

import { useUser } from "@auth0/nextjs-auth0/client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, BookOpen, User, LogOut, Play, LayoutDashboard } from "lucide-react"

interface Project {
  _id: string
  name: string
  description: string
  createdAt: string
  scormFile?: {
    filename: string
    launchUrl?: string
    processing?: boolean
  }
}

export default function HomePage() {
  const { user, error, isLoading } = useUser()
  const [activeTab, setActiveTab] = useState<"courses" | "upload" | "dashboard">("courses")
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    if (user) {
      fetch("/api/projects")
        .then((res) => res.json())
        .then((data) => {
          const processed = data.filter(
            (p: Project) => p.scormFile && !p.scormFile.processing
          )
          setProjects(processed)
        })
    }
  }, [user])

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center">{error.message}</div>

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">SCORM Uploader</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/api/auth/login">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/api/auth/login">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">Upload SCORM Files with Ease</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Upload your SCORM packages and generate embeddable URLs for seamless LMS integration.
              Start with one free upload, upgrade for unlimited projects.
            </p>
            <Link href="/api/auth/login">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Uploading Free
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card>
              <CardHeader>
                <Upload className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Easy Upload</CardTitle>
                <CardDescription>
                  Drag and drop your SCORM files or browse to upload. We handle the rest.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Upload className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Instant Sharing</CardTitle>
                <CardDescription>
                  Get a public URL immediately after upload. Perfect for LMS embedding.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Upload className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Secure & Reliable</CardTitle>
                <CardDescription>
                  Your files are stored securely with enterprise-grade infrastructure.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">SCORM Uploader</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              {user.name}
            </div>
            <Link href="/api/auth/logout">
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {user.name}!</h1>
          <p className="text-xl text-gray-600">Manage and deploy your SCORM content</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("courses")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "courses" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              My Courses
            </button>

            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "upload" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Upload className="h-4 w-4" />
              Upload SCORM
            </button>

            <button
              onClick={() => (window.location.href = "/dashboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "dashboard" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              My Dashboard
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "courses" && (
          <Card>
            <CardHeader>
              <CardTitle>Your SCORM Courses</CardTitle>
              <CardDescription>Manage and launch your uploaded SCORM packages</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-gray-500">No processed SCORM projects found.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <Card key={project._id} className="p-4">
                      <div className="text-lg font-semibold">{project.name}</div>
                      <div className="text-sm text-gray-600 mb-2">{project.description}</div>
                      <div className="text-sm text-gray-500 mb-3">
                        File: {project.scormFile?.filename}
                      </div>
                      <div className="flex gap-2">
                        <Link href={project.scormFile?.launchUrl || "#"} target="_blank">
                          <Button size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Launch
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload New SCORM Package</CardTitle>
              <CardDescription>Create a new project and upload your SCORM content</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full"
                onClick={async () => {
                  const res = await fetch("/api/user")
                  if (res.ok) {
                    const data = await res.json()
                    if (data.canCreateProject) {
                      window.location.href = "/projects/new"
                    } else {
                      window.location.href = "/upgrade"
                    }
                  }
                }}
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload SCORM File
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
