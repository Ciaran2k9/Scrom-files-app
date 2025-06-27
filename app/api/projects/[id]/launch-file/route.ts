import { getSession } from "@auth0/nextjs-auth0"
import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { launchFile } = body

    if (!launchFile) {
      return NextResponse.json({ error: "Missing launchFile" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const result = await db.collection("projects").updateOne(
      {
        _id: new ObjectId(params.id),
        userId: session.user.sub,
      },
      {
        $set: {
          "scormFile.launchFile": launchFile,
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
