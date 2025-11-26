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
  filesizeBytes?: number
  format: string
  itag?: string
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

  useEffect(() => {
    const saved = localStorage.getItem("downloadedFiles")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setDownloadedFiles(
          parsed.map((f: DownloadedFile) => ({
            ...f,
            downloadedAt: new Date(f.downloadedAt),
          })),
        )
      } catch (e) {
        console.error("Failed to parse saved files:", e)
      }
    }
  }, [])

  const saveDownloadedFile = useCallback((file: DownloadedFile) => {
    setDownloadedFiles((prev) => {
      const updated = [file, ...prev]
      localStorage.setItem("downloadedFiles", JSON.stringify(updated))
      return updated
    })
  }, [])

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

      const videoDataFromApi: VideoData = {
        id: info.id,
        title: info.title,
        duration: info.duration || 0,
        uploader: info.uploader || "Unknown",
        viewCount: info.view_count || 0,
        thumbnail: info.thumbnail || "",
        description: info.description || "",
        formats: info.qualityOptions || [],
      }

      setVideoData(videoDataFromApi)
      if (videoDataFromApi.formats.length > 0) {
        setSelectedFormat(videoDataFromApi.formats[0])
      }
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
      speed: "Preparing download...",
      eta: "",
    })

    try {
      // Build download URL
      const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&quality=${selectedFormat.formatId}&format=${selectedFormat.ext}`

      // Create a hidden link and trigger download
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `${videoData.title}.${selectedFormat.ext}`
      document.body.appendChild(link)

      // Simulate progress for UX
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15
        if (progress >= 95) {
          progress = 95
        }
        setDownloadState({
          status: "downloading",
          percent: Math.round(progress),
          speed: "Downloading...",
          eta: "",
        })
      }, 500)

      link.click()
      document.body.removeChild(link)

      // Complete after a short delay
      setTimeout(() => {
        clearInterval(progressInterval)
        setDownloadState({ status: "finished", percent: 100, speed: "", eta: "" })

        // Save to downloaded files
        saveDownloadedFile({
          id: `${Date.now()}`,
          name: `${videoData.title}.${selectedFormat.ext}`,
          size: selectedFormat.filesizeBytes ? selectedFormat.filesizeBytes / (1024 * 1024) : 0,
          downloadedAt: new Date(),
          format: selectedFormat.ext.toUpperCase(),
        })

        setTimeout(() => {
          setDownloadState({ status: "idle", percent: 0, speed: "", eta: "" })
        }, 3000)
      }, 2000)
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

  const handleDeleteFile = (id: string) => {
    setDownloadedFiles((prev) => {
      const updated = prev.filter((file) => file.id !== id)
      localStorage.setItem("downloadedFiles", JSON.stringify(updated))
      return updated
    })
  }

  const handleDownloadFile = (filename: string) => {
    // For browser-downloaded files, we can't re-download them
    // Show a message instead
    alert("This file was downloaded directly to your browser's download folder.")
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
        <p className="text-muted-foreground text-lg">Download videos in various formats with real file sizes</p>
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
