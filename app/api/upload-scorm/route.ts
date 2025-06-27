// pages/api/upload-scorm.ts

import { type NextRequest, NextResponse } from "next/server"
import { uploadToR2 } from "@/lib/r2-client"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("scormPackage") as File
    const projectId = formData.get("projectId") as string

    if (!file || !projectId) {
      return NextResponse.json({ error: "Missing file or project ID" }, { status: 400 })
    }

    const rawKey = `scorm-raw/${projectId}.zip`
    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadToR2(rawKey, buffer, "application/zip")

    const { db } = await connectToDatabase()
    await db.collection("projects").updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          scormFile: {
            filename: file.name,
            fileSize: file.size,
            uploadedAt: new Date(),
            processing: true,
          },
          updatedAt: new Date(),
        }
      }
    )

    // Trigger background processor
 fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/process-scorm`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ projectId }),
}).catch(err => console.error("Error triggering processor:", err))


    return NextResponse.json({ status: "processing" }, { status: 202 })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
