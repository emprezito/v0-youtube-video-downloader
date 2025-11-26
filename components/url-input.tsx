"use client"

import type React from "react"

import { Link, Search, Loader2 } from "lucide-react"

interface UrlInputProps {
  url: string
  setUrl: (url: string) => void
  onFetch: () => void
  isLoading: boolean
}

export function UrlInput({ url, setUrl, onFetch, isLoading }: UrlInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFetch()
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUrl(text)
    } catch (err) {
      console.error("Failed to read clipboard")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Link className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube URL here..."
          className="w-full pl-12 pr-32 py-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
          <button
            type="button"
            onClick={handlePaste}
            className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors"
          >
            Paste
          </button>
          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Fetch
              </>
            )}
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center">Supports YouTube videos, shorts, and playlists</p>
    </form>
  )
}
