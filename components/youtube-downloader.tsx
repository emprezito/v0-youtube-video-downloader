"use client"

import { useState, useEffect, useCallback } from "react"
import { UrlInput } from "./url-input"
import { VideoInfo } from "./video-info"
import { FormatSelector } from "./format-selector"
import { DownloadProgress } from "./download-progress"
import { DownloadedFiles } from "./downloaded-files"
import { Download, Youtube } from "lucide-react"

export interface VideoData {
  id: string
  title: string
  duration: number
  uploader: string
  viewCount: number
  thumbnail: string
  description: string
  formats: Format[]
}

export interface Format {
  formatId: string
  ext: string
  resolution: string
  filesize: string
  format: string
}

export interface DownloadedFile {
  id: string
  name: string
  size: number
  downloadedAt: Date
  format: string
}

export interface DownloadState {
  status: "idle" | "fetching" | "downloading" | "finished" | "error"
  percent: number
  speed: string
  eta: string
  error?: string
  downloadId?: string
}

export function YouTubeDownloader() {
  const [url, setUrl] = useState("")
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<Format | null>(null)
  const [downloadState, setDownloadState] = useState<DownloadState>({
    status: "idle",
    percent: 0,
    speed: "",
    eta: "",
  })
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedFile[]>([])

  const fetchDownloadedFiles = useCallback(async () => {
    try {
      const response = await fetch("/api/files")
      if (response.ok) {
        const data = await response.json()
        setDownloadedFiles(
          data.files.map((file: { name: string; size: number; createdAt: string }) => ({
            id: file.name,
            name: file.name,
            size: file.size / (1024 * 1024), // Convert to MB
            downloadedAt: new Date(file.createdAt),
            format: file.name.split(".").pop()?.toUpperCase() || "MP4",
          })),
        )
      }
    } catch (error) {
      console.error("Failed to fetch files:", error)
    }
  }, [])

  useEffect(() => {
    fetchDownloadedFiles()
  }, [fetchDownloadedFiles])

  const handleFetchInfo = async () => {
    if (!url.trim()) return

    setDownloadState({ ...downloadState, status: "fetching" })
    setVideoData(null)

    try {
      const response = await fetch("/api/video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch video info")
      }

      const info = await response.json()

      // Transform API response to VideoData format
      const videoDataFromApi: VideoData = {
        id: info.id,
        title: info.title,
        duration: info.duration || 0,
        uploader: info.uploader || "Unknown",
        viewCount: info.view_count || 0,
        thumbnail: info.thumbnail || "",
        description: info.description || "",
        formats: [
          { formatId: "1080", ext: "mp4", resolution: "1080p", filesize: "~250MB", format: "1080p HD (mp4)" },
          { formatId: "720", ext: "mp4", resolution: "720p", filesize: "~120MB", format: "720p HD (mp4)" },
          { formatId: "480", ext: "mp4", resolution: "480p", filesize: "~65MB", format: "480p (mp4)" },
          { formatId: "360", ext: "mp4", resolution: "360p", filesize: "~35MB", format: "360p (mp4)" },
          {
            formatId: "best",
            ext: "mp4",
            resolution: "best",
            filesize: "~300MB",
            format: "Best quality (video+audio)",
          },
          { formatId: "mp3", ext: "mp3", resolution: "audio", filesize: "~10MB", format: "Audio only (MP3)" },
        ],
      }

      setVideoData(videoDataFromApi)
      setSelectedFormat(videoDataFromApi.formats[0])
      setDownloadState({ status: "idle", percent: 0, speed: "", eta: "" })
    } catch (error) {
      setDownloadState({
        status: "error",
        percent: 0,
        speed: "",
        eta: "",
        error: error instanceof Error ? error.message : "Failed to fetch video info",
      })
    }
  }

  const handleDownload = async () => {
    if (!videoData || !selectedFormat) return

    setDownloadState({
      status: "downloading",
      percent: 0,
      speed: "Starting...",
      eta: "Calculating...",
    })

    try {
      // Start the download
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          format: selectedFormat.ext,
          quality: selectedFormat.formatId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to start download")
      }

      const { downloadId } = await response.json()

      // Poll for progress
      const pollProgress = async () => {
        try {
          const progressResponse = await fetch(`/api/download?id=${downloadId}`)
          if (!progressResponse.ok) return

          const progress = await progressResponse.json()

          if (progress.status === "complete") {
            setDownloadState({ status: "finished", percent: 100, speed: "", eta: "" })
            // Refresh the file list
            fetchDownloadedFiles()
            setTimeout(() => {
              setDownloadState({ status: "idle", percent: 0, speed: "", eta: "" })
            }, 3000)
            return
          }

          if (progress.status === "error") {
            throw new Error("Download failed")
          }

          setDownloadState({
            status: "downloading",
            percent: Math.round(progress.progress),
            speed: progress.speed || "Calculating...",
            eta: progress.eta || "Calculating...",
            downloadId,
          })

          // Continue polling
          setTimeout(pollProgress, 500)
        } catch (error) {
          console.error("Error polling progress:", error)
        }
      }

      pollProgress()
    } catch (error) {
      setDownloadState({
        status: "error",
        percent: 0,
        speed: "",
        eta: "",
        error: error instanceof Error ? error.message : "Download failed",
      })
    }
  }

  const handleDeleteFile = async (id: string) => {
    try {
      const response = await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: id }),
      })

      if (response.ok) {
        setDownloadedFiles((prev) => prev.filter((file) => file.id !== id))
      }
    } catch (error) {
      console.error("Failed to delete file:", error)
    }
  }

  const handleDownloadFile = (filename: string) => {
    window.open(`/api/download-file?filename=${encodeURIComponent(filename)}`, "_blank")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <header className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Youtube className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">YouTube Downloader</h1>
        </div>
        <p className="text-muted-foreground text-lg">Download videos and playlists in various formats</p>
      </header>

      {/* URL Input */}
      <UrlInput url={url} setUrl={setUrl} onFetch={handleFetchInfo} isLoading={downloadState.status === "fetching"} />

      {/* Video Info & Format Selection */}
      {videoData && (
        <div className="mt-8 space-y-6">
          <VideoInfo videoData={videoData} />

          <FormatSelector
            formats={videoData.formats}
            selectedFormat={selectedFormat}
            onSelectFormat={setSelectedFormat}
          />

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloadState.status === "downloading" || downloadState.status === "fetching"}
            className="w-full py-4 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            {downloadState.status === "downloading" ? "Downloading..." : "Download Video"}
          </button>

          {/* Download Progress */}
          {(downloadState.status === "downloading" || downloadState.status === "finished") && (
            <DownloadProgress downloadState={downloadState} />
          )}
        </div>
      )}

      {/* Error State */}
      {downloadState.status === "error" && downloadState.error && (
        <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
          <p className="text-destructive font-medium">{downloadState.error}</p>
        </div>
      )}

      {/* Downloaded Files */}
      {downloadedFiles.length > 0 && (
        <DownloadedFiles files={downloadedFiles} onDelete={handleDeleteFile} onDownload={handleDownloadFile} />
      )}
    </div>
  )
}
