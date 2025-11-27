import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"

// Store download progress and filename for each download
const downloadProgress = new Map<
  string,
  {
    progress: number
    speed: string
    eta: string
    status: string
    filename?: string
  }
>()

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
  const outputTemplate = path.join(downloadsDir, "%(title)s.%(ext)s")
  const args: string[] = [
    "--newline",
    "--progress",
    "--no-playlist",
    "-o",
    outputTemplate,
    "--print",
    "after_move:filepath", // Print final filepath after download
  ]

  // Add format-specific arguments
  if (format === "mp3") {
    args.push("-x", "--audio-format", "mp3", "--audio-quality", "0")
  } else {
    // Using 'b' (best) with height filter gets combined video+audio streams
    // Falls back to merging if no combined stream available
    switch (quality) {
      case "1080":
        args.push("-f", "bv*[height<=1080]+ba/b[height<=1080]/b")
        break
      case "720":
        args.push("-f", "bv*[height<=720]+ba/b[height<=720]/b")
        break
      case "480":
        args.push("-f", "bv*[height<=480]+ba/b[height<=480]/b")
        break
      case "360":
        args.push("-f", "bv*[height<=360]+ba/b[height<=360]/b")
        break
      default:
        // Best quality with video and audio
        args.push("-f", "bv*+ba/b")
    }
    args.push("--merge-output-format", "mp4")
    // Embed metadata
    args.push("--embed-thumbnail", "--add-metadata")
  }

  args.push(url)

  downloadProgress.set(downloadId, { progress: 0, speed: "", eta: "", status: "starting" })

  const process = spawn("yt-dlp", args)
  let finalFilepath = ""

  process.stdout.on("data", (data) => {
    const output = data.toString()

    if (output.includes("/downloads/") || output.includes("\\downloads\\")) {
      finalFilepath = output.trim()
    }

    const progressMatch = output.match(/(\d+\.?\d*)%/)
    const speedMatch = output.match(/at\s+([\d.]+\s*\w+\/s)/)
    const etaMatch = output.match(/ETA\s+([\d:]+)/)

    if (progressMatch) {
      downloadProgress.set(downloadId, {
        progress: Number.parseFloat(progressMatch[1]),
        speed: speedMatch ? speedMatch[1] : "",
        eta: etaMatch ? etaMatch[1] : "",
        status: "downloading",
        filename: finalFilepath ? path.basename(finalFilepath) : undefined,
      })
    }
  })

  process.stderr.on("data", (data) => {
    const output = data.toString()
    console.error("yt-dlp stderr:", output)

    // Check for ffmpeg merging message
    if (output.includes("Merging formats")) {
      downloadProgress.set(downloadId, {
        ...downloadProgress.get(downloadId)!,
        status: "merging",
        speed: "Merging video and audio...",
        eta: "",
      })
    }
  })

  process.on("close", (code) => {
    if (code === 0) {
      let filename = finalFilepath ? path.basename(finalFilepath) : undefined

      // If we didn't capture the filepath, try to find the most recent file
      if (!filename) {
        try {
          const files = fs.readdirSync(downloadsDir)
          const sortedFiles = files
            .map((f) => ({ name: f, time: fs.statSync(path.join(downloadsDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time)
          if (sortedFiles.length > 0) {
            filename = sortedFiles[0].name
          }
        } catch (e) {
          console.error("Error finding downloaded file:", e)
        }
      }

      downloadProgress.set(downloadId, {
        progress: 100,
        speed: "",
        eta: "",
        status: "complete",
        filename,
      })
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
