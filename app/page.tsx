"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2, Book } from "lucide-react"

type SearchResult = {
  type: string
  label: string
  author?: string
  url?: string
  img?: string
}

type BookMeta = {
  title: string
  slug: string
  txt?: string
  html?: string
  authors?: Array<{ name: string }>
  children?: Array<{ href: string; title: string; slug: string; full_sort_key?: string }>
}

type TextPointer = {
  slug: string
  txt?: string
  html?: string
  title?: string
  orderKey?: string
}

type WordMode = 25 | 50 | 100

export default function TypingPractice() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [bookTitle, setBookTitle] = useState<string>("")
  const [isLoadingText, setIsLoadingText] = useState(false)
  const [wordMode, setWordMode] = useState<WordMode>(50)
  const [fullBookText, setFullBookText] = useState("")
  const [textOffset, setTextOffset] = useState(0)

  const [text, setText] = useState("")
  const [userInput, setUserInput] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [errors, setErrors] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`/api/search?term=${encodeURIComponent(searchQuery)}&max=10`)
        const results = await response.json()
        setSearchResults(results.filter((r: SearchResult) => r.type === "book"))
      } catch (error) {
        console.error("Search error:", error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const catalogueUrlToApi = (url: string) => {
    const match = url.match(/\/katalog\/lektura\/([^/]+)\/?/)
    const slug = match?.[1]
    if (!slug) throw new Error("Invalid catalogue URL")
    return `https://wolnelektury.pl/api/books/${slug}/`
  }

  useEffect(() => {
    if (fullBookText) {
      const words = fullBookText.split(/\s+/).filter((w) => w.length > 0)
      const limitedWords = words.slice(textOffset, textOffset + wordMode)
      setText(limitedWords.join(" "))
    }
  }, [fullBookText, wordMode, textOffset])

  useEffect(() => {
    if (text && !isActive) {
      inputRef.current?.focus()
    }
  }, [text, isActive])

  useEffect(() => {
    if (userInput.length >= text.length && text.length > 0 && isActive) {
      setIsActive(false)

      const words = fullBookText.split(/\s+/).filter((w) => w.length > 0)
      if (textOffset + wordMode < words.length) {
        setTimeout(() => {
          setTextOffset((prev) => prev + wordMode)
          setUserInput("")
          setStartTime(null)
          setTimeElapsed(0)
          setErrors(0)
          setIsActive(true)
          setStartTime(Date.now())
        }, 500)
      }
    }
  }, [userInput, text, isActive, fullBookText, textOffset, wordMode])

  const fetchBookText = async (slug: string) => {
    setIsLoadingText(true)
    try {
      const metaResponse = await fetch(`/api/book/${slug}`)
      const meta: BookMeta = await metaResponse.json()

      setBookTitle(meta.title)

      const processText = (rawText: string): string => {
        const paragraphs = rawText
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
          .filter((p) => !p.match(/^[A-Z\s]+$/) && p.length > 20)
          .slice(0, 5)
          .join(" ")

        return paragraphs.replace(/\s+/g, " ").trim()
      }

      if (meta.txt) {
        const textResponse = await fetch(`/api/text?url=${encodeURIComponent(meta.txt)}`)
        const fullText = await textResponse.text()
        setFullBookText(processText(fullText))
        return
      }

      if (meta.children && meta.children.length > 0) {
        const childrenMeta = await Promise.all(
          meta.children.map(async (child) => {
            const childSlug = child.href.split("/").filter(Boolean).pop()
            const childResponse = await fetch(`/api/book/${childSlug}`)
            return childResponse.json()
          }),
        )

        const textPointers: TextPointer[] = childrenMeta
          .map((child: BookMeta) => {
            if (child.txt || child.html) {
              return {
                slug: child.slug,
                txt: child.txt,
                html: child.html,
                title: child.title,
              }
            }
            return null
          })
          .filter(Boolean) as TextPointer[]

        if (textPointers.length > 0 && textPointers[0].txt) {
          const textResponse = await fetch(`/api/text?url=${encodeURIComponent(textPointers[0].txt)}`)
          const fullText = await textResponse.text()
          setFullBookText(processText(fullText))
          return
        }
      }

      if (meta.html) {
        const htmlResponse = await fetch(`/api/text?url=${encodeURIComponent(meta.html)}`)
        const htmlText = await htmlResponse.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(htmlText, "text/html")
        const paragraphs = Array.from(doc.querySelectorAll("p"))
          .map((p) => p.textContent?.trim())
          .filter((p) => p && p.length > 20)
          .slice(0, 5)
          .join(" ")
        setFullBookText(paragraphs.replace(/\s+/g, " ").trim())
      }
    } catch (error) {
      console.error("Error fetching book text:", error)
      setFullBookText("Error loading book text. Please try another book.")
    } finally {
      setIsLoadingText(false)
    }
  }

  const handleBookSelect = async (result: SearchResult) => {
    if (!result.url) return

    try {
      const apiUrl = catalogueUrlToApi(result.url)
      const slug = apiUrl.split("/").filter(Boolean).pop()
      if (slug) {
        setSelectedBook(slug)
        setSearchQuery("")
        setSearchResults([])
        await fetchBookText(slug)
        setUserInput("")
        setIsActive(false)
        setStartTime(null)
        setTimeElapsed(0)
        setErrors(0)
        setTextOffset(0)
      }
    } catch (error) {
      console.error("Error selecting book:", error)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isActive && startTime) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        setTimeElapsed(elapsed)
      }, 10)
    }
    return () => clearInterval(interval)
  }, [isActive, startTime])

  const handleActivate = () => {
    if (!text) return
    setIsActive(true)
    setStartTime(Date.now())
    setUserInput("")
    setErrors(0)
    inputRef.current?.focus()
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isActive && text) {
      setIsActive(true)
      setStartTime(Date.now())
    }

    const value = e.target.value
    if (value.length > text.length) return

    setUserInput(value)

    let errorCount = 0
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== text[i]) {
        errorCount++
      }
    }
    setErrors(errorCount)
  }

  const calculateWPM = () => {
    if (timeElapsed === 0) return 0
    const words = userInput.trim().split(/\s+/).length
    return Math.round((words / timeElapsed) * 60)
  }

  const calculateAccuracy = () => {
    if (userInput.length === 0) return 100
    return Math.round(((userInput.length - errors) / userInput.length) * 100)
  }

  const renderText = () => {
    return text.split("").map((char, index) => {
      let className = "text-muted-foreground"

      if (index < userInput.length) {
        if (userInput[index] === char) {
          className = "text-foreground"
        } else {
          className = "text-red-500 bg-red-500/20"
        }
      } else if (index === userInput.length) {
        className = "text-foreground border-l-2 border-primary"
      }

      return (
        <span key={index} className={className}>
          {char}
        </span>
      )
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for a book to practice typing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-12 text-base"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-2 w-full max-w-2xl bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleBookSelect(result)}
                    className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-start gap-3 border-b border-border last:border-b-0"
                  >
                    {result.img ? (
                      <img src={result.img || "/placeholder.svg"} alt="" className="w-12 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                        <Book className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{result.label}</div>
                      {result.author && <div className="text-sm text-muted-foreground truncate">{result.author}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedBook && bookTitle && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-sm text-muted-foreground">Currently practicing:</div>
                  <div className="text-lg font-medium text-foreground">{bookTitle}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {selectedBook && (
        <div className="border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="max-w-2xl mx-auto flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Words:</span>
              {([25, 50, 100] as WordMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={wordMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setWordMode(mode)
                    setUserInput("")
                    setIsActive(false)
                    setStartTime(null)
                    setTimeElapsed(0)
                    setErrors(0)
                    setTextOffset(0)
                  }}
                  className="min-w-[60px]"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          {isLoadingText ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : text ? (
            <>
              <div className="relative mb-8 p-8 rounded-lg bg-card border border-border h-[280px] flex items-center justify-center">
                <div className="text-2xl leading-relaxed font-mono max-w-3xl">
                  <p className="text-balance">{renderText()}</p>
                </div>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInput}
                className="sr-only"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                autoFocus
              />

              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-mono">
                    {String(Math.floor(timeElapsed / 60)).padStart(2, "0")}:
                    {String(Math.floor(timeElapsed % 60)).padStart(2, "0")}:
                    {String(Math.floor((timeElapsed % 1) * 100)).padStart(2, "0")}
                  </span>
                </div>
                <span>/</span>
                <div>
                  <span className="font-mono">{userInput.length}</span>
                  <span className="text-muted-foreground/60"> / {text.length}</span>
                </div>
                <span>/</span>
                <div>
                  <span className="font-mono">{calculateAccuracy()}%</span>
                </div>
                <span>/</span>
                <div>
                  <span className="font-mono">{calculateWPM()}</span>
                  <span className="text-muted-foreground/60"> wpm</span>
                </div>
              </div>

              {!isActive && userInput.length > 0 && (
                <div className="flex justify-center mt-8">
                  <Button onClick={handleActivate}>Restart</Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <Book className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground mb-2">No book selected</p>
              <p className="text-sm text-muted-foreground/60">Search for a book above to start practicing</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
