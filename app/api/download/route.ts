import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"

// Store download progress for each download
const downloadProgress = new Map<string, { progress: number; speed: string; eta: string; status: string }>()

export async function POST(request: NextRequest) {
  try {
    const { url, format, quality } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const downloadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const downloadsDir = path.join(process.cwd(), "downloads")

    // Create downloads directory if it doesn't exist
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true })
    }

    // Start download in background
    startDownload(downloadId, url, format, quality, downloadsDir)

    return NextResponse.json({ downloadId, message: "Download started" })
  } catch (error) {
    console.error("Error starting download:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start download" },
      { status: 500 },
    )
  }
}

function startDownload(downloadId: string, url: string, format: string, quality: string, downloadsDir: string) {
  const args: string[] = ["--newline", "--progress", "-o", path.join(downloadsDir, "%(title)s.%(ext)s")]

  // Add format-specific arguments
  if (format === "mp3") {
    args.push("-x", "--audio-format", "mp3", "--audio-quality", "0")
  } else {
    // Video format based on quality
    switch (quality) {
      case "1080":
        args.push("-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]")
        break
      case "720":
        args.push("-f", "bestvideo[height<=720]+bestaudio/best[height<=720]")
        break
      case "480":
        args.push("-f", "bestvideo[height<=480]+bestaudio/best[height<=480]")
        break
      case "360":
        args.push("-f", "bestvideo[height<=360]+bestaudio/best[height<=360]")
        break
      default:
        args.push("-f", "bestvideo+bestaudio/best")
    }
    args.push("--merge-output-format", "mp4")
  }

  args.push(url)

  downloadProgress.set(downloadId, { progress: 0, speed: "", eta: "", status: "starting" })

  const process = spawn("yt-dlp", args)

  process.stdout.on("data", (data) => {
    const output = data.toString()
    const progressMatch = output.match(/(\d+\.?\d*)%/)
    const speedMatch = output.match(/at\s+([\d.]+\s*\w+\/s)/)
    const etaMatch = output.match(/ETA\s+([\d:]+)/)

    if (progressMatch) {
      downloadProgress.set(downloadId, {
        progress: Number.parseFloat(progressMatch[1]),
        speed: speedMatch ? speedMatch[1] : "",
        eta: etaMatch ? etaMatch[1] : "",
        status: "downloading",
      })
    }
  })

  process.stderr.on("data", (data) => {
    console.error("yt-dlp stderr:", data.toString())
  })

  process.on("close", (code) => {
    if (code === 0) {
      downloadProgress.set(downloadId, { progress: 100, speed: "", eta: "", status: "complete" })
    } else {
      downloadProgress.set(downloadId, { progress: 0, speed: "", eta: "", status: "error" })
    }

    // Clean up progress after 5 minutes
    setTimeout(
      () => {
        downloadProgress.delete(downloadId)
      },
      5 * 60 * 1000,
    )
  })

  process.on("error", (error) => {
    console.error("Failed to start yt-dlp:", error)
    downloadProgress.set(downloadId, { progress: 0, speed: "", eta: "", status: "error" })
  })
}

export async function GET(request: NextRequest) {
  const downloadId = request.nextUrl.searchParams.get("id")

  if (!downloadId) {
    return NextResponse.json({ error: "Download ID is required" }, { status: 400 })
  }

  const progress = downloadProgress.get(downloadId)

  if (!progress) {
    return NextResponse.json({ error: "Download not found" }, { status: 404 })
  }

  return NextResponse.json(progress)
}
