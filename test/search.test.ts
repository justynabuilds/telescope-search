import { test } from "node:test"
import assert from "node:assert/strict"
import { search, highlight, fold, countText, type SearchItem } from "../src/core/search.ts"

const item = (label: string, description = "", keywords = ""): SearchItem => ({ label, href: "/" + label.toLowerCase(), description, keywords, target: null })
const PAGES = [
  item("Work", "Selected projects"),
  item("Pricing", "Three fixed packages", "cost price rates"),
  item("Journal", "Notes on design"),
  item("Why I build in Framer", "Journal · 6 min read"),
  item("Contact", "Start a project"),
]
const labels = (q: string, limit?: number) => search(PAGES, q, limit).map((h) => h.item.label)

test("empty or blank query finds nothing", () => {
  assert.deepEqual(labels(""), [])
  assert.deepEqual(labels("   "), [])
})

test("matches label, description and keywords, ignoring case", () => {
  assert.deepEqual(labels("PRIC"), ["Pricing"])
  assert.deepEqual(labels("packages"), ["Pricing"])
  assert.deepEqual(labels("cost"), ["Pricing"])
})

test("best first: label start, then a word in the label, then inside the label, then description", () => {
  assert.deepEqual(labels("jo"), ["Journal", "Why I build in Framer"])
  assert.deepEqual(labels("pro"), ["Work", "Contact"])
  assert.deepEqual(labels("fr"), ["Why I build in Framer"])
})

test("keeps the original index and respects the limit", () => {
  const hits = search(PAGES, "o", 2)
  assert.equal(hits.length, 2)
  assert.equal(hits[0].index, PAGES.indexOf(hits[0].item))
})

test("accents and Polish letters fold, so plain typing finds them", () => {
  const pl = [item("Źródła", "Skąd biorę zdjęcia"), item("Łódź", "Biuro")]
  assert.deepEqual(search(pl, "zrodla").map((h) => h.item.label), ["Źródła"])
  assert.deepEqual(search(pl, "lodz").map((h) => h.item.label), ["Łódź"])
  assert.equal(fold("Źródła").length, "Źródła".length)
})

test("highlight marks the first match on the original text", () => {
  assert.deepEqual(highlight("Journal", "jo"), [{ text: "Jo", match: true }, { text: "urnal", match: false }])
  assert.deepEqual(highlight("Łódź", "odz"), [{ text: "Ł", match: false }, { text: "ódź", match: true }])
  assert.deepEqual(highlight("Work", "x"), [{ text: "Work", match: false }])
  assert.deepEqual(highlight("Work", ""), [{ text: "Work", match: false }])
})

test("count text picks one, many or none", () => {
  assert.equal(countText("{n} page|{n} pages|none", 1), "1 page")
  assert.equal(countText("{n} page|{n} pages|none", 4), "4 pages")
  assert.equal(countText("{n} page|{n} pages|none", 0), "none")
  assert.equal(countText("{n} strona|{n} stron|brak", 5), "5 stron")
})
