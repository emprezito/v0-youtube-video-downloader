import { type NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"

export async function GET(request: NextRequest) {
  try {
    const filename = request.nextUrl.searchParams.get("filename")

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    const downloadsDir = path.join(process.cwd(), "downloads")
    const filePath = path.join(downloadsDir, filename)

    // Security check: ensure the file is within downloads directory
    if (!filePath.startsWith(downloadsDir)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    const stats = fs.statSync(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Type": "application/octet-stream",
        "Content-Length": stats.size.toString(),
      },
    })
  } catch (error) {
    console.error("Error downloading file:", error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
