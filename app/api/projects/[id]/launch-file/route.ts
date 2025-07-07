import { getSession } from "@auth0/nextjs-auth0"
import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { launchFile } = await request.json()

    if (!launchFile) {
      return NextResponse.json({ error: "Missing launchFile" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Load project to get availableLaunchFiles array
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(params.id),
      userId: session.user.sub,
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found or not authorized" }, { status: 404 })
    }

    const availableLaunchFiles = project.scormFile?.availableLaunchFiles || []

    // Find matching URL for the requested launchFile
    const matchedFile = availableLaunchFiles.find(
      (f: { fileName: string; url: string }) => f.fileName === launchFile
    )

    // If no match found, you might want to reject or fallback to existing launchUrl
    const launchUrl = matchedFile ? matchedFile.url : project.scormFile?.launchUrl || ""

    // Update launchFile and launchUrl only
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(params.id), userId: session.user.sub },
      {
        $set: {
          "scormFile.launchFile": launchFile,
          "scormFile.launchUrl": launchUrl,
          updatedAt: new Date(),
        },
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Project not found or not authorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating launch file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
