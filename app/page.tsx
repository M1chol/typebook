"use client"

import { useEffect, useState, useMemo } from "react"
import { Book, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import SearchBox from "@/components/typing/SearchBox"
import WordModeSelector from "@/components/typing/WordModeSelector"
import TypingDisplay from "@/components/typing/TypingDisplay"
import StatsBar from "@/components/typing/StatsBar"
import HiddenInput from "@/components/typing/HiddenInput"
import type { SearchResult, WordMode } from "@/lib/types"
import { catalogueUrlToApi } from "@/lib/text"
import { fetchBookText } from "@/lib/services/books"

export default function TypingPracticePage() {
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [bookTitle, setBookTitle] = useState("")
  const [isLoadingText, setIsLoadingText] = useState(false)

  const [wordMode, setWordMode] = useState<WordMode>(50)
  const [fullBookText, setFullBookText] = useState("")
  const [words, setWords] = useState<string[]>([])
  const [pageIndex, setPageIndex] = useState<number>(0)
  const [text, setText] = useState("")

  const [userInput, setUserInput] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [errors, setErrors] = useState(0)

  const currentPageText = useMemo(() => {
    const start = pageIndex * wordMode
    const end = start + wordMode
    return words.slice(start, end).join(" ")
  }, [words, pageIndex, wordMode])

  useEffect(() => {
    if (!fullBookText) {
      setText("")
      return
    }
    setText(currentPageText)
  }, [fullBookText, wordMode, pageIndex])

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (isActive && startTime) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        setTimeElapsed(elapsed)
      }, 10)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, startTime])

  // Auto advance to next chunk when finished
  useEffect(() => {
    if (userInput.length >= currentPageText.length && isActive) {
      const maxPage = Math.floor(words.length / wordMode)
      if (pageIndex < maxPage) {
        setTimeout(() => {
          setPageIndex((prev) => prev + 1)
          setUserInput("")
          setErrors(0)
          setIsActive(true)
        }, 500)
      } else {
        setIsActive(false) // Finished entire book
      }
    }
  }, [userInput])

  const handleBookSelect = async (result: SearchResult) => {
    if (!result.url) return
    try {
      const apiUrl = catalogueUrlToApi(result.url)
      const slug = apiUrl.split("/").filter(Boolean).pop()
      if (!slug) return

      setSelectedBook(slug)
      setIsLoadingText(true)
      setUserInput("")
      setIsActive(false)
      setStartTime(null)
      setTimeElapsed(0)
      setErrors(0)

      try {
        const { title, text } = await fetchBookText(slug)
        setBookTitle(title)
        setFullBookText(text)
        setWords(text.split(/\s+/).filter(Boolean))
        setPageIndex(0)
      } catch (e) {
        console.error("Error fetching book text:", e)
        setFullBookText("Error loading book text. Please try another book.")
      } finally {
        setIsLoadingText(false)
      }
    } catch (error) {
      console.error("Error selecting book:", error)
    }
  }

  const handleActivate = () => {
    if (!text) return
    setIsActive(true)
    setStartTime(Date.now())
    setUserInput("")
    setErrors(0)
  }

  const handleUserInput = (value: string) => {
    if (!isActive && text) {
      setIsActive(true)
      setStartTime(Date.now())
    }
    // prevent typing beyond target text length
    if (value.length > text.length) return

    setUserInput(value)

    let errorCount = 0
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== text[i]) errorCount++
    }
    setErrors(errorCount)
  }

  // const calculateWPM = () => {
  //   if (timeElapsed === 0) return 0
  //   const words = userInput.trim().length
  //     ? userInput.trim().split(/\s+/).length
  //     : 0
  //   return Math.round((words / timeElapsed) * 60)
  // }

  const calculateAccuracy = () => {
    if (userInput.length === 0) return 100
    return Math.round(((userInput.length - errors) / userInput.length) * 100)
  }

  const resetForModeChange = (mode: WordMode) => {
    setWordMode(mode)
    setUserInput("")
    setIsActive(false)
    setErrors(0)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <SearchBox onSelect={handleBookSelect} />

            {selectedBook && bookTitle && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-sm text-muted-foreground">
                    Currently practicing:
                  </div>
                  <div className="text-lg font-medium text-foreground">
                    {bookTitle}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {selectedBook && (
        <div className="border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="max-w-2xl mx-auto">
              <WordModeSelector value={wordMode} onChange={resetForModeChange} />
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
              <TypingDisplay text={text} userInput={userInput} />

              <HiddenInput
                value={userInput}
                enabled={!!text}
                onChange={handleUserInput}
                onActivateIfNeeded={() => {
                  if (!isActive && text) {
                    setIsActive(true)
                    setStartTime(Date.now())
                  }
                }}
              />

              <StatsBar
                timeElapsed={timeElapsed}
                typedChars={userInput.length}
                totalChars={text.length}
                accuracy={calculateAccuracy()}
                wpm={0}
                page={pageIndex}
                pagesTotal={Math.floor(words.length / wordMode)}
              />

              {!isActive && userInput.length > 0 && (
                <div className="flex justify-center mt-8">
                  <Button onClick={handleActivate}>Restart</Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <Book className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground mb-2">
                No book selected
              </p>
              <p className="text-sm text-muted-foreground/60">
                Search for a book above to start practicing
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}