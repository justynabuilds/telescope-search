// Page matching for the telescope search. No DOM, so it is unit-tested on its own.

export interface SearchItem {
  label: string
  href: string | null
  description: string
  /** Extra words that should find this page but aren't shown. */
  keywords: string
  target: string | null
}

export interface SearchHit {
  item: SearchItem
  /** Position in the original list. */
  index: number
}

export interface Segment {
  text: string
  match: boolean
}

const MARKS = /[̀-ͯ]/g
const EXTRA: Record<string, string> = { ł: "l", ø: "o", đ: "d", ß: "s", æ: "a", œ: "o" }

/**
 * Lower case without accents, one character for one character, so a match found in the folded text
 * maps straight back onto the original ("zrodla" finds "Źródła", "lodz" finds "Łódź").
 */
export function fold(text: string) {
  let out = ""
  for (const ch of text) {
    const low = ch.toLowerCase()
    const plain = EXTRA[low] ?? low.normalize("NFD").replace(MARKS, "")
    // keep the string the same length as the original (some characters lower-case or fold to two)
    out += plain.length === ch.length ? plain : plain.length > ch.length ? plain.slice(0, ch.length) : plain.padEnd(ch.length, " ")
  }
  return out
}

/**
 * Pages whose label, description or keywords contain the query, best first:
 * label starts with it, then a word in the label starts with it, then the label contains it, then the rest.
 * Ties keep the original order.
 */
export function search(items: SearchItem[], query: string, limit = 5): SearchHit[] {
  const q = fold(query.trim())
  if (!q) return []
  const rank = (it: SearchItem) => {
    const label = fold(it.label)
    if (label.startsWith(q)) return 0
    if (label.includes(" " + q)) return 1
    if (label.includes(q)) return 2
    if (fold(it.description).includes(q) || fold(it.keywords).includes(q)) return 3
    return -1
  }
  return items
    .map((item, index) => ({ item, index, r: rank(item) }))
    .filter((h) => h.r >= 0)
    .sort((a, b) => a.r - b.r || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(({ item, index }) => ({ item, index }))
}

/** Splits text into plain and matching runs (the first match only), ready to render without innerHTML. */
export function highlight(text: string, query: string): Segment[] {
  const q = fold(query.trim())
  const at = q ? fold(text).indexOf(q) : -1
  if (at < 0) return [{ text, match: false }]
  const parts: Segment[] = [
    { text: text.slice(0, at), match: false },
    { text: text.slice(at, at + q.length), match: true },
    { text: text.slice(at + q.length), match: false },
  ]
  return parts.filter((p) => p.text)
}

/** "{n} page|{n} pages|none" → the right one for n. */
export function countText(pattern: string, n: number) {
  const [one = "{n} page", many = "{n} pages", none = "none"] = pattern.split("|")
  const t = n === 0 ? none : n === 1 ? one : many
  return t.replace("{n}", String(n))
}
