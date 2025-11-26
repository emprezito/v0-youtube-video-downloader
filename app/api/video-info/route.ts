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
          resolve({
            id: info.id,
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            uploader: info.uploader,
            view_count: info.view_count,
            description: info.description,
            formats: info.formats?.map((f: Record<string, unknown>) => ({
              format_id: f.format_id,
              ext: f.ext,
              resolution: f.resolution || `${f.width}x${f.height}`,
              filesize: f.filesize,
              format_note: f.format_note,
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
