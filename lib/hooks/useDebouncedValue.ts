import { useEffect, useRef, useState } from "react"

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current)
    tRef.current = setTimeout(() => setDebounced(value), delay)
    return () => {
      if (tRef.current) clearTimeout(tRef.current)
    }
  }, [value, delay])

  return debounced
}