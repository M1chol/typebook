"use client"

type Props = {
  timeElapsed: number
  typedChars: number
  totalChars: number
  accuracy: number
  wpm: number
  page: number
  pagesTotal: number
}

export default function StatsBar({
  timeElapsed,
  typedChars,
  totalChars,
  accuracy,
  wpm,
  page,
  pagesTotal
}: Props) {
  return (
    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
      <div>
        <span className="font-mono">{page}</span>
        <span className="text-muted-foreground/60"> / {pagesTotal}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono">
          {String(Math.floor(timeElapsed / 60)).padStart(2, "0")}:
          {String(Math.floor(timeElapsed % 60)).padStart(2, "0")}:
          {String(Math.floor((timeElapsed % 1) * 100)).padStart(2, "0")}
        </span>
      </div>
      <span>/</span>
      <div>
        <span className="font-mono">{typedChars}</span>
        <span className="text-muted-foreground/60"> / {totalChars}</span>
      </div>
      <span>/</span>
      <div>
        <span className="font-mono">{accuracy}%</span>
      </div>
      <span>/</span>
      <div>
        <span className="font-mono">{wpm}</span>
        <span className="text-muted-foreground/60"> wpm</span>
      </div>
    </div>
  )
}