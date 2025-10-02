import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const term = searchParams.get("term")
  const max = searchParams.get("max") || "10"

  if (!term) {
    return NextResponse.json({ error: "Missing term parameter" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://wolnelektury.pl/szukaj/hint/?max=${max}&term=${encodeURIComponent(term)}`)

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 500 })
  }
}
