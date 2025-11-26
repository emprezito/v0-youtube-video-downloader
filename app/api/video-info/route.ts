import { type NextRequest, NextResponse } from "next/server"
import ytdl from "@distube/ytdl-core"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 })
    }

    const info = await ytdl.getInfo(url)
    const videoDetails = info.videoDetails

    // Extract formats with real file sizes
    const formats = info.formats
      .filter((f) => f.hasVideo || f.hasAudio)
      .map((f) => ({
        formatId: f.itag.toString(),
        ext: f.container || "mp4",
        resolution: f.hasVideo ? f.qualityLabel || "unknown" : "audio",
        filesize: f.contentLength ? Number.parseInt(f.contentLength) : null,
        hasVideo: f.hasVideo,
        hasAudio: f.hasAudio,
        mimeType: f.mimeType,
        quality: f.quality,
        audioBitrate: f.audioBitrate,
      }))

    // Group and find best formats for each quality
    const qualityOptions = getQualityOptions(formats, Number.parseInt(videoDetails.lengthSeconds))

    return NextResponse.json({
      id: videoDetails.videoId,
      title: videoDetails.title,
      thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url || "",
      duration: Number.parseInt(videoDetails.lengthSeconds),
      uploader: videoDetails.author.name,
      view_count: Number.parseInt(videoDetails.viewCount),
      description: videoDetails.description || "",
      qualityOptions,
      rawFormats: formats,
    })
  } catch (error) {
    console.error("Error fetching video info:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch video info" },
      { status: 500 },
    )
  }
}

interface RawFormat {
  formatId: string
  ext: string
  resolution: string
  filesize: number | null
  hasVideo: boolean
  hasAudio: boolean
  quality: string
  audioBitrate?: number
}

function getQualityOptions(formats: RawFormat[], durationSeconds: number) {
  // Find video formats with their sizes
  const videoFormats = formats.filter((f) => f.hasVideo)
  const audioFormats = formats.filter((f) => f.hasAudio && !f.hasVideo)

  // Get best audio format size for combined downloads
  const bestAudio = audioFormats.reduce(
    (best, f) => {
      if (!best || (f.audioBitrate && (!best.audioBitrate || f.audioBitrate > best.audioBitrate))) {
        return f
      }
      return best
    },
    null as RawFormat | null,
  )
  const audioSize = bestAudio?.filesize || 0

  // Define quality tiers
  const qualities = [
    { id: "1080", label: "1080p", resolution: "1080p", minHeight: 1080 },
    { id: "720", label: "720p", resolution: "720p", minHeight: 720 },
    { id: "480", label: "480p", resolution: "480p", minHeight: 480 },
    { id: "360", label: "360p", resolution: "360p", minHeight: 360 },
  ]

  const qualityOptions = []

  for (const quality of qualities) {
    // Find matching video format
    const matchingFormats = videoFormats.filter((f) => f.resolution?.includes(quality.label))

    if (matchingFormats.length > 0) {
      // Get format with largest size (usually best quality)
      const bestFormat = matchingFormats.reduce((best, f) => {
        if (!best || (f.filesize && (!best.filesize || f.filesize > best.filesize))) {
          return f
        }
        return best
      }, matchingFormats[0])

      // Calculate total size (video + audio for combined formats)
      const videoSize = bestFormat.filesize || estimateSize(durationSeconds, quality.id)
      const totalSize = bestFormat.hasAudio ? videoSize : videoSize + audioSize

      qualityOptions.push({
        formatId: quality.id,
        ext: "mp4",
        resolution: quality.resolution,
        filesize: formatBytes(totalSize),
        filesizeBytes: totalSize,
        format: `${quality.resolution} HD (mp4)`,
        itag: bestFormat.formatId,
      })
    }
  }

  // Add best quality option
  const bestVideo = videoFormats.reduce(
    (best, f) => {
      if (!best || (f.filesize && (!best.filesize || f.filesize > best.filesize))) {
        return f
      }
      return best
    },
    null as RawFormat | null,
  )

  if (bestVideo) {
    const bestSize = bestVideo.filesize || estimateSize(durationSeconds, "best")
    qualityOptions.push({
      formatId: "best",
      ext: "mp4",
      resolution: "best",
      filesize: formatBytes(bestSize + audioSize),
      filesizeBytes: bestSize + audioSize,
      format: "Best quality (video+audio)",
      itag: bestVideo.formatId,
    })
  }

  // Add audio only option
  if (bestAudio) {
    const mp3Size = audioSize || estimateSize(durationSeconds, "audio")
    qualityOptions.push({
      formatId: "mp3",
      ext: "mp3",
      resolution: "audio",
      filesize: formatBytes(mp3Size),
      filesizeBytes: mp3Size,
      format: "Audio only (MP3)",
      itag: bestAudio.formatId,
    })
  }

  return qualityOptions
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "Unknown"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function estimateSize(durationSeconds: number, quality: string): number {
  // Estimate based on typical bitrates (in bytes per second)
  const bitrates: Record<string, number> = {
    "1080": 500000, // ~4 Mbps
    "720": 250000, // ~2 Mbps
    "480": 125000, // ~1 Mbps
    "360": 75000, // ~0.6 Mbps
    best: 625000, // ~5 Mbps
    audio: 16000, // ~128 kbps
  }
  return durationSeconds * (bitrates[quality] || 250000)
}
