import { getSession } from "@auth0/nextjs-auth0"
import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { deleteFolderFromR2 } from "@/lib/r2-client"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { db } = await connectToDatabase()

    // Find project first to get SCORM paths
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(params.id),
      userId: session.user.sub,
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Delete project from DB
    const result = await db.collection("projects").deleteOne({
      _id: new ObjectId(params.id),
      userId: session.user.sub,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Project not deleted" }, { status: 500 })
    }

    // === DELETE FILES FROM R2 ===
    const scormFile = project.scormFile
    if (scormFile?.packageFolder) {
      await deleteFolderFromR2(scormFile.packageFolder)
    }

    // Delete raw ZIP
    const rawKey = `scorm-raw/${params.id}.zip`
    await deleteFolderFromR2(rawKey) // will safely skip if not found

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
