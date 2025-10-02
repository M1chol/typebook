export type SearchResult = {
  type: string
  label: string
  author?: string
  url?: string
  img?: string
}

export type BookMeta = {
  title: string
  slug: string
  txt?: string
  html?: string
  authors?: Array<{ name: string }>
  children?: Array<{
    href: string
    title: string
    slug: string
    full_sort_key?: string
  }>
}

export type TextPointer = {
  slug: string
  txt?: string
  html?: string
  title?: string
  orderKey?: string
}

export type WordMode = 25 | 50 | 100