"use client"

import type React from "react"
import { useState, useCallback, useEffect, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@auth0/nextjs-auth0/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, FileText, CheckCircle, Loader2, FileArchive, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface UploadPageProps {
  params: Promise<{
    id: string
  }>
}

interface UploadResult {
  success: boolean
  packageId: string
  packageFolder: string
  manifestUrl: string
  launchUrl: string
  totalFiles: number
  files: { key: string; url: string }[]
}

type UploadStage = "idle" | "uploading" | "extracting" | "processing" | "finalizing" | "complete"

export default function UploadPage({ params }: UploadPageProps) {
  // Unwrap the async params using React.use()
  const resolvedParams = use(params)
  const projectId = resolvedParams.id

  const { user, isLoading: userLoading } = useUser()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle")
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Create a ref for the file input
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/api/auth/login")
    }
  }, [user, userLoading, router])

  const getStageMessage = (stage: UploadStage) => {
    switch (stage) {
      case "uploading":
        return "Uploading SCORM package..."
      case "extracting":
        return "Extracting ZIP file..."
      case "processing":
        return "Processing SCORM files..."
      case "finalizing":
        return "Finalizing upload..."
      case "complete":
        return "Upload completed successfully!"
      default:
        return ""
    }
  }

  const getStageProgress = (stage: UploadStage) => {
    switch (stage) {
      case "uploading":
        return 25
      case "extracting":
        return 50
      case "processing":
        return 75
      case "finalizing":
        return 90
      case "complete":
        return 100
      default:
        return 0
    }
  }

  // Function to trigger file input
  const triggerFileInput = () => {
    console.log("Triggering file input...")
    if (fileInputRef.current) {
      fileInputRef.current.click()
    } else {
      console.error("File input ref is null")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input changed")
    const files = e.target.files
    if (files && files[0]) {
      const selectedFile = files[0]
      console.log("Selected file:", selectedFile.name, selectedFile.type, selectedFile.size)

      if (selectedFile.name.toLowerCase().endsWith(".zip")) {
        setFile(selectedFile)
        setError(null)
        toast({
          title: "File selected",
          description: `Selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`,
        })
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a ZIP file containing your SCORM package.",
          variant: "destructive",
        })
      }
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      console.log("File dropped")
      const files = e.dataTransfer.files
      if (files && files[0]) {
        const selectedFile = files[0]
        console.log("Dropped file:", selectedFile.name, selectedFile.type, selectedFile.size)

        if (selectedFile.name.toLowerCase().endsWith(".zip")) {
          setFile(selectedFile)
          setError(null)
          toast({
            title: "File dropped",
            description: `Selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`,
          })
        } else {
          toast({
            title: "Invalid file type",
            description: "Please select a ZIP file containing your SCORM package.",
            variant: "destructive",
          })
        }
      }
    },
    [toast],
  )

  const handleUpload = async () => {
    if (!file) return

    console.log("Starting upload for file:", file.name)
    setUploading(true)
    setError(null)
    setUploadResult(null)
    setUploadStage("uploading")

    try {
      const formData = new FormData()
      formData.append("scormPackage", file)
      formData.append("projectId", projectId)

      // Stage progression with realistic timing
      const stageProgression = [
        { stage: "uploading" as UploadStage, delay: 500 },
        { stage: "extracting" as UploadStage, delay: 1000 },
        { stage: "processing" as UploadStage, delay: 1500 },
        { stage: "finalizing" as UploadStage, delay: 500 },
      ]

      // Start stage progression
      let currentStageIndex = 0
      const progressStages = () => {
        if (currentStageIndex < stageProgression.length) {
          const { stage, delay } = stageProgression[currentStageIndex]
          setTimeout(() => {
            setUploadStage(stage)
            currentStageIndex++
            progressStages()
          }, delay)
        }
      }
      progressStages()

      console.log("Sending upload request...")
      const response = await fetch("/api/upload-scorm", {
        method: "POST",
        body: formData,
      })

      console.log("Upload response status:", response.status)

      if (response.ok) {
        const result = await response.json()
        console.log("Upload successful:", result)
        setUploadStage("complete")
        setUploadResult(result)
        toast({
          title: "Upload successful!",
          description: `SCORM package extracted with ${result.totalFiles} files.`,
        })

        // Redirect to dashboard after showing results
        setTimeout(() => {
          router.push("/dashboard")
        }, 3000)
      } else {
        const error = await response.json()
        console.error("Upload failed:", error)
        throw new Error(error.error || "Upload failed")
      }
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "Failed to upload file")
      setUploadStage("idle")
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileArchive className="h-6 w-6" />
                Upload SCORM File
              </CardTitle>
              <CardDescription>
                Upload a ZIP file containing your SCORM package. We'll extract and host it for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!file ? (
                <div className="space-y-4">
                  {/* Debug info */}
                  <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                    <strong>Debug:</strong> Project ID: {projectId}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />

                  {/* Main upload area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                      dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                    }`}
                    onClick={triggerFileInput}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Choose SCORM Package</h3>
                      <p className="text-gray-600">Drop your SCORM ZIP file here or click to browse</p>
                      <Button variant="outline" type="button" onClick={(e) => e.stopPropagation()}>
                        Browse Files
                      </Button>
                    </div>
                  </div>

                  {/* Alternative file input */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Or use this file selector:</label>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    {!uploading && (
                      <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                        Remove
                      </Button>
                    )}
                  </div>

                  {uploading && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <span className="text-sm font-medium">{getStageMessage(uploadStage)}</span>
                      </div>

                      {/* Stage indicators */}
                      <div className="flex justify-between text-xs text-gray-500">
                        <span className={uploadStage === "uploading" ? "text-blue-600 font-medium" : ""}>Upload</span>
                        <span className={uploadStage === "extracting" ? "text-blue-600 font-medium" : ""}>Extract</span>
                        <span className={uploadStage === "processing" ? "text-blue-600 font-medium" : ""}>Process</span>
                        <span className={uploadStage === "finalizing" ? "text-blue-600 font-medium" : ""}>
                          Finalize
                        </span>
                      </div>

                      {/* Visual progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${getStageProgress(uploadStage)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800">{error}</p>
                    </div>
                  )}

                  {uploadStage === "complete" ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>Upload completed successfully! Redirecting to dashboard...</span>
                    </div>
                  ) : !uploading ? (
                    <Button onClick={handleUpload} className="w-full">
                      Upload SCORM File
                    </Button>
                  ) : null}
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">SCORM Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• File must be a ZIP archive</li>
                  <li>• Must contain a valid SCORM package</li>
                  <li>• Maximum file size: 100MB</li>
                  <li>• Supported versions: SCORM 1.2 and SCORM 2004</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Upload Results Card */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Upload Successful
                </CardTitle>
                <CardDescription>Your SCORM package has been extracted and uploaded to Cloudflare R2</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Package ID</p>
                    <p className="text-sm text-gray-600 font-mono">{uploadResult.packageId}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Total Files</p>
                    <p className="text-sm text-gray-600">{uploadResult.totalFiles} files extracted</p>
                  </div>
                </div>

                {uploadResult.launchUrl && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Launch URL</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-100 p-2 rounded text-sm break-all">{uploadResult.launchUrl}</code>
                      <Button size="sm" variant="outline" onClick={() => window.open(uploadResult.launchUrl, "_blank")}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {uploadResult.manifestUrl && uploadResult.manifestUrl !== uploadResult.launchUrl && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Manifest URL</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-100 p-2 rounded text-sm break-all">
                        {uploadResult.manifestUrl}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(uploadResult.manifestUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <details className="space-y-2">
                  <summary className="text-sm font-medium cursor-pointer">
                    View All Files ({uploadResult.totalFiles})
                  </summary>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {uploadResult?.files?.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-gray-600 break-all">{file.key}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(file.url, "_blank")}
                          className="h-6 px-2 ml-2 flex-shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </details>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
