"use client"

import { useUser } from "@auth0/nextjs-auth0/client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Upload, Trash2, Crown, Play, FileText, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface ScormFile {
  filename: string
  packageId: string
  packageFolder: string
  publicUrl: string
  manifestUrl?: string
  launchUrl?: string
  launchFile?: string
  availableLaunchFiles?: { fileName: string; url: string }[];
  totalFiles: number
  uploadedAt: string
  fileSize: number
  processing?: boolean
}

interface Project {
  _id: string
  name: string
  description: string
  scormFile?: ScormFile
  createdAt: string
}

interface UserData {
  plan: "free" | "pro"
  projectCount: number
  maxProjects: number
  canCreateProject: boolean
}

export default function DashboardPage() {
  const { user, isLoading } = useUser()
  const [projects, setProjects] = useState<Project[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/api/auth/login")
    }

    if (user) {
      fetchData()
    }
  }, [user, isLoading])

  useEffect(() => {
    const hasProcessing = projects.some((p) => p.scormFile?.processing)
    if (!hasProcessing) return

    const interval = setInterval(() => {
      fetchData()
    }, 15000)

    return () => clearInterval(interval)
  }, [projects])

  const fetchData = async () => {
    await Promise.all([fetchProjects(), fetchUserData()])
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (err) {
      console.error("Error fetching projects", err)
    }
  }

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/user")
      if (res.ok) {
        const data = await res.json()
        setUserData(data)
      }
    } catch (err) {
      console.error("Error fetching user data", err)
    } finally {
      setLoading(false)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p._id !== projectId))
        fetchUserData()
        toast({ title: "Project deleted", description: "Your project has been successfully deleted." })
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" })
    }
  }

  const formatFileSize = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + " MB"

  const prioritizeLaunch = (files: string[]) => {
    const priority = ["story", "index", "main"]
    return (
      files.find((f) => priority.some((p) => f.toLowerCase().includes(p))) ||
      files[0] ||
      ""
    )
  }

  const updateLaunchFile = async (projectId: string, launchFile: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/launch-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchFile }),
      })
      if (res.ok) {
        await fetchProjects()
        toast({ title: "Launch file updated" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Could not update launch file", variant: "destructive" })
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">SCORM Uploader</span>
          </div>
          <div className="flex items-center gap-4">
            {userData?.plan === "free" && (
              <Link href="/upgrade">
                <Button variant="outline" className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade to Pro
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2">
              <img src={user?.picture || ""} alt={user?.name || ""} className="w-8 h-8 rounded-full" />
              <span className="font-medium">{user?.name}</span>
            </div>
            <Link href="/api/auth/logout">
              <Button variant="outline">Sign Out</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Projects</h1>
            <p className="text-gray-600 mt-2">
              {userData ? `${userData.projectCount} of ${userData.maxProjects} projects used` : "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {userData && (
              <Badge variant={userData.plan === "pro" ? "default" : "secondary"}>
                {userData.plan === "pro" ? "Pro Plan" : "Free Plan"}
              </Badge>
            )}
            {userData?.canCreateProject ? (
              <Link href="/projects/new">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </Link>
            ) : (
              <Link href="/upgrade">
                <Button className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade to Create More
                </Button>
              </Link>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-6">Create your first project to start uploading SCORM files.</p>
              {userData?.canCreateProject ? (
                <Link href="/projects/new">
                  <Button>Create Your First Project</Button>
                </Link>
              ) : (
                <Link href="/upgrade">
                  <Button>Upgrade to Create Projects</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const scorm = project.scormFile
              const url = scorm?.launchUrl || scorm?.publicUrl || scorm?.manifestUrl || ""
              const isProcessing = scorm?.processing
              const options = scorm?.availableLaunchFiles || []
              const selected = scorm?.launchFile || prioritizeLaunch(options.map(f => f.fileName))


              return (
                <Card key={project._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription className="mt-1">{project.description}</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject(project._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {scorm ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Upload className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{scorm.filename}</div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(scorm.fileSize)} • {scorm.totalFiles} files
                              {selected && <span> • Launch: {selected}</span>}
                            </div>
                          </div>
                        </div>

                        {isProcessing && (
                          <p className="text-sm text-blue-600 font-medium">Processing...</p>
                        )}

                        {!isProcessing && options.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Select Launch File</label>
                            <select
                              className="w-full text-sm border rounded p-1"
                              value={selected}
                              onChange={(e) => updateLaunchFile(project._id, e.target.value)}
                            >
                              {options.map((f, i) => (
                                <option key={i} value={f.fileName}>
                                  {f.fileName}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <Link href={url} target="_blank">
                            <Button size="sm" className="flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              Launch
                            </Button>
                          </Link>
                          {scorm.manifestUrl && scorm.manifestUrl !== url && (
                            <Link href={scorm.manifestUrl} target="_blank">
                              <Button size="sm" variant="outline">
                                <FileText className="h-3 w-3" />
                                Manifest
                              </Button>
                            </Link>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(url)
                              toast({
                                title: "URL copied!",
                                description: "The SCORM URL has been copied to your clipboard.",
                              })
                            }}
                          >
                            Copy URL
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Link href={`/projects/${project._id}/upload`}>
                        <Button size="sm" className="w-full">
                          Upload SCORM File
                        </Button>
                      </Link>
                    )}
                    <div className="text-xs text-gray-500 mt-3">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                      {scorm && (
                        <span> • Uploaded {new Date(scorm.uploadedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
