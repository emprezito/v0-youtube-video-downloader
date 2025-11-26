"use client"

import { CheckCircle, Download, Zap, Clock } from "lucide-react"
import type { DownloadState } from "./youtube-downloader"

interface DownloadProgressProps {
  downloadState: DownloadState
}

export function DownloadProgress({ downloadState }: DownloadProgressProps) {
  const isFinished = downloadState.status === "finished"

  return (
    <div
      className={`bg-card border rounded-xl p-6 transition-all ${isFinished ? "border-green-500/50" : "border-border"}`}
    >
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isFinished ? (
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          ) : (
            <div className="p-2 bg-primary/10 rounded-lg">
              <Download className="w-5 h-5 text-primary animate-bounce" />
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{isFinished ? "Download Complete!" : "Downloading..."}</p>
            <p className="text-sm text-muted-foreground">
              {isFinished ? "Your file is ready" : "Please wait while we process your video"}
            </p>
          </div>
        </div>
        <span className="text-2xl font-bold text-primary">{downloadState.percent}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-secondary rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isFinished ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${downloadState.percent}%` }}
        />
      </div>

      {/* Stats */}
      {!isFinished && (
        <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Speed: {downloadState.speed}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>ETA: {downloadState.eta}</span>
          </div>
        </div>
      )}
    </div>
  )
}
