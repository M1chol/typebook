import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params

  if (!slug) {
    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://wolnelektury.pl/api/books/${slug}/`)

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Book API error:", error)
    return NextResponse.json({ error: "Failed to fetch book metadata" }, { status: 500 })
  }
}
