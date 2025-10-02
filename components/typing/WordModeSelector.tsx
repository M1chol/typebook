"use client"

import { Button } from "@/components/ui/button"
import type { WordMode } from "@/lib/types"

type Props = {
  value: WordMode
  onChange: (mode: WordMode) => void
}

export default function WordModeSelector({ value, onChange }: Props) {
  const modes: WordMode[] = [25, 50, 100]
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-sm text-muted-foreground">Words:</span>
      {modes.map((mode) => (
        <Button
          key={mode}
          variant={value === mode ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(mode)}
          className="min-w-[60px]"
        >
          {mode}
        </Button>
      ))}
    </div>
  )
}