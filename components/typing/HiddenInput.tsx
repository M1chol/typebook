"use client"

import { useEffect, useRef } from "react"

type Props = {
  value: string
  enabled: boolean
  onChange: (v: string) => void
  onActivateIfNeeded?: () => void
}

export default function HiddenInput({
  value,
  enabled,
  onChange,
  onActivateIfNeeded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (enabled) inputRef.current?.focus()
  }, [enabled])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => {
        if (onActivateIfNeeded) onActivateIfNeeded()
        onChange(e.target.value)
      }}
      className="sr-only"
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      autoFocus
    />
  )
}