import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

export async function GET() {
  try {
    const downloadsDir = path.join(process.cwd(), "downloads")

    if (!fs.existsSync(downloadsDir)) {
      return NextResponse.json({ files: [] })
    }

    const files = fs.readdirSync(downloadsDir).map((filename) => {
      const filePath = path.join(downloadsDir, filename)
      const stats = fs.statSync(filePath)
      return {
        name: filename,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
      }
    })

    // Sort by creation date, newest first
    files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ files })
  } catch (error) {
    console.error("Error listing files:", error)
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { filename } = await request.json()

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    const downloadsDir = path.join(process.cwd(), "downloads")
    const filePath = path.join(downloadsDir, filename)

    // Security check: ensure the file is within downloads directory
    if (!filePath.startsWith(downloadsDir)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return NextResponse.json({ message: "File deleted" })
    } else {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
  }
}
