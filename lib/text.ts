export const catalogueUrlToApi = (url: string) => {
  const match = url.match(/\/katalog\/lektura\/([^/]+)\/?/)
  const slug = match?.[1]
  if (!slug) throw new Error("Invalid catalogue URL")
  return `https://wolnelektury.pl/api/books/${slug}/`
}

export const normalizeWhitespace = (s: string) =>
  s.replace(/\s+/g, " ").trim()

export const processPlainText = (rawText: string): string => {
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .filter((p) => !p.match(/^[A-Z\s]+$/) && p.length > 20)
    .slice(0, 5)
    .join(" ")

  return normalizeWhitespace(paragraphs)
}

export const processHtmlToText = (html: string): string => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const paragraphs = Array.from(doc.querySelectorAll("p"))
    .map((p) => p.textContent?.trim())
    .filter((p) => p && p.length > 20)
    .slice(0, 5)
    .join(" ")
  return normalizeWhitespace(paragraphs)
}