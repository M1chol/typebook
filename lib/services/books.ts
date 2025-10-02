import type { BookMeta, TextPointer } from "../types"
import { processPlainText, processHtmlToText } from "../text"

export async function fetchBookText(slug: string): Promise<{
  title: string
  text: string
}> {
  const metaResponse = await fetch(`/api/book/${slug}`)
  const meta: BookMeta = await metaResponse.json()

  const title = meta.title

  // If direct text link exists
  if (meta.txt) {
    const textResponse = await fetch(
      `/api/text?url=${encodeURIComponent(meta.txt)}`
    )
    const fullText = await textResponse.text()
    return { title, text: processPlainText(fullText) }
  }

  // If children exist, try first child with text
  if (meta.children && meta.children.length > 0) {
    const childrenMeta = await Promise.all(
      meta.children.map(async (child) => {
        const childSlug = child.href.split("/").filter(Boolean).pop()
        const childResponse = await fetch(`/api/book/${childSlug}`)
        return childResponse.json()
      })
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
      const textResponse = await fetch(
        `/api/text?url=${encodeURIComponent(textPointers[0].txt)}`
      )
      const fullText = await textResponse.text()
      return { title, text: processPlainText(fullText) }
    }
  }

  // Fallback to HTML
  if (meta.html) {
    const htmlResponse = await fetch(
      `/api/text?url=${encodeURIComponent(meta.html)}`
    )
    const htmlText = await htmlResponse.text()
    return { title, text: processHtmlToText(htmlText) }
  }

  throw new Error("No text source found for this book")
}