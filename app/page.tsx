"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link"; // Import Link
import { Book, Loader2, Home } from "lucide-react"; // Import Home icon
import { Button } from "@/components/ui/button";
import SearchBox from "@/components/typing/SearchBox";
import WordModeSelector from "@/components/typing/WordModeSelector";
import TypingDisplay from "@/components/typing/TypingDisplay";
import StatsBar from "@/components/typing/StatsBar";
import HiddenInput from "@/components/typing/HiddenInput";
import type { SearchResult, WordMode } from "@/lib/types";
import { catalogueUrlToApi } from "@/lib/text";
import { fetchBookText } from "@/lib/services/books";
import { ModeToggle } from "@/components/ui/theme-toggle";
import { applyCharacterSwaps } from "@/lib/utils";

type TypingProgress = {
  bookTitle: string;
  coverPhotoUrl?: string; // Added coverPhotoUrl
  pageIndex: number;
  wordMode: WordMode;
};

const LOCAL_STORAGE_KEY = "typing_progress";

export default function TypingPracticePage() {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [bookCoverUrl, setBookCoverUrl] = useState<string | undefined>(undefined); // New state for current book's cover
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [startedBooks, setStartedBooks] = useState<Record<string, TypingProgress>>({});

  const [wordMode, setWordMode] = useState<WordMode>(50);
  const [fullBookText, setFullBookText] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [text, setText] = useState("");

  const [userInput, setUserInput] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [errors, setErrors] = useState(0);

  const currentPageText = useMemo(() => {
    const start = pageIndex * wordMode;
    const end = start + wordMode;
    return words.slice(start, end).join(" ");
  }, [words, pageIndex, wordMode]);

  const saveProgress = useCallback(
    (bookSlug: string, title: string, coverPhotoUrl: string | undefined, page: number, mode: WordMode) => {
      if (typeof window !== "undefined") {
        const allProgress = JSON.parse(
          localStorage.getItem(LOCAL_STORAGE_KEY) || "{}"
        );
        allProgress[bookSlug] = { bookTitle: title, coverPhotoUrl: coverPhotoUrl, pageIndex: page, wordMode: mode };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allProgress));
        setStartedBooks(allProgress); // Update the state immediately
      }
    },
    [setStartedBooks] // Added setStartedBooks to dependency array
  );

  const loadProgress = useCallback((bookSlug: string): TypingProgress | null => {
    if (typeof window !== "undefined") {
      const allProgress = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_KEY) || "{}"
      );
      return allProgress[bookSlug] || null;
    }
    return null;
  }, []);

  const getAllProgress = useCallback((): Record<string, TypingProgress> => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
    }
    return {};
  }, []);

  // Load all started books on component mount
  useEffect(() => {
    setStartedBooks(getAllProgress());
  }, [getAllProgress]);

  // Load progress on initial book selection
  useEffect(() => {
    if (selectedBook) {
      const savedProgress = loadProgress(selectedBook);
      if (savedProgress) {
        setPageIndex(savedProgress.pageIndex);
        setWordMode(savedProgress.wordMode);
        // Also set bookCoverUrl if loading a previously started book
        setBookCoverUrl(savedProgress.coverPhotoUrl);
      }
    }
  }, [selectedBook, loadProgress]);

  useEffect(() => {
    if (!fullBookText) {
      setText("");
      return;
    }
    setText(currentPageText);
    if (selectedBook && bookTitle) { // Ensure bookTitle is available when saving
      // Use bookCoverUrl from state
      saveProgress(selectedBook, bookTitle, bookCoverUrl, pageIndex, wordMode);
    }
  }, [fullBookText, wordMode, pageIndex, selectedBook, currentPageText, saveProgress, bookTitle, bookCoverUrl]); // Removed startedBooks, added bookCoverUrl

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && startTime) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setTimeElapsed(elapsed);
      }, 10);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, startTime]);

  // Auto advance to next chunk when finished
  useEffect(() => {
    if (userInput.length >= currentPageText.length && isActive) {
      const maxPage = Math.floor(words.length / wordMode);
      if (pageIndex < maxPage) {
        setTimeout(() => {
          setPageIndex((prev) => prev + 1);
          setUserInput("");
          setErrors(0);
          setIsActive(true);
          setStartTime(Date.now()); // Reset startTime for the new page
          setTimeElapsed(0); // Reset timeElapsed for the new page
        }, 500);
      } else {
        setIsActive(false); // Finished entire book
      }
    }
  }, [userInput, currentPageText, isActive, pageIndex, words, wordMode]); // Added dependencies

  const handleBookSelect = async (result: SearchResult) => {
    if (!result.url) return;
    try {
      let slug: string | undefined;
      if (result.url.startsWith('/book/')) {
        slug = result.url.split('/').filter(Boolean).pop();
      } else {
        const apiUrl = catalogueUrlToApi(result.url);
        slug = apiUrl.split('/').filter(Boolean).pop();
      }
      if (!slug) return;

      setSelectedBook(slug);
      setBookCoverUrl(result.img); // Set bookCoverUrl here
      setIsLoadingText(true);
      setUserInput("");
      setIsActive(false);
      setStartTime(null);
      setTimeElapsed(0);
      setErrors(0);

      try {
        const { title, text } = await fetchBookText(slug);
        setBookTitle(title);
        setFullBookText(text);
        setWords(text.split(/\s+/).filter(Boolean));
        // Check for saved progress after fetching book text
        const savedProgress = loadProgress(slug);
        if (savedProgress) {
          setPageIndex(savedProgress.pageIndex);
          setWordMode(savedProgress.wordMode);
          setBookCoverUrl(savedProgress.coverPhotoUrl); // Also set bookCoverUrl if loading saved progress
        } else {
          setPageIndex(0);
          setWordMode(50); // Default if no progress
        }
        // Save initial progress with cover photo URL if available from result
        // Use result.img directly as bookCoverUrl might not be updated yet by setBookCoverUrl
        saveProgress(slug, title, result.img, pageIndex, wordMode);
      } catch (e) {
        console.error("Error fetching book text:", e);
        setFullBookText("Error loading book text. Please try another book.");
      } finally {
        setIsLoadingText(false);
      }
    } catch (error) {
      console.error("Error selecting book:", error);
    }
  };

  const handleActivate = () => {
    if (!text) return;
    setIsActive(true);
    setStartTime(Date.now());
    setUserInput("");
    setErrors(0);
  };

  const handleUserInput = (value: string) => {
    // Only start timer if not active AND there's actual input
    if (!isActive && text && value.length > 0) {
      setIsActive(true);
      setStartTime(Date.now());
    }
    // prevent typing beyond target text length
    if (value.length > text.length) return;

    // We'll use the raw 'value' for comparison, but 'processedValue' for display
    const processedValueForDisplay = applyCharacterSwaps(value);
    setUserInput(processedValueForDisplay);

    let errorCount = 0;
    for (let i = 0; i < value.length; i++) { // Iterate over raw input length for comparison
      const textChar = text[i];
      const rawInputChar = value[i]; // Use raw input for comparison

      // Lenient comparison for dashes and smart quotes
      if (
        (textChar === '—' && rawInputChar === '-') || // Em dash vs hyphen
        (textChar === '–' && rawInputChar === '-') || // En dash vs hyphen
        (textChar === '“' && rawInputChar === '"') || // Left double quote vs straight double quote
        (textChar === '”' && rawInputChar === '"') || // Right double quote vs straight double quote
        (textChar === '‘' && rawInputChar === "'") || // Left single quote vs straight single quote
        (textChar === '’' && rawInputChar === "'")    // Right single quote vs straight single quote
      ) {
        // This is a match, do nothing, don't increment errorCount
      } else if (rawInputChar !== textChar) { // Otherwise, compare raw input with textChar
        errorCount++;
      }
    }
    setErrors(errorCount);
  };

  const calculateAccuracy = () => {
    if (userInput.length === 0) return 100;
    return Math.round(((userInput.length - errors) / userInput.length) * 100);
  };

  const calculateWPM = () => {
    if (timeElapsed === 0) return 0
    const typedWords = userInput.trim().split(/\s+/).filter(Boolean).length;
    return Math.round((typedWords / timeElapsed) * 60);
  };

  const resetForModeChange = (mode: WordMode) => {
    setWordMode(mode);
    setUserInput("");
    setIsActive(false);
    setErrors(0);
    if (selectedBook && bookTitle) { // Ensure bookTitle is available when saving
      // Use bookCoverUrl from state
      saveProgress(selectedBook, bookTitle, bookCoverUrl, pageIndex, mode);
    }
  };

  const resetTypingSession = () => {
    setSelectedBook(null);
    setBookTitle("");
    setBookCoverUrl(undefined);
    setIsLoadingText(false);
    setWordMode(50);
    setFullBookText("");
    setWords([]);
    setPageIndex(0);
    setText("");
    setUserInput("");
    setIsActive(false);
    setStartTime(null);
    setTimeElapsed(0);
    setErrors(0);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={resetTypingSession}>
              <Home className="h-[1.2rem] w-[1.2rem]" />
            </Button>
            <SearchBox onSelect={handleBookSelect} />
            <ModeToggle />
          </div>

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
              <TypingDisplay key={pageIndex} text={text} userInput={userInput} />

              <HiddenInput
                value={userInput}
                enabled={!!text}
                onChange={handleUserInput}
                onActivateIfNeeded={() => {
                  if (!isActive && text && userInput.length === 0) { // Only start if no input yet
                    setIsActive(true);
                    setStartTime(Date.now());
                  }
                }}
              />

              <StatsBar
                timeElapsed={timeElapsed}
                typedChars={userInput.length}
                totalChars={text.length}
                accuracy={calculateAccuracy()}
                wpm={calculateWPM()} // Call calculateWPM here
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
            Object.keys(startedBooks).length > 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                <h2 className="text-2xl font-bold mb-4">Continue Reading</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(startedBooks).map(([slug, progress]) => (
                    <Button
                      key={slug}
                      variant="outline"
                      className="flex flex-col items-center justify-center p-4 h-auto text-center border-border rounded-lg shadow-md hover:shadow-lg transition-shadow"
                      onClick={() => handleBookSelect({ title: progress.bookTitle, url: `/book/${slug}`, img: progress.coverPhotoUrl })}
                    >
                      {progress.coverPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={progress.coverPhotoUrl}
                          alt={progress.bookTitle}
                          className="w-24 h-32 object-cover rounded mb-2"
                        />
                      ) : (
                        <div className="w-24 h-32 bg-muted rounded flex items-center justify-center mb-2">
                          <Book className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-lg font-medium">{progress.bookTitle}</span>
                      <span className="text-sm text-muted-foreground">
                        Page: {progress.pageIndex + 1} | Mode: {progress.wordMode} words
                      </span>
                    </Button>
                  ))}
                </div>

              </div>
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
            )
          )}
        </div>
      </main>
    </div>
  );
}