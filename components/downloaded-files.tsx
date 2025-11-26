"use client"

import { FileVideo, Trash2, FolderOpen, Download } from "lucide-react"
import type { DownloadedFile } from "./youtube-downloader"

interface DownloadedFilesProps {
  files: DownloadedFile[]
  onDelete: (id: string) => void
  onDownload: (filename: string) => void
}

export function DownloadedFiles({ files, onDelete, onDownload }: DownloadedFilesProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Downloaded Files</h3>
            <p className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""} downloaded
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group"
          >
            <div className="p-3 bg-secondary rounded-lg">
              <FileVideo className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{file.name}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{file.size.toFixed(1)} MB</span>
                <span>•</span>
                <span className="uppercase">{file.format}</span>
                <span>•</span>
                <span>{formatDate(file.downloadedAt)}</span>
              </div>
            </div>

            <button
              onClick={() => onDownload(file.name)}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Download file"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDelete(file.id)}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Delete file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
