"use client"

import { Clock, Eye, User } from "lucide-react"
import type { VideoData } from "./youtube-downloader"

interface VideoInfoProps {
  videoData: VideoData
}

export function VideoInfo({ videoData }: VideoInfoProps) {
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 p-6">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0 w-full md:w-72">
          <div className="aspect-video bg-secondary rounded-lg overflow-hidden">
            <img
              src={videoData.thumbnail || "/placeholder.svg"}
              alt={videoData.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-background/90 text-foreground text-sm font-mono rounded">
            {formatDuration(videoData.duration)}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground mb-3 line-clamp-2">{videoData.title}</h2>

          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="text-sm">{videoData.uploader}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span className="text-sm">{formatViewCount(videoData.viewCount)} views</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{formatDuration(videoData.duration)}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-3">{videoData.description}</p>
        </div>
      </div>
    </div>
  )
}
