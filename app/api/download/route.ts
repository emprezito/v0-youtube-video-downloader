import { type NextRequest, NextResponse } from "next/server"
import ytdl from "@distube/ytdl-core"

// Store download progress
const downloadProgress = new Map<string, { progress: number; speed: string; eta: string; status: string }>()

export async function POST(request: NextRequest) {
  try {
    const { url, format, quality } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!ytdl.validateURL(url)) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 })
    }

    const downloadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Initialize progress
    downloadProgress.set(downloadId, {
      progress: 0,
      speed: "Starting...",
      eta: "Calculating...",
      status: "starting",
    })

    return NextResponse.json({ downloadId, message: "Download ready" })
  } catch (error) {
    console.error("Error starting download:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start download" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const downloadId = request.nextUrl.searchParams.get("id")
  const url = request.nextUrl.searchParams.get("url")
  const quality = request.nextUrl.searchParams.get("quality")
  const format = request.nextUrl.searchParams.get("format")

  // If URL is provided, stream the download
  if (url) {
    try {
      if (!ytdl.validateURL(url)) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 })
      }

      const info = await ytdl.getInfo(url)
      const title = info.videoDetails.title.replace(/[^\w\s-]/g, "").trim()

      let ytdlOptions: ytdl.downloadOptions = {}

      if (format === "mp3") {
        ytdlOptions = { quality: "highestaudio", filter: "audioonly" }
      } else {
        switch (quality) {
          case "1080":
            ytdlOptions = { quality: "highestvideo", filter: "videoandaudio" }
            break
          case "720":
            ytdlOptions = {
              filter: (f) => f.qualityLabel === "720p" && f.hasAudio && f.hasVideo,
            }
            break
          case "480":
            ytdlOptions = {
              filter: (f) => f.qualityLabel === "480p" && f.hasAudio && f.hasVideo,
            }
            break
          case "360":
            ytdlOptions = {
              filter: (f) => f.qualityLabel === "360p" && f.hasAudio && f.hasVideo,
            }
            break
          default:
            ytdlOptions = { quality: "highest", filter: "videoandaudio" }
        }
      }

      // Fallback to any format with audio+video if specific quality not found
      const availableFormats = info.formats.filter((f) => f.hasAudio && f.hasVideo)
      if (availableFormats.length === 0 && format !== "mp3") {
        ytdlOptions = { quality: "highest" }
      }

      const stream = ytdl(url, ytdlOptions)
      const ext = format === "mp3" ? "mp3" : "mp4"
      const filename = `${title}.${ext}`

      // Convert Node stream to web stream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(chunk))
          stream.on("end", () => controller.close())
          stream.on("error", (err) => controller.error(err))
        },
      })

      return new NextResponse(webStream, {
        headers: {
          "Content-Type": format === "mp3" ? "audio/mpeg" : "video/mp4",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      })
    } catch (error) {
      console.error("Download error:", error)
      return NextResponse.json({ error: error instanceof Error ? error.message : "Download failed" }, { status: 500 })
    }
  }

  // Otherwise return progress
  if (!downloadId) {
    return NextResponse.json({ error: "Download ID or URL is required" }, { status: 400 })
  }

  const progress = downloadProgress.get(downloadId)

  if (!progress) {
    return NextResponse.json({ progress: 100, status: "complete" })
  }

  return NextResponse.json(progress)
}
