// pages/api/process-scorm.ts

import { type NextRequest, NextResponse } from "next/server"
import { uploadToR2, getR2Url } from "@/lib/r2-client"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import JSZip from "jszip"
import { randomUUID } from "crypto"

// Helper to strip filename from URL, leaving folder URL only
function getBaseUrl(url: string) {
  if (!url) return url
  return url.replace(/\/[^\/]*$/, "")
}

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 })

    const rawKey = `scorm-raw/${projectId}.zip`
    const { db } = await connectToDatabase()

    const response = await fetch(getR2Url(rawKey))
    if (!response.ok) throw new Error("Failed to fetch raw zip from R2")

    const arrayBuffer = await response.arrayBuffer()
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(arrayBuffer)

    const packageId = randomUUID()
    const packageFolder = `scorm-packages/${packageId}`
    const uploadedFiles: { key: string; url: string }[] = []
    let manifestFile = ""
    let manifestContent = ""

    for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
      if (zipEntry.dir) continue

      const fileContent = await zipEntry.async("uint8array")
      const fileKey = `${packageFolder}/${relativePath}`
      const contentType = getContentType(relativePath)
      await uploadToR2(fileKey, fileContent, contentType)
      uploadedFiles.push({ key: fileKey, url: getR2Url(fileKey) })

      if (relativePath.toLowerCase() === "imsmanifest.xml") {
        manifestFile = getR2Url(fileKey)
        manifestContent = await zipEntry.async("text")
      }
    }

    // Find all .html and .htm files (no root-level restriction)
    const htmlFiles = uploadedFiles.filter((f) => {
      const key = f.key.toLowerCase()
      return key.endsWith(".html") || key.endsWith(".htm")
    })

    const availableLaunchFiles = htmlFiles.map((f) => ({
      fileName: f.key.split("/").pop() || "unknown.html",
      url: f.url,
    }))

    let launchUrl = ""
    let launchFile = ""
    const preferredOrder = ["story.html", "index.html", "main.html"]

    for (const name of preferredOrder) {
      const match = availableLaunchFiles.find((f) => f.fileName.toLowerCase() === name)
      if (match) {
        launchFile = match.fileName
        launchUrl = match.url
        break
      }
    }

    if (!launchUrl && availableLaunchFiles.length > 0) {
      launchFile = availableLaunchFiles[0].fileName
      launchUrl = availableLaunchFiles[0].url
    }

    const project = await db.collection("projects").findOne({ _id: new ObjectId(projectId) })

    const scormFileData = {
      filename: project?.scormFile?.filename || "SCORM Package",
      packageId,
      packageFolder,
      publicUrl: getBaseUrl(launchUrl) || manifestFile,  // <-- HERE: folder URL only
      manifestUrl: manifestFile,
      launchUrl,
      launchFile,
      availableLaunchFiles,
      totalFiles: uploadedFiles.length,
      uploadedAt: new Date(),
      fileSize: project?.scormFile?.fileSize || 0,
      processing: false,
    }

    await db.collection("projects").updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          scormFile: scormFileData,
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Processing error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}

function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase()
  const types: { [key: string]: string } = {
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    xml: "application/xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    pdf: "application/pdf",
    zip: "application/zip",
  }
  return types[ext || ""] || "application/octet-stream"
}
