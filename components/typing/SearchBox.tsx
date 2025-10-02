"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Search, Loader2, Book } from "lucide-react"
import type { SearchResult } from "@/lib/types"
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue"

type Props = {
  onSelect: (result: SearchResult) => void
}

export default function SearchBox({ onSelect }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounced = useDebouncedValue(query, 300)

  useEffect(() => {
    let active = true

    async function run() {
      if (debounced.length < 2) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const resp = await fetch(
          `/api/search?term=${encodeURIComponent(debounced)}&max=10`
        )
        const data: SearchResult[] = await resp.json()
        if (!active) return
        setResults(data.filter((r) => r.type === "book"))
      } catch (e) {
        if (active) setResults([])
        console.error("Search error:", e)
      } finally {
        if (active) setLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [debounced])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search for a book to practice typing..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-4 h-12 text-base"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
      )}

      {results.length > 0 && (
        <div className="absolute z-10 mt-2 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelect(result)
                setQuery("")
                setResults([])
              }}
              className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-start gap-3 border-b border-border last:border-b-0"
            >
              {result.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.img || "/placeholder.svg"}
                  alt=""
                  className="w-12 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                  <Book className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {result.label}
                </div>
                {result.author && (
                  <div className="text-sm text-muted-foreground truncate">
                    {result.author}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}