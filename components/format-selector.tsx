"use client"

import { Check, Video, Music, Sparkles } from "lucide-react"
import type { Format } from "./youtube-downloader"

interface FormatSelectorProps {
  formats: Format[]
  selectedFormat: Format | null
  onSelectFormat: (format: Format) => void
}

export function FormatSelector({ formats, selectedFormat, onSelectFormat }: FormatSelectorProps) {
  const getIcon = (format: Format) => {
    if (format.resolution === "audio") {
      return <Music className="w-4 h-4" />
    }
    if (format.resolution === "best") {
      return <Sparkles className="w-4 h-4" />
    }
    return <Video className="w-4 h-4" />
  }

  const getLabel = (resolution: string) => {
    switch (resolution) {
      case "1080p":
        return "Full HD"
      case "720p":
        return "HD"
      case "480p":
        return "SD"
      case "360p":
        return "Low"
      case "audio":
        return "Audio"
      case "best":
        return "Best"
      default:
        return resolution
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Select Format</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {formats.map((format) => {
          const isSelected = selectedFormat?.formatId === format.formatId

          return (
            <button
              key={format.formatId}
              onClick={() => onSelectFormat(format)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-secondary/50"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <div className={`${isSelected ? "text-primary" : "text-muted-foreground"}`}>{getIcon(format)}</div>
                <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {getLabel(format.resolution)}
                </span>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p className="uppercase">{format.ext}</p>
                <p>{format.filesize}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
