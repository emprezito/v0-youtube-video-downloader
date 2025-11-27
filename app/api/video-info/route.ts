import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const videoInfo = await getVideoInfo(url)
    return NextResponse.json(videoInfo)
  } catch (error) {
    console.error("Error fetching video info:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch video info" },
      { status: 500 },
    )
  }
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "Unknown"
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`
  }
  return `${mb.toFixed(1)} MB`
}

function getVideoInfo(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const args = ["--dump-json", "--no-playlist", url]

    const process = spawn("yt-dlp", args)
    let stdout = ""
    let stderr = ""

    process.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    process.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    process.on("close", (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(stdout)

          const allFormats = info.formats || []

          // Find best formats for each quality with their file sizes
          const findBestVideoFormat = (maxHeight: number) => {
            // Look for formats with both video and audio first (progressive)
            const progressive = allFormats.find(
              (f: any) => f.height && f.height <= maxHeight && f.acodec !== "none" && f.vcodec !== "none",
            )
            if (progressive?.filesize) return progressive.filesize

            // Otherwise estimate from separate video + audio streams
            const videoFormat = allFormats.find(
              (f: any) => f.height && f.height <= maxHeight && f.height > maxHeight - 200 && f.vcodec !== "none",
            )
            const audioFormat = allFormats.find((f: any) => f.acodec !== "none" && f.vcodec === "none" && f.abr)

            const videoSize = videoFormat?.filesize || 0
            const audioSize = audioFormat?.filesize || 0
            return videoSize + audioSize
          }

          // Find audio-only format size
          const audioFormat =
            allFormats.find((f: any) => f.acodec !== "none" && f.vcodec === "none" && f.ext === "webm") ||
            allFormats.find((f: any) => f.acodec !== "none" && f.vcodec === "none")

          // Find best overall format
          const bestFormat = allFormats.find((f: any) => f.format_id === info.format_id)

          resolve({
            id: info.id,
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            uploader: info.uploader,
            view_count: info.view_count,
            description: info.description,
            fileSizes: {
              "1080": formatFileSize(findBestVideoFormat(1080)),
              "720": formatFileSize(findBestVideoFormat(720)),
              "480": formatFileSize(findBestVideoFormat(480)),
              "360": formatFileSize(findBestVideoFormat(360)),
              best: formatFileSize(bestFormat?.filesize || findBestVideoFormat(2160)),
              mp3: formatFileSize(audioFormat?.filesize),
            },
            formats: info.formats?.map((f: Record<string, unknown>) => ({
              format_id: f.format_id,
              ext: f.ext,
              resolution: f.resolution || `${f.width}x${f.height}`,
              filesize: f.filesize,
              format_note: f.format_note,
              height: f.height,
              acodec: f.acodec,
              vcodec: f.vcodec,
            })),
          })
        } catch {
          reject(new Error("Failed to parse video info"))
        }
      } else {
        reject(new Error(stderr || "yt-dlp command failed"))
      }
    })

    process.on("error", (error) => {
      reject(new Error(`Failed to run yt-dlp: ${error.message}. Make sure yt-dlp is installed.`))
    })
  })
}
